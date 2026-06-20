-- Clear existing catalog items
TRUNCATE TABLE public.vendor_catalog RESTART IDENTITY CASCADE;

-- Insert mock items for the existing vendors
INSERT INTO public.vendor_catalog (vendor_id, product_name, category, price, warranty_months, delivery_days, moq, stock, rating)
VALUES
  -- Vendor 1: yabhi
  ('976e799e-64c4-4f8b-a229-0482d0cce138', 'Ergonomic Office Chair', 'Office supplies', 6500, 12, 3, 5, 120, 4.5),
  ('976e799e-64c4-4f8b-a229-0482d0cce138', 'Premium Gel Pens', 'Office supplies', 15, 0, 2, 100, 5000, 4.2),
  ('976e799e-64c4-4f8b-a229-0482d0cce138', 'Stainless Steel Screws', 'Industrial fasteners', 2, 24, 4, 1000, 100000, 4.6),

  -- Vendor 2: king org
  ('ded23755-32d4-415a-af5c-507b375f2100', 'Printer Paper A4', 'Office supplies', 280, 0, 1, 20, 1500, 4.8),
  ('ded23755-32d4-415a-af5c-507b375f2100', 'M12 Hex Bolts', 'Industrial fasteners', 8, 12, 3, 500, 50000, 4.4),

  -- Vendor 3: sds
  ('1cac1f09-e3a1-4dcb-8930-7b6572113dc2', 'M12 Hex Bolts', 'Industrial fasteners', 7, 12, 5, 600, 40000, 4.3),
  ('1cac1f09-e3a1-4dcb-8930-7b6572113dc2', 'Stainless Steel Screws', 'Industrial fasteners', 1.8, 24, 3, 2000, 80000, 4.5),

  -- Vendor 4: df
  ('933b1875-021d-469f-ae72-d02345ef6c42', 'Ergonomic Office Chair', 'Office supplies', 6200, 18, 7, 10, 80, 4.7);
