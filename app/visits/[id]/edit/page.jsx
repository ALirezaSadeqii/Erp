import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/ui/DashboardShell";
import { VisitForm } from "@/components/form/VisitForm";
import { getVisitById, getStaffList } from "@/lib/queries";

export default async function EditVisitPage({ params }) {
  const { id } = await params;
  const [{ visit, error }, { staff }] = await Promise.all([
    getVisitById(id),
    getStaffList(),
  ]);

  if (error || !visit) {
    notFound();
  }

  const car = visit.cars;

  return (
    <DashboardShell>
      <header className="border-b border-slate-200 bg-white px-8 py-6">
        <p className="text-sm text-slate-500">
          <Link href="/dashboard" className="hover:text-blue-600">
            Panel
          </Link>
          {" / "}
          <Link href={`/visits/${id}`} className="hover:text-blue-600">
            Ziyaret Detayı
          </Link>
          {" / Düzenle"}
        </p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">Ziyareti Düzenle</h2>
        <p className="mt-1 text-sm text-slate-500">
          {car?.license_plate} — eksik bilgileri daha sonra tamamlayabilirsiniz.
        </p>
      </header>

      <main className="flex-1 overflow-y-auto px-8 py-6">
        <div className="mx-auto max-w-5xl">
          <VisitForm staff={staff} visit={visit} />
        </div>
      </main>
    </DashboardShell>
  );
}
