export function getDatePresets() {
  const now = new Date();
  const fmt = (d) => d.toISOString().split("T")[0];
  const today = fmt(now);

  const weekStart = new Date(now);
  const day = now.getDay();
  weekStart.setDate(now.getDate() - (day === 0 ? 6 : day - 1));

  const monthStart = fmt(new Date(now.getFullYear(), now.getMonth(), 1));
  const yearStart = fmt(new Date(now.getFullYear(), 0, 1));

  return [
    { label: "Bugün", dateFrom: today, dateTo: today },
    { label: "Bu Hafta", dateFrom: fmt(weekStart), dateTo: today },
    { label: "Bu Ay", dateFrom: monthStart, dateTo: today },
    { label: "Bu Yıl", dateFrom: yearStart, dateTo: today },
  ];
}

export function getThisMonthRange() {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  return { dateFrom: monthStart, dateTo: today };
}
