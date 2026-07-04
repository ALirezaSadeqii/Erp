import { DashboardShell } from "@/components/ui/DashboardShell";
import { VisitForm } from "@/components/form/VisitForm";
import { getStaffList } from "@/lib/queries";

export default async function NewVisitPage() {
  const { staff } = await getStaffList();

  return (
    <DashboardShell>
      <header className="border-b border-slate-200 bg-white px-8 py-6">
        <h2 className="text-2xl font-bold text-slate-900">Yeni Ziyaret</h2>
        <p className="mt-1 text-sm text-slate-500">
          Müşteri, araç ve hizmet bilgilerini girerek yeni kayıt oluşturun.
        </p>
      </header>

      <main className="flex-1 overflow-y-auto px-8 py-6">
        <div className="mx-auto max-w-5xl">
          <VisitForm staff={staff} />
        </div>
      </main>
    </DashboardShell>
  );
}
