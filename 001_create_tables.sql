-- EYTRA IOL Management System - Supabase Migration
-- Phase 1 Backend Foundation
-- Created: June 2026

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. COMPANY PROFILE
-- ============================================================================
CREATE TABLE IF NOT EXISTS company_profile (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name VARCHAR(255) NOT NULL DEFAULT 'EYTRA',
  tagline VARCHAR(500),
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  tax_id VARCHAR(50),
  currency VARCHAR(10) DEFAULT 'PKR',
  tax_percentage DECIMAL(5,2) DEFAULT 17.00,
  payment_terms_quotation TEXT,
  payment_terms_invoice TEXT,
  delivery_terms TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 2. DOCUMENT COUNTERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS document_counters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  counter_type VARCHAR(50) NOT NULL UNIQUE, -- 'quotation', 'delivery_order', 'invoice'
  last_number INTEGER DEFAULT 199,
  prefix VARCHAR(20) NOT NULL, -- 'ERA', 'DO-ERA', 'INV-ERA'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 3. CUSTOMERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('Doctor', 'Hospital', 'Clinic')),
  contact_person VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  tax_id VARCHAR(50),
  status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Suspended')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(type);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);

-- ============================================================================
-- 4. PRODUCTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku VARCHAR(100) NOT NULL UNIQUE, -- UVF600-125FL, B525, B65130, etc.
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL CHECK (category IN ('IOL Lens', 'Knife', 'Solution', 'Equipment', 'Injector')),
  is_diopter_based BOOLEAN DEFAULT FALSE,
  is_hard_lens BOOLEAN DEFAULT FALSE,
  hard_lens_attribute VARCHAR(20), -- '5.25' or '6.5' for hard lenses
  cost_price DECIMAL(10,2) NOT NULL,
  markup_percentage DECIMAL(5,2) DEFAULT 35.00,
  unit VARCHAR(50) DEFAULT 'Unit', -- Unit, Box, ml, pcs, etc.
  status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Discontinued')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_diopter ON products(is_diopter_based);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

-- ============================================================================
-- 5. PRODUCT DIOPTER RANGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_diopter_ranges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  min_diopter DECIMAL(4,1) NOT NULL,
  max_diopter DECIMAL(4,1) NOT NULL,
  step DECIMAL(3,1) DEFAULT 0.5,
  variant_name VARCHAR(255), -- e.g., "SQFL600ASP-Variant1", "CBFY32UVFLEX"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, min_diopter, max_diopter, variant_name)
);

CREATE INDEX IF NOT EXISTS idx_diopter_ranges_product ON product_diopter_ranges(product_id);

-- ============================================================================
-- 6. CUSTOMER PRICES
-- ============================================================================
CREATE TABLE IF NOT EXISTS customer_prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  unit_price DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(customer_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_prices_customer ON customer_prices(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_prices_product ON customer_prices(product_id);

-- ============================================================================
-- 7. STOCK ENTRIES (Current inventory)
-- ============================================================================
CREATE TABLE IF NOT EXISTS stock_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  diopter DECIMAL(4,1), -- NULL for non-diopter products
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  batch_number VARCHAR(100), -- For tracking batches
  location VARCHAR(255), -- Shelf/warehouse location
  expiry_date DATE,
  manufacture_date DATE,
  fifo_priority INTEGER, -- Lower = earlier, deduct this first
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, diopter, batch_number, location)
);

CREATE INDEX IF NOT EXISTS idx_stock_product ON stock_entries(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_diopter ON stock_entries(diopter);
CREATE INDEX IF NOT EXISTS idx_stock_location ON stock_entries(location);
CREATE INDEX IF NOT EXISTS idx_stock_expiry ON stock_entries(expiry_date);

-- ============================================================================
-- 8. STOCK ADJUSTMENTS (Audit trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stock_entry_id UUID NOT NULL REFERENCES stock_entries(id) ON DELETE CASCADE,
  adjustment_type VARCHAR(50) NOT NULL CHECK (adjustment_type IN ('receipt', 'deduction', 'loss', 'damage', 'audit_correction', 'return')),
  quantity_change INTEGER NOT NULL, -- Can be negative
  reference_id UUID, -- Links to invoice_item, quotation_item, etc.
  reference_type VARCHAR(50), -- 'invoice', 'quotation', 'delivery_order', 'manual'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_adj_stock ON stock_adjustments(stock_entry_id);
CREATE INDEX IF NOT EXISTS idx_stock_adj_type ON stock_adjustments(adjustment_type);
CREATE INDEX IF NOT EXISTS idx_stock_adj_reference ON stock_adjustments(reference_id, reference_type);

-- ============================================================================
-- 9. QUOTATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS quotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_number VARCHAR(50) NOT NULL UNIQUE, -- ERA-200, ERA-201, etc.
  customer_id UUID NOT NULL REFERENCES customers(id),
  document_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  status VARCHAR(50) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Confirmed', 'Sent', 'Expired')),
  subtotal DECIMAL(12,2) DEFAULT 0,
  tax_percentage DECIMAL(5,2),
  tax_amount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  prepared_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_quotations_number ON quotations(document_number);
CREATE INDEX IF NOT EXISTS idx_quotations_customer ON quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_date ON quotations(document_date);

-- ============================================================================
-- 10. QUOTATION ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS quotation_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  -- Snapshots (store at time of quotation)
  product_name_snapshot VARCHAR(255) NOT NULL,
  product_sku_snapshot VARCHAR(100),
  diopter_snapshot DECIMAL(4,1),
  unit_snapshot VARCHAR(50),
  -- Line details
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  line_total DECIMAL(12,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation ON quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_product ON quotation_items(product_id);

-- ============================================================================
-- 11. DELIVERY ORDERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS delivery_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_number VARCHAR(50) NOT NULL UNIQUE, -- DO-ERA-200, DO-ERA-201, etc.
  customer_id UUID NOT NULL REFERENCES customers(id),
  quotation_id UUID REFERENCES quotations(id), -- Optional reference
  document_date DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_date DATE,
  status VARCHAR(50) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Confirmed', 'Delivered', 'Cancelled')),
  subtotal DECIMAL(12,2) DEFAULT 0,
  tax_percentage DECIMAL(5,2),
  tax_amount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  prepared_by VARCHAR(255),
  authorized_by VARCHAR(255), -- Delivery signature
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_delivery_orders_number ON delivery_orders(document_number);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_customer ON delivery_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_quotation ON delivery_orders(quotation_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_status ON delivery_orders(status);

-- ============================================================================
-- 12. DELIVERY ORDER ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS delivery_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_order_id UUID NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  -- Snapshots
  product_name_snapshot VARCHAR(255) NOT NULL,
  product_sku_snapshot VARCHAR(100),
  diopter_snapshot DECIMAL(4,1),
  unit_snapshot VARCHAR(50),
  -- Line details
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  line_total DECIMAL(12,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_order_items_do ON delivery_order_items(delivery_order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_order_items_product ON delivery_order_items(product_id);

-- ============================================================================
-- 13. INVOICES
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_number VARCHAR(50) NOT NULL UNIQUE, -- INV-ERA-200, INV-ERA-201, etc.
  customer_id UUID NOT NULL REFERENCES customers(id),
  delivery_order_id UUID REFERENCES delivery_orders(id), -- Optional reference
  quotation_id UUID REFERENCES quotations(id), -- Optional reference
  document_date DATE NOT NULL DEFAULT CURRENT_DATE,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  payment_terms VARCHAR(255),
  status VARCHAR(50) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Confirmed', 'Paid', 'Partially Paid', 'Overdue', 'Cancelled')),
  subtotal DECIMAL(12,2) DEFAULT 0,
  tax_percentage DECIMAL(5,2),
  tax_amount DECIMAL(12,2) DEFAULT 0,
  previous_balance DECIMAL(12,2) DEFAULT 0, -- Customer's balance before this invoice
  total DECIMAL(12,2) DEFAULT 0,
  amount_paid DECIMAL(12,2) DEFAULT 0,
  balance_due DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(document_number);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(document_date);

-- ============================================================================
-- 14. INVOICE ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  -- Snapshots
  product_name_snapshot VARCHAR(255) NOT NULL,
  product_sku_snapshot VARCHAR(100),
  diopter_snapshot DECIMAL(4,1),
  unit_snapshot VARCHAR(50),
  -- Line details
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  line_total DECIMAL(12,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product ON invoice_items(product_id);

-- ============================================================================
-- 15. PAYMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  invoice_id UUID REFERENCES invoices(id), -- Optional: which invoice payment is for
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('Cash', 'Cheque', 'Bank Transfer')),
  amount DECIMAL(12,2) NOT NULL,
  cheque_number VARCHAR(50), -- If cheque
  bank_name VARCHAR(255), -- If bank transfer
  reference_number VARCHAR(100), -- Transaction ID, cheque #, etc.
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(payment_method);

-- ============================================================================
-- 16. LEDGER ENTRIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('Quotation', 'Delivery Order', 'Invoice', 'Payment', 'Manual Adjustment')),
  reference_id UUID, -- ID of quotation, invoice, payment, etc.
  transaction_date DATE NOT NULL,
  description VARCHAR(500),
  debit_amount DECIMAL(12,2), -- Amount owed (invoices)
  credit_amount DECIMAL(12,2), -- Amount paid (payments)
  running_balance DECIMAL(12,2) NOT NULL DEFAULT 0, -- After this transaction
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_customer ON ledger_entries(customer_id);
CREATE INDEX IF NOT EXISTS idx_ledger_type ON ledger_entries(transaction_type);
CREATE INDEX IF NOT EXISTS idx_ledger_date ON ledger_entries(transaction_date);
CREATE INDEX IF NOT EXISTS idx_ledger_reference ON ledger_entries(reference_id);

-- ============================================================================
-- 17. CUSTOMER BALANCE SNAPSHOT
-- ============================================================================
CREATE TABLE IF NOT EXISTS customer_balance_snapshot (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
  balance DECIMAL(12,2) DEFAULT 0, -- Positive = owes, Negative = overpaid
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_balance_customer ON customer_balance_snapshot(customer_id);

-- ============================================================================
-- SEED DATA INITIALIZATION (Insert counters for document numbering)
-- ============================================================================

INSERT INTO document_counters (counter_type, last_number, prefix)
VALUES 
  ('quotation', 199, 'ERA'),
  ('delivery_order', 199, 'DO-ERA'),
  ('invoice', 199, 'INV-ERA')
ON CONFLICT (counter_type) DO NOTHING;

-- ============================================================================
-- SEED DATA: Company Profile
-- ============================================================================

INSERT INTO company_profile (
  company_name,
  tagline,
  email,
  phone,
  city,
  country,
  tax_percentage
)
VALUES (
  'EYTRA',
  'Deals in Intraocular Lenses and Medical Equipment',
  'info@eytra.com',
  '+92-42-1234567',
  'Lahore',
  'Pakistan',
  17.00
)
ON CONFLICT DO NOTHING;

COMMIT;
