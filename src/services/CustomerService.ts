// src/services/CustomerService.ts
// Handles all customer-related database operations

import supabase from '../lib/supabase';
import {
  Customer,
  CreateCustomerInput,
  CustomerStatus,
  CustomerWithBalance,
  CustomerBalanceSnapshot,
} from '../types/database';

export class CustomerService {
  /**
   * Get all active customers
   */
  static async getCustomers(status?: CustomerStatus): Promise<Customer[]> {
    try {
      let query = supabase.from('customers').select('*').is('deleted_at', null);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query.order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching customers:', error);
      throw error;
    }
  }

  /**
   * Get single customer by ID
   */
  static async getCustomerById(customerId: string): Promise<Customer | null> {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      return data || null;
    } catch (error) {
      console.error('Error fetching customer:', error);
      throw error;
    }
  }

  /**
   * Get customer with current balance
   */
  static async getCustomerWithBalance(
    customerId: string
  ): Promise<CustomerWithBalance | null> {
    try {
      const [customerData, balanceData] = await Promise.all([
        supabase
          .from('customers')
          .select('*')
          .eq('id', customerId)
          .is('deleted_at', null)
          .single(),
        supabase
          .from('customer_balance_snapshot')
          .select('balance')
          .eq('customer_id', customerId)
          .single(),
      ]);

      if (customerData.error) throw customerData.error;
      if (!customerData.data) return null;

      const customer = customerData.data as Customer;
      const balance = (balanceData.data?.balance || 0) as number;

      // Count outstanding invoices
      const { count } = await supabase
        .from('invoices')
        .select('*', { count: 'exact' })
        .eq('customer_id', customerId)
        .in('status', ['Draft', 'Confirmed', 'Partially Paid', 'Overdue']);

      return {
        ...customer,
        balance,
        outstanding_invoices: count || 0,
      };
    } catch (error) {
      console.error('Error fetching customer with balance:', error);
      throw error;
    }
  }

  /**
   * Create new customer
   */
  static async createCustomer(input: CreateCustomerInput): Promise<Customer> {
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([
          {
            name: input.name,
            type: input.type,
            contact_person: input.contact_person,
            email: input.email,
            phone: input.phone,
            address: input.address,
            city: input.city,
            country: input.country,
            tax_id: input.tax_id,
            status: 'Active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to create customer');

      // Initialize customer balance snapshot
      await supabase.from('customer_balance_snapshot').insert([
        {
          customer_id: data.id,
          balance: 0.0,
          last_updated: new Date().toISOString(),
        },
      ]);

      return data as Customer;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  }

  /**
   * Update existing customer
   */
  static async updateCustomer(
    customerId: string,
    updates: Partial<CreateCustomerInput>
  ): Promise<Customer> {
    try {
      const { data, error } = await supabase
        .from('customers')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', customerId)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Customer not found');

      return data as Customer;
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  }

  /**
   * Soft delete customer (sets deleted_at)
   */
  static async softDeleteCustomer(customerId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('customers')
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', customerId);

      if (error) throw error;
      console.log(`Customer ${customerId} soft deleted`);
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  }

  /**
   * Get customer balance
   */
  static async getCustomerBalance(customerId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('customer_balance_snapshot')
        .select('balance')
        .eq('customer_id', customerId)
        .single();

      if (error) throw error;
      return data?.balance || 0;
    } catch (error) {
      console.error('Error fetching customer balance:', error);
      throw error;
    }
  }

  /**
   * Update customer balance (called by ledger service)
   * @internal
   */
  static async updateCustomerBalance(
    customerId: string,
    newBalance: number
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('customer_balance_snapshot')
        .update({
          balance: newBalance,
          last_updated: new Date().toISOString(),
        })
        .eq('customer_id', customerId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating customer balance:', error);
      throw error;
    }
  }

  /**
   * Search customers by name or email
   */
  static async searchCustomers(query: string): Promise<Customer[]> {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .is('deleted_at', null)
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching customers:', error);
      throw error;
    }
  }
}

export default CustomerService;
