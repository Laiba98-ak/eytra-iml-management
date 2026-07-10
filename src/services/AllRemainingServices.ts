// src/services/InvoiceService.ts
import supabase from '../lib/supabase';
import { Invoice, InvoiceItem, CreateInvoiceInput, InvoiceStatus } from '../types/database';
import DocumentNumberingService from './DocumentNumberingService';
import ProductService from './ProductService';
import LedgerService from './LedgerService';
import CustomerService from './CustomerService';

export class InvoiceService {
  static async createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
    try {
      // Get next invoice number
      const { document_number } = await DocumentNumberingService.getNextDocumentNumber('invoice');

      // Get customer's previous balance
      const previousBalance = await CustomerService.getCustomerBalance(input.customer_id);

      // Calculate totals
      const subtotal = input.items.reduce((sum, item) => sum + (item.unit_price || 0) * item.quantity, 0);
      const taxAmount = (subtotal * (input.tax_percentage || 0)) / 100;
      const total = subtotal + taxAmount;

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([
          {
            document_number,
            customer_id: input.customer_id,
            delivery_order_id: input.delivery_order_id,
            quotation_id: input.quotation_id,
            invoice_date: input.invoice_date || new Date().toISOString().split('T')[0],
            document_date: input.invoice_date || new Date().toISOString().split('T')[0],
            due_date: input.due_date,
            payment_terms: input.payment_terms,
            status: 'Draft',
            subtotal,
            tax_percentage: input.tax_percentage,
            tax_amount: taxAmount,
            total,
            previous_balance: previousBalance,
            balance_due: previousBalance + total,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (invoiceError || !invoice) throw invoiceError || new Error('Failed to create invoice');

      // Add line items
      for (const item of input.items) {
        const product = await ProductService.getProductById(item.product_id);
        if (!product) throw new Error(`Product not found: ${item.product_id}`);

        await supabase.from('invoice_items').insert([
          {
            invoice_id: invoice.id,
            product_id: item.product_id,
            product_name_snapshot: product.name,
            product_sku_snapshot: product.sku,
            diopter_snapshot: item.diopter,
            unit_snapshot: product.unit,
            quantity: item.quantity,
            unit_price: item.unit_price || 0,
            line_total: (item.unit_price || 0) * item.quantity,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);
      }

      return invoice as Invoice;
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  }

  static async getInvoices(status?: InvoiceStatus, limit: number = 100): Promise<Invoice[]> {
    try {
      let query = supabase.from('invoices').select('*').is('deleted_at', null);
      if (status) query = query.eq('status', status);
      const { data, error } = await query.order('document_date', { ascending: false }).limit(limit);
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching invoices:', error);
      throw error;
    }
  }

  static async getCustomerInvoices(customerId: string): Promise<Invoice[]> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('customer_id', customerId)
        .is('deleted_at', null)
        .order('document_date', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching customer invoices:', error);
      throw error;
    }
  }

  static async getInvoiceById(invoiceId: string): Promise<(Invoice & { items: InvoiceItem[] }) | null> {
    try {
      const [invoiceRes, itemsRes] = await Promise.all([
        supabase.from('invoices').select('*').eq('id', invoiceId).is('deleted_at', null).single(),
        supabase.from('invoice_items').select('*').eq('invoice_id', invoiceId),
      ]);

      if (invoiceRes.error) throw invoiceRes.error;
      if (!invoiceRes.data) return null;

      return {
        ...(invoiceRes.data as Invoice),
        items: (itemsRes.data || []) as InvoiceItem[],
      };
    } catch (error) {
      console.error('Error fetching invoice:', error);
      throw error;
    }
  }

  static async confirmInvoice(invoiceId: string): Promise<void> {
    try {
      const invoice = await this.getInvoiceById(invoiceId);
      if (!invoice) throw new Error('Invoice not found');

      // Update status
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'Confirmed', updated_at: new Date().toISOString() })
        .eq('id', invoiceId);

      if (error) throw error;

      // Create ledger entry
      await LedgerService.addInvoiceEntry(
        invoice.customer_id,
        invoiceId,
        invoice.document_number,
        invoice.total,
        invoice.invoice_date
      );

      console.log(`Invoice ${invoice.document_number} confirmed`);
    } catch (error) {
      console.error('Error confirming invoice:', error);
      throw error;
    }
  }

  static async recordPayment(invoiceId: string, amount: number): Promise<void> {
    try {
      const invoice = await this.getInvoiceById(invoiceId);
      if (!invoice) throw new Error('Invoice not found');

      const amountPaid = (invoice.amount_paid || 0) + amount;
      const balanceDue = invoice.total - amountPaid;

      const newStatus: InvoiceStatus = balanceDue <= 0 ? 'Paid' : 'Partially Paid';

      const { error } = await supabase
        .from('invoices')
        .update({
          amount_paid: amountPaid,
          balance_due: Math.max(0, balanceDue),
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);

      if (error) throw error;
    } catch (error) {
      console.error('Error recording payment:', error);
      throw error;
    }
  }

  static async deleteInvoice(invoiceId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', invoiceId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting invoice:', error);
      throw error;
    }
  }
}

// src/services/QuotationService.ts
export class QuotationService {
  static async createQuotation(input: any) {
    try {
      const { document_number } = await DocumentNumberingService.getNextDocumentNumber('quotation');
      const subtotal = input.items.reduce((sum: number, item: any) => sum + (item.unit_price || 0) * item.quantity, 0);
      const taxAmount = (subtotal * (input.tax_percentage || 0)) / 100;
      const total = subtotal + taxAmount;

      const { data, error } = await supabase
        .from('quotations')
        .insert([
          {
            document_number,
            customer_id: input.customer_id,
            document_date: input.document_date || new Date().toISOString().split('T')[0],
            valid_until: input.valid_until,
            status: 'Draft',
            subtotal,
            tax_percentage: input.tax_percentage,
            tax_amount: taxAmount,
            total,
            notes: input.notes,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error || !data) throw error || new Error('Failed to create quotation');

      // Add items
      for (const item of input.items) {
        const product = await ProductService.getProductById(item.product_id);
        if (!product) throw new Error(`Product not found: ${item.product_id}`);

        await supabase.from('quotation_items').insert([
          {
            quotation_id: data.id,
            product_id: item.product_id,
            product_name_snapshot: product.name,
            product_sku_snapshot: product.sku,
            diopter_snapshot: item.diopter,
            unit_snapshot: product.unit,
            quantity: item.quantity,
            unit_price: item.unit_price || 0,
            line_total: (item.unit_price || 0) * item.quantity,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);
      }

      return data;
    } catch (error) {
      console.error('Error creating quotation:', error);
      throw error;
    }
  }

  static async getQuotations() {
    try {
      const { data, error } = await supabase
        .from('quotations')
        .select('*')
        .is('deleted_at', null)
        .order('document_date', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching quotations:', error);
      throw error;
    }
  }

  static async getQuotationById(quotationId: string) {
    try {
      const [quoteRes, itemsRes] = await Promise.all([
        supabase.from('quotations').select('*').eq('id', quotationId).single(),
        supabase.from('quotation_items').select('*').eq('quotation_id', quotationId),
      ]);
      if (quoteRes.error) throw quoteRes.error;
      return { ...quoteRes.data, items: itemsRes.data || [] };
    } catch (error) {
      console.error('Error fetching quotation:', error);
      throw error;
    }
  }
}

// src/services/DeliveryOrderService.ts
export class DeliveryOrderService {
  static async createDeliveryOrder(input: any) {
    try {
      const { document_number } = await DocumentNumberingService.getNextDocumentNumber('delivery_order');
      const subtotal = input.items.reduce((sum: number, item: any) => sum + (item.unit_price || 0) * item.quantity, 0);
      const taxAmount = (subtotal * (input.tax_percentage || 0)) / 100;
      const total = subtotal + taxAmount;

      const { data, error } = await supabase
        .from('delivery_orders')
        .insert([
          {
            document_number,
            customer_id: input.customer_id,
            quotation_id: input.quotation_id,
            document_date: input.document_date || new Date().toISOString().split('T')[0],
            delivery_date: input.delivery_date,
            status: 'Draft',
            subtotal,
            tax_percentage: input.tax_percentage,
            tax_amount: taxAmount,
            total,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error || !data) throw error;

      for (const item of input.items) {
        const product = await ProductService.getProductById(item.product_id);
        if (!product) throw new Error(`Product not found`);

        await supabase.from('delivery_order_items').insert([
          {
            delivery_order_id: data.id,
            product_id: item.product_id,
            product_name_snapshot: product.name,
            product_sku_snapshot: product.sku,
            diopter_snapshot: item.diopter,
            unit_snapshot: product.unit,
            quantity: item.quantity,
            unit_price: item.unit_price || 0,
            line_total: (item.unit_price || 0) * item.quantity,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);
      }

      return data;
    } catch (error) {
      console.error('Error creating delivery order:', error);
      throw error;
    }
  }

  static async getDeliveryOrders() {
    try {
      const { data, error } = await supabase
        .from('delivery_orders')
        .select('*')
        .is('deleted_at', null)
        .order('document_date', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching delivery orders:', error);
      throw error;
    }
  }
}

// src/services/PaymentService.ts
export class PaymentService {
  static async recordPayment(input: any) {
    try {
      const { data, error } = await supabase
        .from('payments')
        .insert([
          {
            customer_id: input.customer_id,
            invoice_id: input.invoice_id,
            payment_date: input.payment_date || new Date().toISOString().split('T')[0],
            payment_method: input.payment_method,
            amount: input.amount,
            cheque_number: input.cheque_number,
            bank_name: input.bank_name,
            reference_number: input.reference_number,
            notes: input.notes,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error || !data) throw error;

      // Add ledger entry
      await LedgerService.addPaymentEntry(
        input.customer_id,
        data.id,
        input.amount,
        input.payment_date || new Date().toISOString().split('T')[0],
        input.reference_number
      );

      return data;
    } catch (error) {
      console.error('Error recording payment:', error);
      throw error;
    }
  }

  static async getPayments(customerId?: string) {
    try {
      let query = supabase.from('payments').select('*').is('deleted_at', null);
      if (customerId) query = query.eq('customer_id', customerId);
      const { data, error } = await query.order('payment_date', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching payments:', error);
      throw error;
    }
  }
}

// src/services/StockService.ts
export class StockService {
  static async getStock(productId?: string) {
    try {
      let query = supabase.from('stock_entries').select('*');
      if (productId) query = query.eq('product_id', productId);
      const { data, error } = await query.order('fifo_priority', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching stock:', error);
      throw error;
    }
  }

  static async adjustStock(productId: string, diopter: number | null, quantityChange: number, reason: string) {
    try {
      // Find or create stock entry
      let query = supabase.from('stock_entries').select('*').eq('product_id', productId);
      if (diopter !== null) query = query.eq('diopter', diopter);
      const { data: stocks, error: stockError } = await query;
      if (stockError) throw stockError;

      const stock = stocks?.[0];
      if (!stock) throw new Error('Stock entry not found');

      // Update quantity
      const newQuantity = Math.max(0, (stock.quantity || 0) + quantityChange);
      const { error: updateError } = await supabase
        .from('stock_entries')
        .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
        .eq('id', stock.id);

      if (updateError) throw updateError;

      // Record adjustment
      await supabase.from('stock_adjustments').insert([
        {
          stock_entry_id: stock.id,
          adjustment_type: quantityChange > 0 ? 'receipt' : 'deduction',
          quantity_change: quantityChange,
          notes: reason,
          created_at: new Date().toISOString(),
        },
      ]);

      return newQuantity;
    } catch (error) {
      console.error('Error adjusting stock:', error);
      throw error;
    }
  }

  static async getStockAdjustments(stockId?: string) {
    try {
      let query = supabase.from('stock_adjustments').select('*');
      if (stockId) query = query.eq('stock_entry_id', stockId);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching stock adjustments:', error);
      throw error;
    }
  }

  static async getLowStockItems(threshold: number = 50) {
    try {
      const { data, error } = await supabase
        .from('stock_entries')
        .select('*, products(name, sku)')
        .lt('quantity', threshold);
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching low stock items:', error);
      throw error;
    }
  }
}

export default {
  InvoiceService,
  QuotationService,
  DeliveryOrderService,
  PaymentService,
  StockService,
};
