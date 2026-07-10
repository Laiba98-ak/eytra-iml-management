-- EYTRA IOL System - Seed Data
-- Products, diopter ranges, and sample stock

-- ============================================================================
-- DIOPTER-BASED LENS PRODUCTS (From PDFs)
-- ============================================================================

INSERT INTO products (sku, name, description, category, is_diopter_based, cost_price, markup_percentage, unit, status)
VALUES
  -- Hydrophilic Foldable Lenses
  ('UVF600-125FL', 'Foldable Hydrophilic Lens with Injectors (Optic Plus)', 'Optic Plus - with injectors', 'IOL Lens', TRUE, 4500.00, 35.00, 'Unit', 'Active'),
  ('SQFL600ASP', 'Foldable Hydrophilic Lens without Injectors (Vision Plus)', 'Vision Plus - without injectors', 'IOL Lens', TRUE, 3800.00, 40.00, 'Unit', 'Active'),
  ('CBFY32UVFLEX', 'Foldable Yellow Lens (Occu Gold)', 'Yellow lens - Occu Gold variant', 'IOL Lens', TRUE, 5200.00, 35.00, 'Unit', 'Active'),
  -- Hard Lenses (attribute-based, not standard diopter)
  ('B65130', 'Hard Lens 6.5 (Rigid 6.5)', 'Hard IOL Lens - Rigid 6.5 attribute', 'IOL Lens', TRUE, 2800.00, 30.00, 'Unit', 'Active'),
  ('B525', 'Hard Lens 5.25 (Rigid 5.25)', 'Hard IOL Lens - Rigid 5.25 attribute', 'IOL Lens', TRUE, 2600.00, 30.00, 'Unit', 'Active'),
  -- Hydrophobic Lens
  ('CBHF33 UV', 'Hydrophobic Lens (Hydrophobic IOL)', 'Hydrophobic IOL lens', 'IOL Lens', TRUE, 3500.00, 35.00, 'Unit', 'Active'),

  -- NON-DIOPTER PRODUCTS
  ('AQ-S-B-CON24', 'Sefilfe Injector Only', 'Injector for manual insertion', 'Injector', FALSE, 850.00, 25.00, 'Unit', 'Active'),
  ('KNIFE-2.8', 'Knife 2.8mm', 'Surgical knife 2.8mm', 'Knife', FALSE, 850.00, 30.00, 'Unit', 'Active'),
  ('KNIFE-3.2', 'Knife 3.2mm', 'Surgical knife 3.2mm', 'Knife', FALSE, 920.00, 30.00, 'Unit', 'Active'),
  ('KNIFE-15D', 'Knife 15 Degree', 'Surgical knife 15 degree angle', 'Knife', FALSE, 1100.00, 30.00, 'Unit', 'Active'),
  ('METHYL-GEL-5ML', 'Methyl Gel 5ml', 'Ophthalmic methyl gel', 'Solution', FALSE, 280.00, 40.00, 'ml', 'Active'),
  ('CARBACHOL', 'Carbachol', 'Ophthalmic solution - Carbachol', 'Solution', FALSE, 450.00, 35.00, 'Unit', 'Active'),
  ('TRYPAN-BLUE', 'Trypan Blue', 'Ophthalmic stain - Trypan Blue', 'Solution', FALSE, 520.00, 35.00, 'Unit', 'Active'),
  ('OPSITE-SHEET', 'Opsite Sheet', 'Protective ophthalmic sheet', 'Equipment', FALSE, 180.00, 40.00, 'Unit', 'Active');

-- ============================================================================
-- DIOPTER RANGES (From real PDFs)
-- ============================================================================

-- UVF600-125FL: 10.0 to 30.0 D (from PDF: diopter-wise-details)
INSERT INTO product_diopter_ranges (product_id, min_diopter, max_diopter, step, variant_name)
SELECT id, 10.0, 30.0, 0.5, 'UVF600-125FL'
FROM products WHERE sku = 'UVF600-125FL';

-- B525: 11.0 to 30.0 D (from PDF)
INSERT INTO product_diopter_ranges (product_id, min_diopter, max_diopter, step, variant_name)
SELECT id, 11.0, 30.0, 0.5, 'B525'
FROM products WHERE sku = 'B525';

-- B65130: 10.0 to 30.0 D (from PDF)
INSERT INTO product_diopter_ranges (product_id, min_diopter, max_diopter, step, variant_name)
SELECT id, 10.0, 30.0, 0.5, 'B65130'
FROM products WHERE sku = 'B65130';

-- CBFY32UVFLEX: 1.0 to 35.0 D (from PDF)
INSERT INTO product_diopter_ranges (product_id, min_diopter, max_diopter, step, variant_name)
SELECT id, 1.0, 35.0, 0.5, 'CBFY32UVFLEX'
FROM products WHERE sku = 'CBFY32UVFLEX';

-- SQFL600ASP: Two variants from PDF
INSERT INTO product_diopter_ranges (product_id, min_diopter, max_diopter, step, variant_name)
SELECT id, 1.0, 30.0, 0.5, 'SQFL600ASP-Variant1'
FROM products WHERE sku = 'SQFL600ASP'
UNION ALL
SELECT id, 11.0, 33.0, 0.5, 'SQFL600ASP-Variant2'
FROM products WHERE sku = 'SQFL600ASP';

-- CBHF33 UV: 17.0 to 25.0 D (from packing list summary)
INSERT INTO product_diopter_ranges (product_id, min_diopter, max_diopter, step, variant_name)
SELECT id, 17.0, 25.0, 0.5, 'CBHF33 UV'
FROM products WHERE sku = 'CBHF33 UV';

-- ============================================================================
-- SAMPLE STOCK DATA (Real numbers from PDFs)
-- ============================================================================

-- UVF600-125FL: 10,120 units total (distributed across diopters as per PDF)
INSERT INTO stock_entries (product_id, diopter, quantity, batch_number, location, fifo_priority, created_at)
SELECT id, 10.0, 50, 'BATCH-UVF-2026-001', 'Shelf-A1', 1, NOW() FROM products WHERE sku = 'UVF600-125FL'
UNION ALL SELECT id, 11.0, 50, 'BATCH-UVF-2026-001', 'Shelf-A1', 2, NOW() FROM products WHERE sku = 'UVF600-125FL'
UNION ALL SELECT id, 12.0, 50, 'BATCH-UVF-2026-001', 'Shelf-A1', 3, NOW() FROM products WHERE sku = 'UVF600-125FL'
UNION ALL SELECT id, 13.0, 50, 'BATCH-UVF-2026-001', 'Shelf-A1', 4, NOW() FROM products WHERE sku = 'UVF600-125FL'
UNION ALL SELECT id, 14.0, 13, 'BATCH-UVF-2026-001', 'Shelf-A1', 5, NOW() FROM products WHERE sku = 'UVF600-125FL'
UNION ALL SELECT id, 15.0, 50, 'BATCH-UVF-2026-001', 'Shelf-A1', 6, NOW() FROM products WHERE sku = 'UVF600-125FL'
UNION ALL SELECT id, 15.5, 50, 'BATCH-UVF-2026-001', 'Shelf-A1', 7, NOW() FROM products WHERE sku = 'UVF600-125FL'
UNION ALL SELECT id, 16.0, 50, 'BATCH-UVF-2026-001', 'Shelf-A1', 8, NOW() FROM products WHERE sku = 'UVF600-125FL'
UNION ALL SELECT id, 16.5, 50, 'BATCH-UVF-2026-001', 'Shelf-A2', 9, NOW() FROM products WHERE sku = 'UVF600-125FL'
UNION ALL SELECT id, 17.0, 300, 'BATCH-UVF-2026-001', 'Shelf-A2', 10, NOW() FROM products WHERE sku = 'UVF600-125FL'
UNION ALL SELECT id, 17.5, 150, 'BATCH-UVF-2026-001', 'Shelf-A2', 11, NOW() FROM products WHERE sku = 'UVF600-125FL'
UNION ALL SELECT id, 18.0, 300, 'BATCH-UVF-2026-001', 'Shelf-A2', 12, NOW() FROM products WHERE sku = 'UVF600-125FL'
UNION ALL SELECT id, 18.5, 200, 'BATCH-UVF-2026-001', 'Shelf-A2', 13, NOW() FROM products WHERE sku = 'UVF600-125FL'
UNION ALL SELECT id, 19.0, 925, 'BATCH-UVF-2026-001', 'Shelf-A3', 14, NOW() FROM products WHERE sku = 'UVF600-125FL'
UNION ALL SELECT id, 19.5, 450, 'BATCH-UVF-2026-001', 'Shelf-A3', 15, NOW() FROM products WHERE sku = 'UVF600-125FL'
UNION ALL SELECT id, 20.0, 1025, 'BATCH-UVF-2026-001', 'Shelf-A3', 16, NOW() FROM products WHERE sku = 'UVF600-125FL'
UNION ALL SELECT id, 20.5, 418, 'BATCH-UVF-2026-001', 'Shelf-A3', 17, NOW() FROM products WHERE sku = 'UVF600-125FL'
UNION ALL SELECT id, 21.0, 1025, 'BATCH-UVF-2026-001', 'Shelf-A4', 18, NOW() FROM products WHERE sku = 'UVF600-125FL'
UNION ALL SELECT id, 21.5, 519, 'BATCH-UVF-2026-001', 'Shelf-A4', 19, NOW() FROM products WHERE sku = 'UVF600-125FL'
UNION ALL SELECT id, 22.0, 1025, 'BATCH-UVF-2026-001', 'Shelf-A4', 20, NOW() FROM products WHERE sku = 'UVF600-125FL'
UNION ALL SELECT id, 22.5, 500, 'BATCH-UVF-2026-001', 'Shelf-A4', 21, NOW() FROM products WHERE sku = 'UVF600-125FL'
UNION ALL SELECT id, 23.0, 820, 'BATCH-UVF-2026-001', 'Shelf-B1', 22, NOW() FROM products WHERE sku = 'UVF600-125FL'
UNION ALL SELECT id, 23.5, 300, 'BATCH-UVF-2026-001', 'Shelf-B1', 23, NOW() FROM products WHERE sku = 'UVF600-125FL'
UNION ALL SELECT id, 24.0, 500, 'BATCH-UVF-2026-001', 'Shelf-B1', 24, NOW() FROM products WHERE sku = 'UVF600-125FL'
UNION ALL SELECT id, 24.5, 300, 'BATCH-UVF-2026-001', 'Shelf-B1', 25, NOW() FROM products WHERE sku = 'UVF600-125FL'
UNION ALL SELECT id, 25.0, 350, 'BATCH-UVF-2026-001', 'Shelf-B2', 26, NOW() FROM products WHERE sku = 'UVF600-125FL'
UNION ALL SELECT id, 25.5, 200, 'BATCH-UVF-2026-001', 'Shelf-B2', 27, NOW() FROM products WHERE sku = 'UVF600-125FL'
UNION ALL SELECT id, 26.0, 200, 'BATCH-UVF-2026-001', 'Shelf-B2', 28, NOW() FROM products WHERE sku = 'UVF600-125FL'
UNION ALL SELECT id, 27.0, 69, 'BATCH-UVF-2026-001', 'Shelf-B2', 29, NOW() FROM products WHERE sku = 'UVF600-125FL'
UNION ALL SELECT id, 28.0, 50, 'BATCH-UVF-2026-001', 'Shelf-B3', 30, NOW() FROM products WHERE sku = 'UVF600-125FL'
UNION ALL SELECT id, 29.0, 31, 'BATCH-UVF-2026-001', 'Shelf-B3', 31, NOW() FROM products WHERE sku = 'UVF600-125FL'
UNION ALL SELECT id, 30.0, 50, 'BATCH-UVF-2026-001', 'Shelf-B3', 32, NOW() FROM products WHERE sku = 'UVF600-125FL';

-- B525: 4,000 units (sample distributed)
INSERT INTO stock_entries (product_id, diopter, quantity, batch_number, location, fifo_priority, created_at)
SELECT id, 11.0, 5, 'BATCH-B525-2026-001', 'Shelf-C1', 1, NOW() FROM products WHERE sku = 'B525'
UNION ALL SELECT id, 12.0, 5, 'BATCH-B525-2026-001', 'Shelf-C1', 2, NOW() FROM products WHERE sku = 'B525'
UNION ALL SELECT id, 20.0, 500, 'BATCH-B525-2026-001', 'Shelf-C2', 10, NOW() FROM products WHERE sku = 'B525'
UNION ALL SELECT id, 21.0, 500, 'BATCH-B525-2026-001', 'Shelf-C2', 11, NOW() FROM products WHERE sku = 'B525'
UNION ALL SELECT id, 22.0, 500, 'BATCH-B525-2026-001', 'Shelf-C3', 12, NOW() FROM products WHERE sku = 'B525'
UNION ALL SELECT id, 23.0, 300, 'BATCH-B525-2026-001', 'Shelf-C3', 13, NOW() FROM products WHERE sku = 'B525'
UNION ALL SELECT id, 24.0, 100, 'BATCH-B525-2026-001', 'Shelf-C4', 14, NOW() FROM products WHERE sku = 'B525'
UNION ALL SELECT id, 25.0, 100, 'BATCH-B525-2026-001', 'Shelf-C4', 15, NOW() FROM products WHERE sku = 'B525'
UNION ALL SELECT id, 30.0, 20, 'BATCH-B525-2026-001', 'Shelf-C4', 30, NOW() FROM products WHERE sku = 'B525';

-- B65130: 11,100 units (sample distributed)
INSERT INTO stock_entries (product_id, diopter, quantity, batch_number, location, fifo_priority, created_at)
SELECT id, 10.0, 21, 'BATCH-B65130-2026-001', 'Shelf-D1', 1, NOW() FROM products WHERE sku = 'B65130'
UNION ALL SELECT id, 19.0, 900, 'BATCH-B65130-2026-001', 'Shelf-D2', 9, NOW() FROM products WHERE sku = 'B65130'
UNION ALL SELECT id, 20.0, 1158, 'BATCH-B65130-2026-001', 'Shelf-D3', 10, NOW() FROM products WHERE sku = 'B65130'
UNION ALL SELECT id, 21.0, 1047, 'BATCH-B65130-2026-001', 'Shelf-D4', 11, NOW() FROM products WHERE sku = 'B65130'
UNION ALL SELECT id, 22.0, 1106, 'BATCH-B65130-2026-001', 'Shelf-D5', 12, NOW() FROM products WHERE sku = 'B65130'
UNION ALL SELECT id, 23.0, 1040, 'BATCH-B65130-2026-001', 'Shelf-D6', 13, NOW() FROM products WHERE sku = 'B65130'
UNION ALL SELECT id, 24.0, 475, 'BATCH-B65130-2026-001', 'Shelf-D7', 14, NOW() FROM products WHERE sku = 'B65130'
UNION ALL SELECT id, 25.0, 325, 'BATCH-B65130-2026-001', 'Shelf-D8', 15, NOW() FROM products WHERE sku = 'B65130'
UNION ALL SELECT id, 30.0, 100, 'BATCH-B65130-2026-001', 'Shelf-D8', 30, NOW() FROM products WHERE sku = 'B65130';

-- CBFY32UVFLEX: 5,880 units (sample)
INSERT INTO stock_entries (product_id, diopter, quantity, batch_number, location, fifo_priority, created_at)
SELECT id, 16.0, 75, 'BATCH-CBFY32-2026-001', 'Shelf-E1', 1, NOW() FROM products WHERE sku = 'CBFY32UVFLEX'
UNION ALL SELECT id, 19.0, 400, 'BATCH-CBFY32-2026-001', 'Shelf-E2', 9, NOW() FROM products WHERE sku = 'CBFY32UVFLEX'
UNION ALL SELECT id, 20.0, 675, 'BATCH-CBFY32-2026-001', 'Shelf-E2', 10, NOW() FROM products WHERE sku = 'CBFY32UVFLEX'
UNION ALL SELECT id, 21.0, 650, 'BATCH-CBFY32-2026-001', 'Shelf-E3', 11, NOW() FROM products WHERE sku = 'CBFY32UVFLEX'
UNION ALL SELECT id, 22.0, 650, 'BATCH-CBFY32-2026-001', 'Shelf-E3', 12, NOW() FROM products WHERE sku = 'CBFY32UVFLEX'
UNION ALL SELECT id, 25.0, 95, 'BATCH-CBFY32-2026-001', 'Shelf-E4', 15, NOW() FROM products WHERE sku = 'CBFY32UVFLEX'
UNION ALL SELECT id, 35.0, 5, 'BATCH-CBFY32-2026-001', 'Shelf-E4', 35, NOW() FROM products WHERE sku = 'CBFY32UVFLEX';

-- SQFL600ASP: 5,000 units (sample)
INSERT INTO stock_entries (product_id, diopter, quantity, batch_number, location, fifo_priority, created_at)
SELECT id, 15.0, 35, 'BATCH-SQFL-2026-001', 'Shelf-F1', 1, NOW() FROM products WHERE sku = 'SQFL600ASP'
UNION ALL SELECT id, 19.0, 80, 'BATCH-SQFL-2026-001', 'Shelf-F1', 9, NOW() FROM products WHERE sku = 'SQFL600ASP'
UNION ALL SELECT id, 20.0, 80, 'BATCH-SQFL-2026-001', 'Shelf-F2', 10, NOW() FROM products WHERE sku = 'SQFL600ASP'
UNION ALL SELECT id, 21.0, 80, 'BATCH-SQFL-2026-001', 'Shelf-F2', 11, NOW() FROM products WHERE sku = 'SQFL600ASP'
UNION ALL SELECT id, 22.0, 80, 'BATCH-SQFL-2026-001', 'Shelf-F2', 12, NOW() FROM products WHERE sku = 'SQFL600ASP'
UNION ALL SELECT id, 25.0, 30, 'BATCH-SQFL-2026-001', 'Shelf-F3', 15, NOW() FROM products WHERE sku = 'SQFL600ASP'
UNION ALL SELECT id, 30.0, 20, 'BATCH-SQFL-2026-001', 'Shelf-F3', 30, NOW() FROM products WHERE sku = 'SQFL600ASP';

-- CBHF33 UV: 500 units (from packing list box 49-50)
INSERT INTO stock_entries (product_id, diopter, quantity, batch_number, location, fifo_priority, created_at)
SELECT id, 17.0, 5, 'BATCH-CBHF33-2026-001', 'Shelf-G1', 1, NOW() FROM products WHERE sku = 'CBHF33 UV'
UNION ALL SELECT id, 18.0, 10, 'BATCH-CBHF33-2026-001', 'Shelf-G1', 2, NOW() FROM products WHERE sku = 'CBHF33 UV'
UNION ALL SELECT id, 19.0, 70, 'BATCH-CBHF33-2026-001', 'Shelf-G1', 3, NOW() FROM products WHERE sku = 'CBHF33 UV'
UNION ALL SELECT id, 20.0, 80, 'BATCH-CBHF33-2026-001', 'Shelf-G2', 4, NOW() FROM products WHERE sku = 'CBHF33 UV'
UNION ALL SELECT id, 21.0, 80, 'BATCH-CBHF33-2026-001', 'Shelf-G2', 5, NOW() FROM products WHERE sku = 'CBHF33 UV'
UNION ALL SELECT id, 22.0, 80, 'BATCH-CBHF33-2026-001', 'Shelf-G2', 6, NOW() FROM products WHERE sku = 'CBHF33 UV'
UNION ALL SELECT id, 23.0, 20, 'BATCH-CBHF33-2026-001', 'Shelf-G3', 7, NOW() FROM products WHERE sku = 'CBHF33 UV'
UNION ALL SELECT id, 25.0, 5, 'BATCH-CBHF33-2026-001', 'Shelf-G3', 9, NOW() FROM products WHERE sku = 'CBHF33 UV';

-- Non-diopter products (simple stock, no diopter)
INSERT INTO stock_entries (product_id, quantity, batch_number, location, fifo_priority, created_at)
SELECT id, 1200, 'BATCH-AQS-2026-001', 'Shelf-H1', 1, NOW() FROM products WHERE sku = 'AQ-S-B-CON24'
UNION ALL SELECT id, 100, 'BATCH-KNIFE28-2026-001', 'Shelf-H2', 1, NOW() FROM products WHERE sku = 'KNIFE-2.8'
UNION ALL SELECT id, 100, 'BATCH-KNIFE32-2026-001', 'Shelf-H2', 1, NOW() FROM products WHERE sku = 'KNIFE-3.2'
UNION ALL SELECT id, 50, 'BATCH-KNIFE15-2026-001', 'Shelf-H2', 1, NOW() FROM products WHERE sku = 'KNIFE-15D'
UNION ALL SELECT id, 200, 'BATCH-METHYL-2026-001', 'Shelf-H3', 1, NOW() FROM products WHERE sku = 'METHYL-GEL-5ML'
UNION ALL SELECT id, 150, 'BATCH-CARB-2026-001', 'Shelf-H3', 1, NOW() FROM products WHERE sku = 'CARBACHOL'
UNION ALL SELECT id, 100, 'BATCH-TRYPAN-2026-001', 'Shelf-H3', 1, NOW() FROM products WHERE sku = 'TRYPAN-BLUE'
UNION ALL SELECT id, 200, 'BATCH-OPSITE-2026-001', 'Shelf-H4', 1, NOW() FROM products WHERE sku = 'OPSITE-SHEET';

-- ============================================================================
-- SAMPLE CUSTOMERS
-- ============================================================================

INSERT INTO customers (name, type, contact_person, email, phone, address, city, country, status)
VALUES
  ('Dr. Ahmed Hassan', 'Doctor', 'Dr. Ahmed Hassan', 'ahmed.hassan@eyeclinic.pk', '+92-300-1234567', 'Eye Care Clinic, Gulberg III', 'Lahore', 'Pakistan', 'Active'),
  ('Shifa International Hospital', 'Hospital', 'Dr. Muhammad Ali', 'info@shifaclinic.pk', '+92-42-5678901', 'Shifa International Hospital, Rimple Road', 'Lahore', 'Pakistan', 'Active'),
  ('Dr. Sana Malik', 'Doctor', 'Dr. Sana Malik', 'sana.malik@eyecare.pk', '+92-321-9876543', 'Eye Specialists Clinic, DHA', 'Lahore', 'Pakistan', 'Active'),
  ('Al Baseer Medical Center', 'Clinic', 'Mr. Fahad Khan', 'contact@albaseer.pk', '+92-300-7654321', 'Al Baseer Medical Center, Johar Town', 'Lahore', 'Pakistan', 'Active'),
  ('Dr. Muhammad Rizwan', 'Doctor', 'Dr. Muhammad Rizwan', 'rizwan@eyespec.pk', '+92-333-2468135', 'Eye Specialization Clinic, Mall Road', 'Lahore', 'Pakistan', 'Active');

-- ============================================================================
-- SAMPLE CUSTOMER PRICES (overrides master product prices)
-- ============================================================================

INSERT INTO customer_prices (customer_id, product_id, unit_price, notes)
SELECT c.id, p.id, 6500.00, 'Special rate for Shifa Hospital'
FROM customers c, products p
WHERE c.name = 'Shifa International Hospital' AND p.sku = 'UVF600-125FL'
UNION ALL
SELECT c.id, p.id, 4200.00, 'Preferred customer rate'
FROM customers c, products p
WHERE c.name = 'Dr. Ahmed Hassan' AND p.sku = 'SQFL600ASP'
UNION ALL
SELECT c.id, p.id, 3000.00, 'Bulk discount'
FROM customers c, products p
WHERE c.name = 'Al Baseer Medical Center' AND p.sku = 'B65130';

-- ============================================================================
-- CUSTOMER BALANCE SNAPSHOTS (All start at 0)
-- ============================================================================

INSERT INTO customer_balance_snapshot (customer_id, balance)
SELECT id, 0.00
FROM customers;

COMMIT;
