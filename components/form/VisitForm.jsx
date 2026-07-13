"use client";

import { useState } from "react";
import { createVisit, updateVisit } from "@/lib/actions";
import { Input, Select, Textarea } from "@/components/ui/FormFields";
import { Button } from "@/components/ui/Button";
import { InfoCard } from "@/components/ui/Card";
import { SERVICE_TYPES, PAYMENT_METHODS } from "@/config/constants";

const emptyService = { service_type: "", staff_id: "", price: "", notes: "" };

function mapVisitToFormDefaults(visit) {
  const car = visit?.cars;
  const customer = car?.customers;

  return {
    customerName: customer?.name ?? "",
    customerPhone: customer?.phone ?? "",
    companyName: customer?.company_name ?? "",
    licensePlate: car?.license_plate ?? "",
    vehicleType: car?.vehicle_type ?? "",
    model: car?.model ?? "",
    color: car?.color ?? "",
    vin: car?.vin ?? "",
    entryDate: visit?.entry_date ?? "",
    exitDate: visit?.exit_date ?? "",
    totalAmount: visit?.total_amount?.toString() ?? "",
    paymentMethod: visit?.payment_method ?? "",
    paintedPartsCount: visit?.painted_parts_count?.toString() ?? "0",
    bodyworkPartsCount: visit?.bodywork_parts_count?.toString() ?? "0",
    requiresChassisAlignment: visit?.requires_chassis_alignment ?? false,
    insurance: visit?.insurance ?? "",
    vehicleExpense: visit?.vehicle_expense?.toString() ?? "0",
    notes: visit?.notes ?? "",
    services:
      visit?.services?.length > 0
        ? visit.services.map((s) => ({
            service_type: s.service_type ?? "",
            staff_id: s.staff_id ?? s.staff?.id ?? "",
            price: s.price?.toString() ?? "",
            notes: s.notes ?? "",
          }))
        : [{ ...emptyService }],
  };
}

export function VisitForm({ staff = [], visit = null }) {
  const isEdit = Boolean(visit?.id);
  const defaults = isEdit ? mapVisitToFormDefaults(visit) : null;

  const [services, setServices] = useState(
    defaults?.services ?? [{ ...emptyService }]
  );
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const staffOptions = staff.map((s) => ({
    value: s.id,
    label: `${s.name}${s.role ? ` (${s.role})` : ""}`,
  }));

  const addService = () => setServices((prev) => [...prev, { ...emptyService }]);

  const removeService = (index) => {
    setServices((prev) => prev.filter((_, i) => i !== index));
  };

  const updateService = (index, field, value) => {
    setServices((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    formData.set("services", JSON.stringify(services));

    const result = isEdit ? await updateVisit(formData) : await createVisit(formData);

    if (result?.error) {
      setError(result.error);
      setIsSubmitting(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {isEdit && <input type="hidden" name="visitId" value={visit.id} />}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <InfoCard title="Müşteri Bilgileri">
        <div className="grid gap-4 md:grid-cols-3">
          <Input
            id="customerName"
            name="customerName"
            label="Müşteri Adı"
            required
            placeholder="Ad Soyad"
            defaultValue={defaults?.customerName}
          />
          <Input
            id="customerPhone"
            name="customerPhone"
            label="Telefon"
            required
            placeholder="05xx xxx xx xx"
            defaultValue={defaults?.customerPhone}
          />
          <Input
            id="companyName"
            name="companyName"
            label="Firma Adı"
            placeholder="Opsiyonel"
            defaultValue={defaults?.companyName}
          />
        </div>
      </InfoCard>

      <InfoCard title="Araç Bilgileri">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Input
            id="licensePlate"
            name="licensePlate"
            label="Plaka"
            required
            placeholder="34 ABC 123"
            defaultValue={defaults?.licensePlate}
          />
          <Input
            id="vehicleType"
            name="vehicleType"
            label="Araç Tipi"
            placeholder="Binek, Ticari..."
            defaultValue={defaults?.vehicleType}
          />
          <Input
            id="model"
            name="model"
            label="Model"
            placeholder="Toyota Corolla"
            defaultValue={defaults?.model}
          />
          <Input
            id="color"
            name="color"
            label="Renk"
            placeholder="Beyaz"
            defaultValue={defaults?.color}
          />
          <Input
            id="vin"
            name="vin"
            label="Şasi No (VIN)"
            placeholder="Opsiyonel"
            defaultValue={defaults?.vin}
          />
        </div>
      </InfoCard>

      <InfoCard title="Ziyaret Bilgileri">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Input
            id="entryDate"
            name="entryDate"
            type="date"
            label="Giriş Tarihi"
            required
            defaultValue={defaults?.entryDate ?? today}
          />
          <Input
            id="exitDate"
            name="exitDate"
            type="date"
            label="Çıkış Tarihi"
            defaultValue={defaults?.exitDate ?? ""}
          />
          <Input
            id="totalAmount"
            name="totalAmount"
            type="number"
            step="0.01"
            min="0"
            label="Toplam Tutar (₺)"
            placeholder="0.00"
            defaultValue={defaults?.totalAmount}
          />
          <Select
            id="paymentMethod"
            name="paymentMethod"
            label="Ödeme Yöntemi"
            placeholder="Seçiniz"
            options={PAYMENT_METHODS}
            defaultValue={defaults?.paymentMethod}
          />
          <Input
            id="paintedPartsCount"
            name="paintedPartsCount"
            type="number"
            min="0"
            label="Boyalı Parça Sayısı"
            defaultValue={defaults?.paintedPartsCount ?? "0"}
          />
          <Input
            id="bodyworkPartsCount"
            name="bodyworkPartsCount"
            type="number"
            min="0"
            label="Kaporta Parça Sayısı"
            defaultValue={defaults?.bodyworkPartsCount ?? "0"}
          />
          <Input
            id="insurance"
            name="insurance"
            label="Sigorta"
            placeholder="Sigorta şirketi / poliçe no"
            defaultValue={defaults?.insurance}
          />
          <Input
            id="vehicleExpense"
            name="vehicleExpense"
            type="number"
            step="0.01"
            min="0"
            label="Araç Gideri (₺)"
            placeholder="0.00"
            defaultValue={defaults?.vehicleExpense ?? "0"}
          />
        </div>

        <div className="mt-4 flex items-center gap-2">
          <input
            id="requiresChassisAlignment"
            name="requiresChassisAlignment"
            type="checkbox"
            defaultChecked={defaults?.requiresChassisAlignment}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="requiresChassisAlignment" className="text-sm text-slate-700">
            Şasi hizalama gerekiyor
          </label>
        </div>

        <div className="mt-4">
          <Textarea
            id="notes"
            name="notes"
            label="Notlar"
            placeholder="Ek notlar..."
            defaultValue={defaults?.notes}
          />
        </div>
      </InfoCard>

      <InfoCard title="Hizmetler">
        <div className="space-y-4">
          {services.map((service, index) => (
            <div
              key={index}
              className="grid gap-4 rounded-lg border border-slate-100 bg-slate-50 p-4 md:grid-cols-4"
            >
              <Select
                id={`serviceType-${index}`}
                label="Hizmet Türü"
                placeholder="Seçiniz"
                options={SERVICE_TYPES}
                value={service.service_type}
                onChange={(e) => updateService(index, "service_type", e.target.value)}
              />
              <Select
                id={`staffId-${index}`}
                label="Personel"
                placeholder="Seçiniz"
                options={staffOptions}
                value={service.staff_id}
                onChange={(e) => updateService(index, "staff_id", e.target.value)}
              />
              <Input
                id={`price-${index}`}
                type="number"
                step="0.01"
                min="0"
                label="Fiyat (₺)"
                placeholder="0.00"
                value={service.price}
                onChange={(e) => updateService(index, "price", e.target.value)}
              />
              <div className="flex flex-col gap-1.5">
                <Input
                  id={`serviceNotes-${index}`}
                  label="Hizmet Notu"
                  placeholder="Opsiyonel"
                  value={service.notes}
                  onChange={(e) => updateService(index, "notes", e.target.value)}
                />
                {services.length > 1 && (
                  <Button
                    type="button"
                    variant="danger"
                    className="mt-auto"
                    onClick={() => removeService(index)}
                  >
                    Kaldır
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <Button type="button" variant="secondary" className="mt-4" onClick={addService}>
          + Hizmet Ekle
        </Button>
      </InfoCard>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? "Kaydediliyor..."
            : isEdit
              ? "Değişiklikleri Kaydet"
              : "Ziyareti Kaydet"}
        </Button>
      </div>
    </form>
  );
}
