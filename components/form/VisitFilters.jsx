"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { Input, Select } from "@/components/ui/FormFields";
import { Button } from "@/components/ui/Button";
import { SERVICE_TYPES, PAYMENT_METHODS } from "@/config/constants";

const FILTER_KEYS = [
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

const STATUS_OPTIONS = [
  { value: "active", label: "Devam ediyor" },
  { value: "completed", label: "Tamamlandı" },
];

const CHASSIS_OPTIONS = [
  { value: "true", label: "Evet" },
  { value: "false", label: "Hayır" },
];

export function VisitFilters({ initialValues = {}, staff = [] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(() =>
    FILTER_KEYS.some((key) => key !== "q" && initialValues[key])
  );

  const staffOptions = staff.map((s) => ({
    value: s.id,
    label: `${s.name}${s.role ? ` (${s.role})` : ""}`,
  }));

  const updateParams = useCallback(
    (updates) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });

      startTransition(() => {
        router.push(`/dashboard?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const updates = {};

    FILTER_KEYS.forEach((key) => {
      updates[key] = formData.get(key)?.toString().trim() ?? "";
    });

    updateParams(updates);
  };

  const handleReset = () => {
    startTransition(() => {
      router.push("/dashboard");
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Input
          id="search"
          name="q"
          label="Genel Ara"
          placeholder="Plaka, müşteri, telefon, firma..."
          defaultValue={initialValues.q ?? ""}
        />
        <Input
          id="licensePlate"
          name="licensePlate"
          label="Plaka"
          placeholder="34 ABC 123"
          defaultValue={initialValues.licensePlate ?? ""}
        />
        <Input
          id="customerName"
          name="customerName"
          label="Müşteri Adı"
          defaultValue={initialValues.customerName ?? ""}
        />
        <Input
          id="phone"
          name="phone"
          label="Telefon"
          defaultValue={initialValues.phone ?? ""}
        />
      </div>

      {expanded && (
        <>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Input
              id="companyName"
              name="companyName"
              label="Firma Adı"
              defaultValue={initialValues.companyName ?? ""}
            />
            <Input
              id="vehicleType"
              name="vehicleType"
              label="Araç Tipi"
              defaultValue={initialValues.vehicleType ?? ""}
            />
            <Input
              id="model"
              name="model"
              label="Model"
              defaultValue={initialValues.model ?? ""}
            />
            <Input
              id="color"
              name="color"
              label="Renk"
              defaultValue={initialValues.color ?? ""}
            />
            <Input
              id="vin"
              name="vin"
              label="Şasi No (VIN)"
              defaultValue={initialValues.vin ?? ""}
            />
            <Input
              id="dateFrom"
              name="dateFrom"
              type="date"
              label="Giriş Başlangıç"
              defaultValue={initialValues.dateFrom ?? ""}
            />
            <Input
              id="dateTo"
              name="dateTo"
              type="date"
              label="Giriş Bitiş"
              defaultValue={initialValues.dateTo ?? ""}
            />
            <Input
              id="exitDateFrom"
              name="exitDateFrom"
              type="date"
              label="Çıkış Başlangıç"
              defaultValue={initialValues.exitDateFrom ?? ""}
            />
            <Input
              id="exitDateTo"
              name="exitDateTo"
              type="date"
              label="Çıkış Bitiş"
              defaultValue={initialValues.exitDateTo ?? ""}
            />
            <Select
              id="status"
              name="status"
              label="Durum"
              placeholder="Tümü"
              options={STATUS_OPTIONS}
              defaultValue={initialValues.status ?? ""}
            />
            <Select
              id="serviceType"
              name="serviceType"
              label="Hizmet Türü"
              placeholder="Tüm hizmetler"
              options={SERVICE_TYPES}
              defaultValue={initialValues.serviceType ?? ""}
            />
            <Select
              id="staffId"
              name="staffId"
              label="Personel"
              placeholder="Tüm personel"
              options={staffOptions}
              defaultValue={initialValues.staffId ?? ""}
            />
            <Select
              id="paymentMethod"
              name="paymentMethod"
              label="Ödeme Yöntemi"
              placeholder="Tümü"
              options={PAYMENT_METHODS}
              defaultValue={initialValues.paymentMethod ?? ""}
            />
            <Select
              id="requiresChassisAlignment"
              name="requiresChassisAlignment"
              label="Şasi Hizalama"
              placeholder="Tümü"
              options={CHASSIS_OPTIONS}
              defaultValue={initialValues.requiresChassisAlignment ?? ""}
            />
            <Input
              id="minAmount"
              name="minAmount"
              type="number"
              step="0.01"
              min="0"
              label="Min Tutar (₺)"
              defaultValue={initialValues.minAmount ?? ""}
            />
            <Input
              id="maxAmount"
              name="maxAmount"
              type="number"
              step="0.01"
              min="0"
              label="Max Tutar (₺)"
              defaultValue={initialValues.maxAmount ?? ""}
            />
            <Input
              id="minPaintedParts"
              name="minPaintedParts"
              type="number"
              min="0"
              label="Min Boyalı Parça"
              defaultValue={initialValues.minPaintedParts ?? ""}
            />
            <Input
              id="minBodyworkParts"
              name="minBodyworkParts"
              type="number"
              min="0"
              label="Min Kaporta Parça"
              defaultValue={initialValues.minBodyworkParts ?? ""}
            />
            <Input
              id="notes"
              name="notes"
              label="Notlar"
              placeholder="Not içeriğinde ara..."
              defaultValue={initialValues.notes ?? ""}
            />
            <Input
              id="insurance"
              name="insurance"
              label="Sigorta"
              placeholder="Sigorta şirketi ara..."
              defaultValue={initialValues.insurance ?? ""}
            />
            <Input
              id="minVehicleExpense"
              name="minVehicleExpense"
              type="number"
              step="0.01"
              min="0"
              label="Min Araç Gideri (₺)"
              defaultValue={initialValues.minVehicleExpense ?? ""}
            />
            <Input
              id="maxVehicleExpense"
              name="maxVehicleExpense"
              type="number"
              step="0.01"
              min="0"
              label="Max Araç Gideri (₺)"
              defaultValue={initialValues.maxVehicleExpense ?? ""}
            />
          </div>
        </>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Filtreleniyor..." : "Filtrele"}
        </Button>
        <Button type="button" variant="secondary" onClick={handleReset} disabled={isPending}>
          Temizle
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? "Daha Az Filtre" : "Tüm Filtreler"}
        </Button>
      </div>
    </form>
  );
}
