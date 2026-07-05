-- Baseline migration — full production schema as of 2026-07-05.
-- Safe to run against existing database: uses IF NOT EXISTS / DROP IF EXISTS throughout.

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

-- =========================
-- ROW LEVEL SECURITY
-- =========================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_loans ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can read/write all rows
DROP POLICY IF EXISTS "Authenticated full access" ON customers;
CREATE POLICY "Authenticated full access" ON customers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access" ON cars;
CREATE POLICY "Authenticated full access" ON cars
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access" ON staff;
CREATE POLICY "Authenticated full access" ON staff
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access" ON visits;
CREATE POLICY "Authenticated full access" ON visits
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access" ON services;
CREATE POLICY "Authenticated full access" ON services
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access" ON staff_loans;
CREATE POLICY "Authenticated full access" ON staff_loans
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
