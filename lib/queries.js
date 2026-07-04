import { createClient } from "@/lib/supabase";

function formatVisitRow(row) {
  const car = row.cars;
  const customer = car?.customers;

  return {
    id: row.id,
    carId: car?.id,
    licensePlate: car?.license_plate ?? "—",
    vehicleType: car?.vehicle_type ?? "",
    model: car?.model ?? "",
    color: car?.color ?? "",
    vin: car?.vin ?? "",
    customerName: customer?.name ?? "—",
    phone: customer?.phone ?? "—",
    companyName: customer?.company_name ?? "",
    entryDate: row.entry_date,
    exitDate: row.exit_date,
    totalAmount: row.total_amount,
    paymentMethod: row.payment_method,
    paintedPartsCount: row.painted_parts_count,
    bodyworkPartsCount: row.bodywork_parts_count,
    requiresChassisAlignment: row.requires_chassis_alignment,
    insurance: row.insurance,
    vehicleExpense: row.vehicle_expense,
    notes: row.notes,
    serviceTypes: (row.services ?? []).map((s) => s.service_type).filter(Boolean),
    staffNames: [...new Set((row.services ?? []).map((s) => s.staff?.name).filter(Boolean))],
    staffRoles: [...new Set((row.services ?? []).map((s) => s.staff?.role).filter(Boolean))],
    serviceDetails: (row.services ?? []).map((s) => ({
      type: s.service_type,
      price: s.price,
      notes: s.notes,
      staffName: s.staff?.name,
      staffRole: s.staff?.role,
    })),
  };
}

function dedupeById(rows) {
  const seen = new Set();
  return (rows ?? []).filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

function ilike(value) {
  return `%${value.trim()}%`;
}

export async function getVisits(filters = {}) {
  const {
    search = "",
    licensePlate = "",
    customerName = "",
    phone = "",
    companyName = "",
    vehicleType = "",
    model = "",
    color = "",
    vin = "",
    dateFrom = "",
    dateTo = "",
    exitDateFrom = "",
    exitDateTo = "",
    serviceType = "",
    staffId = "",
    paymentMethod = "",
    status = "",
    requiresChassisAlignment = "",
    minAmount = "",
    maxAmount = "",
    minPaintedParts = "",
    minBodyworkParts = "",
    notes = "",
    insurance = "",
    minVehicleExpense = "",
    maxVehicleExpense = "",
  } = filters;

  const supabase = await createClient();
  const needsServiceJoin = Boolean(serviceType || staffId);
  const servicesJoin = needsServiceJoin ? "services!inner" : "services";

  let query = supabase
    .from("visits")
    .select(
      `
      id,
      entry_date,
      exit_date,
      total_amount,
      payment_method,
      painted_parts_count,
      bodywork_parts_count,
      requires_chassis_alignment,
      insurance,
      vehicle_expense,
      notes,
      cars!inner (
        id,
        license_plate,
        vehicle_type,
        model,
        color,
        vin,
        customers!inner (
          name,
          phone,
          company_name
        )
      ),
      ${servicesJoin} (
        service_type,
        staff_id,
        price,
        notes,
        staff (
          name,
          role
        )
      )
    `
    )
    .order("entry_date", { ascending: false });

  if (dateFrom) query = query.gte("entry_date", dateFrom);
  if (dateTo) query = query.lte("entry_date", dateTo);
  if (exitDateFrom) query = query.gte("exit_date", exitDateFrom);
  if (exitDateTo) query = query.lte("exit_date", exitDateTo);
  if (paymentMethod) query = query.eq("payment_method", paymentMethod);
  if (minAmount) query = query.gte("total_amount", parseFloat(minAmount));
  if (maxAmount) query = query.lte("total_amount", parseFloat(maxAmount));
  if (minPaintedParts) query = query.gte("painted_parts_count", parseInt(minPaintedParts, 10));
  if (minBodyworkParts) query = query.gte("bodywork_parts_count", parseInt(minBodyworkParts, 10));
  if (notes.trim()) query = query.ilike("notes", ilike(notes));
  if (insurance.trim()) query = query.ilike("insurance", ilike(insurance));
  if (minVehicleExpense) query = query.gte("vehicle_expense", parseFloat(minVehicleExpense));
  if (maxVehicleExpense) query = query.lte("vehicle_expense", parseFloat(maxVehicleExpense));

  if (requiresChassisAlignment === "true") {
    query = query.eq("requires_chassis_alignment", true);
  } else if (requiresChassisAlignment === "false") {
    query = query.eq("requires_chassis_alignment", false);
  }

  if (status === "active") query = query.is("exit_date", null);
  if (status === "completed") query = query.not("exit_date", "is", null);

  if (serviceType) query = query.eq("services.service_type", serviceType);
  if (staffId) query = query.eq("services.staff_id", staffId);

  if (licensePlate.trim()) {
    query = query.ilike("cars.license_plate", ilike(licensePlate));
  }
  if (vehicleType.trim()) {
    query = query.ilike("cars.vehicle_type", ilike(vehicleType));
  }
  if (model.trim()) {
    query = query.ilike("cars.model", ilike(model));
  }
  if (color.trim()) {
    query = query.ilike("cars.color", ilike(color));
  }
  if (vin.trim()) {
    query = query.ilike("cars.vin", ilike(vin));
  }
  if (customerName.trim()) {
    query = query.ilike("cars.customers.name", ilike(customerName));
  }
  if (phone.trim()) {
    query = query.ilike("cars.customers.phone", ilike(phone));
  }
  if (companyName.trim()) {
    query = query.ilike("cars.customers.company_name", ilike(companyName));
  }

  if (search.trim()) {
    const term = ilike(search);
    query = query.or(
      `license_plate.ilike.${term},vehicle_type.ilike.${term},model.ilike.${term},customers.name.ilike.${term},customers.phone.ilike.${term},customers.company_name.ilike.${term}`,
      { referencedTable: "cars" }
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("getVisits error:", error.message);
    return { visits: [], error: error.message };
  }

  return { visits: dedupeById(data).map(formatVisitRow), error: null };
}

export async function getVisitById(id) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("visits")
    .select(
      `
      id,
      entry_date,
      exit_date,
      total_amount,
      payment_method,
      painted_parts_count,
      bodywork_parts_count,
      requires_chassis_alignment,
      insurance,
      vehicle_expense,
      notes,
      created_at,
      cars (
        id,
        license_plate,
        vehicle_type,
        model,
        color,
        vin,
        customers (
          id,
          name,
          phone,
          company_name
        )
      ),
      services (
        id,
        service_type,
        price,
        notes,
        staff_id,
        staff (
          id,
          name,
          role
        )
      )
    `
    )
    .eq("id", id)
    .single();

  if (error) {
    return { visit: null, error: error.message };
  }

  return { visit: data, error: null };
}

export async function getCarWithHistory(id) {
  const supabase = await createClient();

  const { data: car, error: carError } = await supabase
    .from("cars")
    .select(
      `
      id,
      license_plate,
      vehicle_type,
      model,
      color,
      vin,
      created_at,
      customers (
        id,
        name,
        phone,
        company_name
      )
    `
    )
    .eq("id", id)
    .single();

  if (carError) {
    return { car: null, visits: [], error: carError.message };
  }

  const { data: visits, error: visitsError } = await supabase
    .from("visits")
    .select(
      `
      id,
      entry_date,
      exit_date,
      total_amount,
      payment_method,
      painted_parts_count,
      bodywork_parts_count,
      requires_chassis_alignment,
      insurance,
      vehicle_expense,
      notes,
      services (
        id,
        service_type,
        price,
        notes,
        staff (
          id,
          name,
          role
        )
      )
    `
    )
    .eq("car_id", id)
    .order("entry_date", { ascending: false });

  if (visitsError) {
    return { car, visits: [], error: visitsError.message };
  }

  return { car, visits: visits ?? [], error: null };
}

export async function getStaffList() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("staff")
    .select("id, name, role")
    .order("name");

  if (error) {
    return { staff: [], error: error.message };
  }

  return { staff: data ?? [], error: null };
}

export async function getStaffWithLoans() {
  const supabase = await createClient();

  const { data: staffData, error: staffError } = await supabase
    .from("staff")
    .select("id, name, role, fixed_salary")
    .order("name");

  if (staffError) {
    return { staff: [], error: staffError.message };
  }

  const { data: loansData, error: loansError } = await supabase
    .from("staff_loans")
    .select("id, staff_id, amount, loan_date, created_at")
    .order("loan_date", { ascending: false });

  if (loansError) {
    return { staff: [], error: loansError.message };
  }

  // Group loans by staff_id
  const loansByStaff = {};
  for (const loan of loansData ?? []) {
    if (!loansByStaff[loan.staff_id]) loansByStaff[loan.staff_id] = [];
    loansByStaff[loan.staff_id].push(loan);
  }

  const staff = (staffData ?? []).map((s) => {
    const loans = loansByStaff[s.id] ?? [];
    const totalLoaned = loans.reduce((sum, l) => sum + (l.amount ?? 0), 0);
    return {
      id: s.id,
      name: s.name,
      role: s.role,
      fixedSalary: s.fixed_salary ?? 0,
      loans,
      totalLoaned,
    };
  });

  return { staff, error: null };
}
