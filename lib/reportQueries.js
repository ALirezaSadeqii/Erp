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
