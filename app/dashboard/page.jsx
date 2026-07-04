import Link from "next/link";
import { Suspense } from "react";
import { DashboardShell } from "@/components/ui/DashboardShell";
import { VisitFilters } from "@/components/form/VisitFilters";
import { VisitsTable } from "@/components/table/VisitsTable";
import { Button } from "@/components/ui/Button";
import { getVisits, getStaffList } from "@/lib/queries";

const FILTER_PARAM_KEYS = [
  "q",
  "licensePlate",
  "customerName",
  "phone",
  "companyName",
  "vehicleType",
  "model",
  "color",
  "vin",
  "dateFrom",
  "dateTo",
  "exitDateFrom",
  "exitDateTo",
  "serviceType",
  "staffId",
  "paymentMethod",
  "status",
  "requiresChassisAlignment",
  "minAmount",
  "maxAmount",
  "minPaintedParts",
  "minBodyworkParts",
  "notes",
  "insurance",
  "minVehicleExpense",
  "maxVehicleExpense",
];

function pickFilters(params) {
  const filters = {};
  FILTER_PARAM_KEYS.forEach((key) => {
    filters[key === "q" ? "search" : key] = params[key] ?? "";
  });
  return filters;
}

function pickInitialValues(params) {
  const values = {};
  FILTER_PARAM_KEYS.forEach((key) => {
    values[key] = params[key] ?? "";
  });
  return values;
}

function FiltersFallback() {
  return (
    <div className="h-36 animate-pulse rounded-xl border border-slate-200 bg-white" />
  );
}

function TableFallback() {
  return (
    <div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white" />
  );
}

async function VisitsContent({ searchParams }) {
  const params = await searchParams;
  const { visits, error } = await getVisits(pickFilters(params));

  return (
    <>
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Veriler yüklenirken bir hata oluştu: {error}
        </div>
      )}
      <VisitsTable visits={visits} />
    </>
  );
}

export default async function DashboardPage({ searchParams }) {
  const params = await searchParams;
  const { staff } = await getStaffList();
  const filterKey = FILTER_PARAM_KEYS.map((key) => params[key] ?? "").join("-");

  return (
    <DashboardShell>
      <header className="border-b border-slate-200 bg-white px-8 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Ziyaretler</h2>
            <p className="mt-1 text-sm text-slate-500">
              Servis kayıtlarını görüntüleyin ve filtreleyin.
            </p>
          </div>
          <Link href="/visits/new">
            <Button>+ Yeni Ziyaret</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-8 py-6">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
          <Suspense fallback={<FiltersFallback />}>
            <VisitFilters initialValues={pickInitialValues(params)} staff={staff} />
          </Suspense>

          <Suspense key={filterKey} fallback={<TableFallback />}>
            <VisitsContent searchParams={searchParams} />
          </Suspense>
        </div>
      </main>
    </DashboardShell>
  );
}
