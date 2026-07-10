// src/services/LedgerService.ts
// Handles ledger entries and financial calculations
// Ledger is auto-generated from invoices and payments

import supabase from '../lib/supabase';
import { LedgerEntry, TransactionType } from '../types/database';
import CustomerService from './CustomerService';

export class LedgerService {
  /**
   * Get ledger entries for a customer
   */
  static async getCustomerLedger(customerId: string, limit: number = 100): Promise<LedgerEntry[]> {
    try {
      const { data, error } = await supabase
        .from('ledger_entries')
        .select('*')
        .eq('customer_id', customerId)
        .order('transaction_date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching customer ledger:', error);
      throw error;
    }
  }

  /**
   * Get running balance up to a specific date
   */
  static async getBalanceAsOfDate(customerId: string, upToDate: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('ledger_entries')
        .select('running_balance')
        .eq('customer_id', customerId)
        .lte('transaction_date', upToDate)
        .order('transaction_date', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      return data?.running_balance || 0;
    } catch (error) {
      console.error('Error fetching balance as of date:', error);
      throw error;
    }
  }

  /**
   * Add ledger entry when invoice is created (debit)
   * @internal - Called automatically by InvoiceService
   */
  static async addInvoiceEntry(
    customerId: string,
    invoiceId: string,
    invoiceNumber: string,
    amount: number,
    invoiceDate: string
  ): Promise<LedgerEntry> {
    try {
      // Get current running balance
      const currentBalance = await CustomerService.getCustomerBalance(customerId);
      const newBalance = currentBalance + amount; // Customer owes more

      const { data, error } = await supabase
        .from('ledger_entries')
        .insert([
          {
            customer_id: customerId,
            transaction_type: TransactionType.Invoice,
            reference_id: invoiceId,
            transaction_date: invoiceDate,
            description: `Invoice ${invoiceNumber}`,
            debit_amount: amount,
            running_balance: newBalance,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to create ledger entry');

      // Update customer balance snapshot
      await CustomerService.updateCustomerBalance(customerId, newBalance);

      return data as LedgerEntry;
    } catch (error) {
      console.error('Error adding invoice entry:', error);
      throw error;
    }
  }

  /**
   * Add ledger entry when payment is received (credit)
   * @internal - Called automatically by PaymentService
   */
  static async addPaymentEntry(
    customerId: string,
    paymentId: string,
    amount: number,
    paymentDate: string,
    referenceNumber?: string
  ): Promise<LedgerEntry> {
    try {
      // Get current running balance
      const currentBalance = await CustomerService.getCustomerBalance(customerId);
      const newBalance = currentBalance - amount; // Customer owes less

      const { data, error } = await supabase
        .from('ledger_entries')
        .insert([
          {
            customer_id: customerId,
            transaction_type: TransactionType.Payment,
            reference_id: paymentId,
            transaction_date: paymentDate,
            description: `Payment received${referenceNumber ? ` - ${referenceNumber}` : ''}`,
            credit_amount: amount,
            running_balance: newBalance,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to create ledger entry');

      // Update customer balance snapshot
      await CustomerService.updateCustomerBalance(customerId, newBalance);

      return data as LedgerEntry;
    } catch (error) {
      console.error('Error adding payment entry:', error);
      throw error;
    }
  }

  /**
   * Add manual adjustment entry (admin only)
   */
  static async addAdjustmentEntry(
    customerId: string,
    amount: number,
    description: string,
    adjustmentDate: string
  ): Promise<LedgerEntry> {
    try {
      const currentBalance = await CustomerService.getCustomerBalance(customerId);
      const newBalance = amount > 0 ? currentBalance + amount : currentBalance - Math.abs(amount);

      const { data, error } = await supabase
        .from('ledger_entries')
        .insert([
          {
            customer_id: customerId,
            transaction_type: TransactionType.ManualAdjustment,
            transaction_date: adjustmentDate,
            description,
            debit_amount: amount > 0 ? amount : undefined,
            credit_amount: amount < 0 ? Math.abs(amount) : undefined,
            running_balance: newBalance,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to create adjustment entry');

      // Update customer balance snapshot
      await CustomerService.updateCustomerBalance(customerId, newBalance);

      return data as LedgerEntry;
    } catch (error) {
      console.error('Error adding adjustment entry:', error);
      throw error;
    }
  }

  /**
   * Calculate outstanding amount for a customer
   * Outstanding = Sum of all unpaid invoices
   */
  static async calculateOutstandingAmount(customerId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('balance_due')
        .eq('customer_id', customerId)
        .in('status', ['Draft', 'Confirmed', 'Partially Paid', 'Overdue']);

      if (error) throw error;

      const outstanding = (data || []).reduce(
        (sum, invoice) => sum + (invoice.balance_due || 0),
        0
      );

      return outstanding;
    } catch (error) {
      console.error('Error calculating outstanding amount:', error);
      throw error;
    }
  }

  /**
   * Get aging analysis for a customer (how long invoices have been outstanding)
   */
  static async getAgingAnalysis(
    customerId: string
  ): Promise<{
    current: number;
    days30: number;
    days60: number;
    days90: number;
    days120plus: number;
  }> {
    try {
      const today = new Date();
      const { data, error } = await supabase
        .from('invoices')
        .select('balance_due, invoice_date')
        .eq('customer_id', customerId)
        .in('status', ['Confirmed', 'Partially Paid', 'Overdue']);

      if (error) throw error;

      const analysis = {
        current: 0,
        days30: 0,
        days60: 0,
        days90: 0,
        days120plus: 0,
      };

      (data || []).forEach((invoice) => {
        if (!invoice.balance_due) return;

        const invoiceDate = new Date(invoice.invoice_date);
        const daysDifference = Math.floor(
          (today.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysDifference <= 30) {
          analysis.current += invoice.balance_due;
        } else if (daysDifference <= 60) {
          analysis.days30 += invoice.balance_due;
        } else if (daysDifference <= 90) {
          analysis.days60 += invoice.balance_due;
        } else if (daysDifference <= 120) {
          analysis.days90 += invoice.balance_due;
        } else {
          analysis.days120plus += invoice.balance_due;
        }
      });

      return analysis;
    } catch (error) {
      console.error('Error calculating aging analysis:', error);
      throw error;
    }
  }
}

export default LedgerService;
