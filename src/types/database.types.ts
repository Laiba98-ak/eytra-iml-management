// src/types/database.ts
// Complete TypeScript types for EYTRA IOL Management System

import { UUID } from 'crypto';

// ============================================================================
// ENUMS
// ============================================================================

export enum CustomerType {
  Doctor = 'Doctor',
  Hospital = 'Hospital',
  Clinic = 'Clinic',
}

export enum ProductCategory {
  IOLLens = 'IOL Lens',
  Knife = 'Knife',
  Solution = 'Solution',
  Equipment = 'Equipment',
  Injector = 'Injector',
}

export enum ProductStatus {
  Active = 'Active',
  Inactive = 'Inactive',
  Discontinued = 'Discontinued',
}

export enum CustomerStatus {
  Active = 'Active',
  Inactive = 'Inactive',
  Suspended = 'Suspended',
}

export enum QuotationStatus {
  Draft = 'Draft',
  Confirmed = 'Confirmed',
  Sent = 'Sent',
  Expired = 'Expired',
}

export enum DeliveryOrderStatus {
  Draft = 'Draft',
  Confirmed = 'Confirmed',
  Delivered = 'Delivered',
  Cancelled = 'Cancelled',
}

export enum InvoiceStatus {
  Draft = 'Draft',
  Confirmed = 'Confirmed',
  Paid = 'Paid',
  PartiallyPaid = 'Partially Paid',
  Overdue = 'Overdue',
  Cancelled = 'Cancelled',
}

export enum PaymentMethod {
  Cash = 'Cash',
  Cheque = 'Cheque',
  BankTransfer = 'Bank Transfer',
}

export enum TransactionType {
  Quotation = 'Quotation',
  DeliveryOrder = 'Delivery Order',
  Invoice = 'Invoice',
  Payment = 'Payment',
  ManualAdjustment = 'Manual Adjustment',
}

export enum StockAdjustmentType {
  Receipt = 'receipt',
  Deduction = 'deduction',
  Loss = 'loss',
  Damage = 'damage',
  AuditCorrection = 'audit_correction',
  Return = 'return',
}

// ============================================================================
// COMPANY PROFILE
// ============================================================================

export interface CompanyProfile {
  id: string;
  company_name: string;
  tagline?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  tax_id?: string;
  currency: string;
  tax_percentage: number;
  payment_terms_quotation?: string;
  payment_terms_invoice?: string;
  delivery_terms?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// DOCUMENT COUNTERS
// ============================================================================

export interface DocumentCounter {
  id: string;
  counter_type: 'quotation' | 'delivery_order' | 'invoice';
  last_number: number;
  prefix: 'ERA' | 'DO-ERA' | 'INV-ERA';
  created_at: string;
  updated_at: string;
}

// ============================================================================
// CUSTOMERS
// ============================================================================

export interface Customer {
  id: string;
  name: string;
  type: CustomerType;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  tax_id?: string;
  status: CustomerStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface CreateCustomerInput {
  name: string;
  type: CustomerType;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  tax_id?: string;
}

// ============================================================================
// PRODUCTS
// ============================================================================

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category: ProductCategory;
  is_diopter_based: boolean;
  is_hard_lens: boolean;
  hard_lens_attribute?: string; // '5.25' or '6.5'
  cost_price: number;
  markup_percentage: number;
  unit: string;
  status: ProductStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface ProductDiopterRange {
  id: string;
  product_id: string;
  min_diopter: number;
  max_diopter: number;
  step: number;
  variant_name?: string;
  created_at: string;
}

export interface CreateProductInput {
  sku: string;
  name: string;
  category: ProductCategory;
  is_diopter_based: boolean;
  cost_price: number;
  markup_percentage?: number;
  unit?: string;
}

// ============================================================================
// CUSTOMER PRICES
// ============================================================================

export interface CustomerPrice {
  id: string;
  customer_id: string;
  product_id: string;
  unit_price: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// STOCK ENTRIES
// ============================================================================

export interface StockEntry {
  id: string;
  product_id: string;
  diopter?: number;
  quantity: number;
  batch_number?: string;
  location?: string;
  expiry_date?: string;
  manufacture_date?: string;
  fifo_priority: number;
  created_at: string;
  updated_at: string;
}

export interface StockAdjustment {
  id: string;
  stock_entry_id: string;
  adjustment_type: StockAdjustmentType;
  quantity_change: number;
  reference_id?: string;
  reference_type?: string;
  notes?: string;
  created_at: string;
}

// ============================================================================
// QUOTATIONS
// ============================================================================

export interface Quotation {
  id: string;
  document_number: string;
  customer_id: string;
  document_date: string;
  valid_until?: string;
  status: QuotationStatus;
  subtotal: number;
  tax_percentage?: number;
  tax_amount: number;
  total: number;
  notes?: string;
  prepared_by?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface QuotationItem {
  id: string;
  quotation_id: string;
  product_id: string;
  product_name_snapshot: string;
  product_sku_snapshot?: string;
  diopter_snapshot?: number;
  unit_snapshot: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateQuotationInput {
  customer_id: string;
  document_date?: string;
  valid_until?: string;
  items: CreateLineItemInput[];
  tax_percentage?: number;
  notes?: string;
}

// ============================================================================
// DELIVERY ORDERS
// ============================================================================

export interface DeliveryOrder {
  id: string;
  document_number: string;
  customer_id: string;
  quotation_id?: string;
  document_date: string;
  delivery_date?: string;
  status: DeliveryOrderStatus;
  subtotal: number;
  tax_percentage?: number;
  tax_amount: number;
  total: number;
  notes?: string;
  prepared_by?: string;
  authorized_by?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface DeliveryOrderItem {
  id: string;
  delivery_order_id: string;
  product_id: string;
  product_name_snapshot: string;
  product_sku_snapshot?: string;
  diopter_snapshot?: number;
  unit_snapshot: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDeliveryOrderInput {
  customer_id: string;
  quotation_id?: string;
  document_date?: string;
  delivery_date?: string;
  items: CreateLineItemInput[];
  tax_percentage?: number;
  notes?: string;
}

// ============================================================================
// INVOICES
// ============================================================================

export interface Invoice {
  id: string;
  document_number: string;
  customer_id: string;
  delivery_order_id?: string;
  quotation_id?: string;
  document_date: string;
  invoice_date: string;
  due_date?: string;
  payment_terms?: string;
  status: InvoiceStatus;
  subtotal: number;
  tax_percentage?: number;
  tax_amount: number;
  previous_balance: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string;
  product_name_snapshot: string;
  product_sku_snapshot?: string;
  diopter_snapshot?: number;
  unit_snapshot: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateInvoiceInput {
  customer_id: string;
  delivery_order_id?: string;
  quotation_id?: string;
  invoice_date?: string;
  due_date?: string;
  items: CreateLineItemInput[];
  tax_percentage?: number;
  payment_terms?: string;
  notes?: string;
}

// ============================================================================
// SHARED LINE ITEM INPUT
// ============================================================================

export interface CreateLineItemInput {
  product_id: string;
  diopter?: number;
  quantity: number;
  unit_price?: number; // If not provided, use customer price or master price
}

// ============================================================================
// PAYMENTS
// ============================================================================

export interface Payment {
  id: string;
  customer_id: string;
  invoice_id?: string;
  payment_date: string;
  payment_method: PaymentMethod;
  amount: number;
  cheque_number?: string;
  bank_name?: string;
  reference_number?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface CreatePaymentInput {
  customer_id: string;
  invoice_id?: string;
  payment_date?: string;
  payment_method: PaymentMethod;
  amount: number;
  cheque_number?: string;
  bank_name?: string;
  reference_number?: string;
  notes?: string;
}

// ============================================================================
// LEDGER ENTRIES
// ============================================================================

export interface LedgerEntry {
  id: string;
  customer_id: string;
  transaction_type: TransactionType;
  reference_id?: string;
  transaction_date: string;
  description?: string;
  debit_amount?: number; // Amount owed
  credit_amount?: number; // Amount paid
  running_balance: number; // Balance after this transaction
  created_at: string;
  updated_at: string;
}

// ============================================================================
// CUSTOMER BALANCE SNAPSHOT
// ============================================================================

export interface CustomerBalanceSnapshot {
  id: string;
  customer_id: string;
  balance: number; // Positive = owes, Negative = overpaid
  last_updated: string;
}

// ============================================================================
// VIEW/RESPONSE TYPES
// ============================================================================

export interface QuotationWithItems extends Quotation {
  customer?: Customer;
  items: QuotationItem[];
}

export interface DeliveryOrderWithItems extends DeliveryOrder {
  customer?: Customer;
  items: DeliveryOrderItem[];
}

export interface InvoiceWithItems extends Invoice {
  customer?: Customer;
  items: InvoiceItem[];
}

export interface CustomerWithBalance extends Customer {
  balance: number;
  outstanding_invoices: number;
}

export interface ProductWithStock extends Product {
  diopter_ranges?: ProductDiopterRange[];
  total_stock?: number;
  customer_price?: number; // If queried for specific customer
}

// ============================================================================
// API RESPONSE WRAPPER
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
