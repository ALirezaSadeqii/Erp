-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================
-- CUSTOMERS
-- =========================
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    company_name TEXT,
    created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- =========================
-- CARS
-- =========================
CREATE TABLE IF NOT EXISTS cars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    license_plate TEXT UNIQUE NOT NULL,
    vehicle_type TEXT,
    model TEXT,
    color TEXT,
    vin TEXT,
    created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cars_plate ON cars(license_plate);

-- =========================
-- STAFF
-- =========================
CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    role TEXT,
    fixed_salary NUMERIC DEFAULT 0,
    created_at TIMESTAMP DEFAULT now()
);

-- =========================
-- VISITS
-- =========================
CREATE TABLE IF NOT EXISTS visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    car_id UUID REFERENCES cars(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL,
    exit_date DATE,
    requires_chassis_alignment BOOLEAN DEFAULT false,
    painted_parts_count INTEGER DEFAULT 0,
    bodywork_parts_count INTEGER DEFAULT 0,
    total_amount NUMERIC,
    payment_method TEXT,
    insurance TEXT,
    vehicle_expense NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visits_entry_date ON visits(entry_date);

-- =========================
-- STAFF LOANS
-- =========================
CREATE TABLE IF NOT EXISTS staff_loans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    loan_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_loans_staff ON staff_loans(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_loans_date ON staff_loans(loan_date);

-- =========================
-- SERVICES
-- =========================
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL,
    staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    price NUMERIC,
    notes TEXT,
    created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_services_type ON services(service_type);
CREATE INDEX IF NOT EXISTS idx_services_staff ON services(staff_id);

-- Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_loans ENABLE ROW LEVEL SECURITY;

-- Remove open anon policies (run on existing DBs)
DROP POLICY IF EXISTS "Allow all for anon" ON customers;
DROP POLICY IF EXISTS "Allow all for anon" ON cars;
DROP POLICY IF EXISTS "Allow all for anon" ON staff;
DROP POLICY IF EXISTS "Allow all for anon" ON visits;
DROP POLICY IF EXISTS "Allow all for anon" ON services;
DROP POLICY IF EXISTS "Allow all for anon" ON staff_loans;

DROP POLICY IF EXISTS "Authenticated full access" ON customers;
DROP POLICY IF EXISTS "Authenticated full access" ON cars;
DROP POLICY IF EXISTS "Authenticated full access" ON staff;
DROP POLICY IF EXISTS "Authenticated full access" ON visits;
DROP POLICY IF EXISTS "Authenticated full access" ON services;
DROP POLICY IF EXISTS "Authenticated full access" ON staff_loans;

-- Only authenticated users can access data
CREATE POLICY "Authenticated full access" ON customers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated full access" ON cars
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated full access" ON staff
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated full access" ON visits
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated full access" ON services
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated full access" ON staff_loans
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Sample data (run once on fresh DB)
INSERT INTO staff (name, role)
SELECT 'Ali Usta', 'Kaportacı'
WHERE NOT EXISTS (SELECT 1 FROM staff WHERE name = 'Ali Usta');

INSERT INTO staff (name, role)
SELECT 'Veli Usta', 'Boyacı'
WHERE NOT EXISTS (SELECT 1 FROM staff WHERE name = 'Veli Usta');

INSERT INTO customers (name, phone, company_name)
SELECT 'Ahmet Yılmaz', '05321112233', NULL
WHERE NOT EXISTS (SELECT 1 FROM customers WHERE phone = '05321112233');

INSERT INTO customers (name, phone, company_name)
SELECT 'Mehmet Demir', '05445556677', 'Demir Lojistik'
WHERE NOT EXISTS (SELECT 1 FROM customers WHERE phone = '05445556677');

INSERT INTO customers (name, phone, company_name)
SELECT 'Ayşe Kaya', '05558889900', NULL
WHERE NOT EXISTS (SELECT 1 FROM customers WHERE phone = '05558889900');

INSERT INTO cars (customer_id, license_plate, vehicle_type, model, color)
SELECT c.id, '34 ABC 123', 'Binek', 'Toyota Corolla', 'Beyaz'
FROM customers c WHERE c.phone = '05321112233'
ON CONFLICT (license_plate) DO NOTHING;

INSERT INTO cars (customer_id, license_plate, vehicle_type, model, color)
SELECT c.id, '06 XYZ 456', 'Ticari', 'Ford Transit', 'Gri'
FROM customers c WHERE c.phone = '05445556677'
ON CONFLICT (license_plate) DO NOTHING;

INSERT INTO cars (customer_id, license_plate, vehicle_type, model, color)
SELECT c.id, '35 DEF 789', 'Binek', 'Renault Clio', 'Kırmızı'
FROM customers c WHERE c.phone = '05558889900'
ON CONFLICT (license_plate) DO NOTHING;

INSERT INTO visits (car_id, entry_date, exit_date, total_amount, payment_method, painted_parts_count, bodywork_parts_count)
SELECT c.id, '2025-06-01', '2025-06-05', 12500.00, 'cash', 2, 1
FROM cars c WHERE c.license_plate = '34 ABC 123'
  AND NOT EXISTS (
    SELECT 1 FROM visits v WHERE v.car_id = c.id AND v.entry_date = '2025-06-01'
  );

INSERT INTO visits (car_id, entry_date, exit_date, total_amount, payment_method, painted_parts_count, bodywork_parts_count)
SELECT c.id, '2025-06-10', NULL, 8700.00, 'kredi_karti', 0, 3
FROM cars c WHERE c.license_plate = '06 XYZ 456'
  AND NOT EXISTS (
    SELECT 1 FROM visits v WHERE v.car_id = c.id AND v.entry_date = '2025-06-10'
  );

INSERT INTO visits (car_id, entry_date, exit_date, total_amount, payment_method, painted_parts_count, bodywork_parts_count)
SELECT c.id, '2025-06-15', '2025-06-16', 3200.00, 'havale', 1, 0
FROM cars c WHERE c.license_plate = '35 DEF 789'
  AND NOT EXISTS (
    SELECT 1 FROM visits v WHERE v.car_id = c.id AND v.entry_date = '2025-06-15'
  );

INSERT INTO services (visit_id, service_type, staff_id, price)
SELECT v.id, 'bodywork', s.id, 5000.00
FROM visits v
JOIN cars c ON c.id = v.car_id
JOIN staff s ON s.name = 'Ali Usta'
WHERE c.license_plate = '34 ABC 123' AND v.entry_date = '2025-06-01'
  AND NOT EXISTS (
    SELECT 1 FROM services sv WHERE sv.visit_id = v.id AND sv.service_type = 'bodywork'
  );

INSERT INTO services (visit_id, service_type, staff_id, price)
SELECT v.id, 'painting', s.id, 7500.00
FROM visits v
JOIN cars c ON c.id = v.car_id
JOIN staff s ON s.name = 'Veli Usta'
WHERE c.license_plate = '34 ABC 123' AND v.entry_date = '2025-06-01'
  AND NOT EXISTS (
    SELECT 1 FROM services sv WHERE sv.visit_id = v.id AND sv.service_type = 'painting'
  );

INSERT INTO services (visit_id, service_type, staff_id, price)
SELECT v.id, 'bodywork', s.id, 8700.00
FROM visits v
JOIN cars c ON c.id = v.car_id
JOIN staff s ON s.name = 'Ali Usta'
WHERE c.license_plate = '06 XYZ 456' AND v.entry_date = '2025-06-10'
  AND NOT EXISTS (
    SELECT 1 FROM services sv WHERE sv.visit_id = v.id AND sv.service_type = 'bodywork'
  );

INSERT INTO services (visit_id, service_type, staff_id, price)
SELECT v.id, 'painting', s.id, 3200.00
FROM visits v
JOIN cars c ON c.id = v.car_id
JOIN staff s ON s.name = 'Veli Usta'
WHERE c.license_plate = '35 DEF 789' AND v.entry_date = '2025-06-15'
  AND NOT EXISTS (
    SELECT 1 FROM services sv WHERE sv.visit_id = v.id AND sv.service_type = 'painting'
  );
