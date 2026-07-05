import { createClient } from "@/lib/supabase";

/**
 * Fetch all visits within a date range and aggregate into report sections.
 * @param {{ dateFrom?: string, dateTo?: string }} options
 */
export async function getReport({ dateFrom, dateTo } = {}) {
  const supabase = await createClient();

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
      cars (
        id,
        license_plate,
        vehicle_type,
        model,
        color,
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
        staff (
          id,
          name,
          role
        )
      )
    `
    )
    .order("entry_date", { ascending: false });

  if (dateFrom) query = query.gte("entry_date", dateFrom);
  if (dateTo) query = query.lte("entry_date", dateTo);

  const { data: visits, error } = await query;

  if (error) {
    return { error: error.message };
  }

  const rows = visits ?? [];

  // ── Summary ──────────────────────────────────────────────────────────────
  const totalIncome = rows.reduce((s, v) => s + (parseFloat(v.total_amount) || 0), 0);
  const totalExpenses = rows.reduce((s, v) => s + (parseFloat(v.vehicle_expense) || 0), 0);
  const netProfit = totalIncome - totalExpenses;
  const visitCount = rows.length;
  const completedCount = rows.filter((v) => v.exit_date).length;
  const activeCount = visitCount - completedCount;

  // ── By Payment Method ─────────────────────────────────────────────────────
  const paymentMap = {};
  for (const v of rows) {
    const method = v.payment_method || "unknown";
    if (!paymentMap[method]) paymentMap[method] = { count: 0, total: 0 };
    paymentMap[method].count += 1;
    paymentMap[method].total += parseFloat(v.total_amount) || 0;
  }
  const byPaymentMethod = Object.entries(paymentMap)
    .map(([method, d]) => ({ method, count: d.count, total: d.total }))
    .sort((a, b) => b.total - a.total);

  // ── By Service Type ───────────────────────────────────────────────────────
  const serviceMap = {};
  for (const v of rows) {
    for (const s of v.services ?? []) {
      const type = s.service_type || "unknown";
      if (!serviceMap[type]) serviceMap[type] = { count: 0, total: 0 };
      serviceMap[type].count += 1;
      serviceMap[type].total += parseFloat(s.price) || 0;
    }
  }
  const byServiceType = Object.entries(serviceMap)
    .map(([type, d]) => ({ type, count: d.count, total: d.total }))
    .sort((a, b) => b.total - a.total);

  // ── By Staff ──────────────────────────────────────────────────────────────
  const staffMap = {};
  for (const v of rows) {
    for (const s of v.services ?? []) {
      if (!s.staff) continue;
      const staffId = s.staff.id;
      if (!staffMap[staffId]) {
        staffMap[staffId] = {
          id: staffId,
          name: s.staff.name,
          role: s.staff.role,
          count: 0,
          total: 0,
        };
      }
      staffMap[staffId].count += 1;
      staffMap[staffId].total += parseFloat(s.price) || 0;
    }
  }
  const byStaff = Object.values(staffMap).sort((a, b) => b.total - a.total);

  // ── By Vehicle ────────────────────────────────────────────────────────────
  const vehicleMap = {};
  for (const v of rows) {
    const car = v.cars;
    if (!car) continue;
    const carId = car.id;
    if (!vehicleMap[carId]) {
      vehicleMap[carId] = {
        id: carId,
        licensePlate: car.license_plate,
        model: [car.vehicle_type, car.model, car.color].filter(Boolean).join(" · "),
        customerName: car.customers?.name ?? "—",
        visitCount: 0,
        totalIncome: 0,
        totalExpenses: 0,
      };
    }
    vehicleMap[carId].visitCount += 1;
    vehicleMap[carId].totalIncome += parseFloat(v.total_amount) || 0;
    vehicleMap[carId].totalExpenses += parseFloat(v.vehicle_expense) || 0;
  }
  const byVehicle = Object.values(vehicleMap)
    .map((v) => ({ ...v, netProfit: v.totalIncome - v.totalExpenses }))
    .sort((a, b) => b.totalIncome - a.totalIncome);

  // ── By Insurance ──────────────────────────────────────────────────────────
  const insuranceMap = {};
  for (const v of rows) {
    const ins = v.insurance?.trim() || null;
    const key = ins ?? "__none__";
    if (!insuranceMap[key]) insuranceMap[key] = { insurance: ins, count: 0, total: 0 };
    insuranceMap[key].count += 1;
    insuranceMap[key].total += parseFloat(v.total_amount) || 0;
  }
  const byInsurance = Object.values(insuranceMap)
    .filter((i) => i.insurance !== null)
    .sort((a, b) => b.total - a.total);

  return {
    error: null,
    summary: { totalIncome, totalExpenses, netProfit, visitCount, completedCount, activeCount },
    byPaymentMethod,
    byServiceType,
    byStaff,
    byVehicle,
    byInsurance,
  };
}

export async function getHubStats() {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];
  const monthStart = today.slice(0, 7) + "-01";

  const [incomeRes, activeCarsRes, completedTodayRes, advancesRes] = await Promise.all([
    supabase.from("visits").select("total_amount").eq("entry_date", today),
    supabase.from("visits").select("id", { count: "exact", head: true }).is("exit_date", null),
    supabase.from("visits").select("id", { count: "exact", head: true }).eq("exit_date", today),
    supabase.from("staff_loans").select("amount").gte("loan_date", monthStart).lte("loan_date", today),
  ]);

  return {
    todayIncome: (incomeRes.data ?? []).reduce((s, v) => s + (parseFloat(v.total_amount) || 0), 0),
    activeCarsCount: activeCarsRes.count ?? 0,
    completedToday: completedTodayRes.count ?? 0,
    staffAdvancesThisMonth: (advancesRes.data ?? []).reduce((s, l) => s + (l.amount ?? 0), 0),
  };
}

export async function getOperationsReport({ dateFrom, dateTo } = {}) {
  const supabase = await createClient();

  const activeCarsQuery = supabase
    .from("visits")
    .select(`id, entry_date, cars(id, license_plate, model, vehicle_type, color, customers(name, phone))`)
    .is("exit_date", null)
    .order("entry_date", { ascending: true });

  let completedQuery = supabase
    .from("visits")
    .select(`id, entry_date, exit_date, total_amount, cars(id, license_plate, model, vehicle_type, customers(name))`)
    .not("exit_date", "is", null)
    .order("exit_date", { ascending: false });
  if (dateFrom) completedQuery = completedQuery.gte("exit_date", dateFrom);
  if (dateTo) completedQuery = completedQuery.lte("exit_date", dateTo);

  let statsQuery = supabase
    .from("visits")
    .select("id, entry_date, exit_date, requires_chassis_alignment, painted_parts_count, bodywork_parts_count");
  if (dateFrom) statsQuery = statsQuery.gte("entry_date", dateFrom);
  if (dateTo) statsQuery = statsQuery.lte("entry_date", dateTo);

  const [activeCarsRes, completedRes, statsRes] = await Promise.all([
    activeCarsQuery,
    completedQuery,
    statsQuery,
  ]);

  if (activeCarsRes.error) return { error: activeCarsRes.error.message };
  if (completedRes.error) return { error: completedRes.error.message };
  if (statsRes.error) return { error: statsRes.error.message };

  const active = activeCarsRes.data ?? [];
  const completed = completedRes.data ?? [];
  const periodRows = statsRes.data ?? [];
  const now = Date.now();

  const completedWithDays = completed.map((v) => {
    const days = Math.max(0, Math.floor((new Date(v.exit_date) - new Date(v.entry_date)) / 86400000));
    return {
      id: v.id,
      entryDate: v.entry_date,
      exitDate: v.exit_date,
      days,
      totalAmount: parseFloat(v.total_amount) || 0,
      licensePlate: v.cars?.license_plate ?? "—",
      model: [v.cars?.vehicle_type, v.cars?.model].filter(Boolean).join(" "),
      customerName: v.cars?.customers?.name ?? "—",
    };
  });

  const avgDaysInShop =
    completedWithDays.length > 0
      ? Math.round((completedWithDays.reduce((s, v) => s + v.days, 0) / completedWithDays.length) * 10) / 10
      : 0;

  return {
    error: null,
    activeCars: active.map((v) => ({
      id: v.id,
      entryDate: v.entry_date,
      daysInShop: Math.floor((now - new Date(v.entry_date)) / 86400000),
      licensePlate: v.cars?.license_plate ?? "—",
      model: [v.cars?.vehicle_type, v.cars?.model].filter(Boolean).join(" "),
      color: v.cars?.color ?? "",
      customerName: v.cars?.customers?.name ?? "—",
      phone: v.cars?.customers?.phone ?? "—",
    })),
    completedInPeriod: completedWithDays,
    summary: {
      activeCarsCount: active.length,
      completedCount: completed.length,
      avgDaysInShop,
      newEntriesCount: periodRows.length,
      chassisCount: periodRows.filter((v) => v.requires_chassis_alignment).length,
      paintedPartsTotal: periodRows.reduce((s, v) => s + (v.painted_parts_count || 0), 0),
      bodyworkPartsTotal: periodRows.reduce((s, v) => s + (v.bodywork_parts_count || 0), 0),
    },
  };
}

export async function getStaffReport({ dateFrom, dateTo } = {}) {
  const supabase = await createClient();

  let loansQuery = supabase
    .from("staff_loans")
    .select("id, staff_id, amount, loan_date")
    .order("loan_date", { ascending: false });
  if (dateFrom) loansQuery = loansQuery.gte("loan_date", dateFrom);
  if (dateTo) loansQuery = loansQuery.lte("loan_date", dateTo);

  let servicesQuery = supabase
    .from("services")
    .select("id, staff_id, price, service_type, visits!inner(entry_date)");
  if (dateFrom) servicesQuery = servicesQuery.gte("visits.entry_date", dateFrom);
  if (dateTo) servicesQuery = servicesQuery.lte("visits.entry_date", dateTo);

  const [staffRes, loansRes, servicesRes] = await Promise.all([
    supabase.from("staff").select("id, name, role, fixed_salary").order("name"),
    loansQuery,
    servicesQuery,
  ]);

  if (staffRes.error) return { error: staffRes.error.message };
  if (loansRes.error) return { error: loansRes.error.message };

  const loansByStaff = {};
  for (const l of loansRes.data ?? []) {
    if (!loansByStaff[l.staff_id]) loansByStaff[l.staff_id] = [];
    loansByStaff[l.staff_id].push(l);
  }

  const servicesByStaff = {};
  for (const s of servicesRes.data ?? []) {
    if (!s.staff_id) continue;
    if (!servicesByStaff[s.staff_id]) servicesByStaff[s.staff_id] = [];
    servicesByStaff[s.staff_id].push(s);
  }

  const staff = (staffRes.data ?? []).map((s) => {
    const loans = loansByStaff[s.id] ?? [];
    const services = servicesByStaff[s.id] ?? [];
    const advances = loans.reduce((sum, l) => sum + (l.amount ?? 0), 0);
    const serviceRevenue = services.reduce((sum, svc) => sum + (parseFloat(svc.price) || 0), 0);
    const fixedSalary = s.fixed_salary ?? 0;
    return {
      id: s.id,
      name: s.name,
      role: s.role,
      fixedSalary,
      advances,
      netPayout: fixedSalary - advances,
      serviceCount: services.length,
      serviceRevenue,
      loans,
    };
  });

  return {
    error: null,
    staff,
    summary: {
      totalAdvances: staff.reduce((s, p) => s + p.advances, 0),
      totalNetPayout: staff.reduce((s, p) => s + p.netPayout, 0),
      totalServiceRevenue: staff.reduce((s, p) => s + p.serviceRevenue, 0),
    },
  };
}
