"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase";

function parseVisitFormData(formData) {
  const servicesJson = formData.get("services")?.toString();
  let services = [];

  try {
    services = JSON.parse(servicesJson || "[]");
  } catch {
    return { error: "Hizmet verileri geçersiz." };
  }

  const data = {
    customerName: formData.get("customerName")?.toString().trim(),
    customerPhone: formData.get("customerPhone")?.toString().trim(),
    companyName: formData.get("companyName")?.toString().trim() || null,
    licensePlate: formData.get("licensePlate")?.toString().trim().toUpperCase(),
    vehicleType: formData.get("vehicleType")?.toString().trim() || null,
    model: formData.get("model")?.toString().trim() || null,
    color: formData.get("color")?.toString().trim() || null,
    vin: formData.get("vin")?.toString().trim() || null,
    entryDate: formData.get("entryDate")?.toString(),
    exitDate: formData.get("exitDate")?.toString() || null,
    totalAmount: parseFloat(formData.get("totalAmount")?.toString() || "0"),
    paymentMethod: formData.get("paymentMethod")?.toString() || null,
    paintedPartsCount: parseFloat(formData.get("paintedPartsCount")?.toString() || "0"),
    bodyworkPartsCount: parseFloat(formData.get("bodyworkPartsCount")?.toString() || "0"),
    requiresChassisAlignment: formData.get("requiresChassisAlignment") === "on",
    insurance: formData.get("insurance")?.toString().trim() || null,
    vehicleExpense: parseFloat(formData.get("vehicleExpense")?.toString() || "0"),
    notes: formData.get("notes")?.toString().trim() || null,
    services: services.filter((s) => s.service_type),
  };

  if (!data.customerName || !data.customerPhone) {
    return { error: "Müşteri adı ve telefon zorunludur." };
  }

  if (!data.licensePlate) {
    return { error: "Plaka zorunludur." };
  }

  if (!data.entryDate) {
    return { error: "Giriş tarihi zorunludur." };
  }

  return { data };
}

async function upsertCustomerAndCar(supabase, data) {
  let customerId;

  const { data: existingCustomer } = await supabase
    .from("customers")
    .select("id")
    .eq("phone", data.customerPhone)
    .maybeSingle();

  if (existingCustomer) {
    customerId = existingCustomer.id;

    await supabase
      .from("customers")
      .update({ name: data.customerName, company_name: data.companyName })
      .eq("id", customerId);
  } else {
    const { data: newCustomer, error: customerError } = await supabase
      .from("customers")
      .insert({
        name: data.customerName,
        phone: data.customerPhone,
        company_name: data.companyName,
      })
      .select("id")
      .single();

    if (customerError) {
      return { error: `Müşteri oluşturulamadı: ${customerError.message}` };
    }

    customerId = newCustomer.id;
  }

  let carId;

  const { data: existingCar } = await supabase
    .from("cars")
    .select("id")
    .eq("license_plate", data.licensePlate)
    .maybeSingle();

  if (existingCar) {
    carId = existingCar.id;

    await supabase
      .from("cars")
      .update({
        customer_id: customerId,
        vehicle_type: data.vehicleType,
        model: data.model,
        color: data.color,
        vin: data.vin,
      })
      .eq("id", carId);
  } else {
    const { data: newCar, error: carError } = await supabase
      .from("cars")
      .insert({
        customer_id: customerId,
        license_plate: data.licensePlate,
        vehicle_type: data.vehicleType,
        model: data.model,
        color: data.color,
        vin: data.vin,
      })
      .select("id")
      .single();

    if (carError) {
      return { error: `Araç oluşturulamadı: ${carError.message}` };
    }

    carId = newCar.id;
  }

  return { customerId, carId };
}

async function saveServices(supabase, visitId, services) {
  const { error: deleteError } = await supabase
    .from("services")
    .delete()
    .eq("visit_id", visitId);

  if (deleteError) {
    return { error: `Mevcut hizmetler silinemedi: ${deleteError.message}` };
  }

  if (services.length === 0) {
    return {};
  }

  const serviceRows = services.map((s) => ({
    visit_id: visitId,
    service_type: s.service_type,
    staff_id: s.staff_id || null,
    price: parseFloat(s.price) || 0,
    notes: s.notes || null,
  }));

  const { error: servicesError } = await supabase.from("services").insert(serviceRows);

  if (servicesError) {
    return { error: `Hizmetler kaydedilemedi: ${servicesError.message}` };
  }

  return {};
}

function revalidateVisitPaths(visitId, carId) {
  revalidatePath("/dashboard");
  revalidatePath(`/visits/${visitId}`);
  revalidatePath(`/visits/${visitId}/edit`);
  if (carId) {
    revalidatePath(`/cars/${carId}`);
  }
}

export async function createVisit(formData) {
  const parsed = parseVisitFormData(formData);
  if (parsed.error) return { error: parsed.error };

  const supabase = await createClient();
  const { data } = parsed;

  const upsertResult = await upsertCustomerAndCar(supabase, data);
  if (upsertResult.error) return { error: upsertResult.error };

  const { carId } = upsertResult;

  const { data: visit, error: visitError } = await supabase
    .from("visits")
    .insert({
      car_id: carId,
      entry_date: data.entryDate,
      exit_date: data.exitDate,
      total_amount: data.totalAmount,
      payment_method: data.paymentMethod,
      painted_parts_count: data.paintedPartsCount,
      bodywork_parts_count: data.bodyworkPartsCount,
      requires_chassis_alignment: data.requiresChassisAlignment,
      insurance: data.insurance,
      vehicle_expense: data.vehicleExpense,
      notes: data.notes,
    })
    .select("id")
    .single();

  if (visitError) {
    return { error: `Ziyaret oluşturulamadı: ${visitError.message}` };
  }

  const servicesResult = await saveServices(supabase, visit.id, data.services);
  if (servicesResult.error) return { error: servicesResult.error };

  revalidateVisitPaths(visit.id, carId);
  redirect(`/visits/${visit.id}`);
}

export async function updateVisit(formData) {
  const visitId = formData.get("visitId")?.toString();
  if (!visitId) {
    return { error: "Ziyaret ID gerekli." };
  }

  const parsed = parseVisitFormData(formData);
  if (parsed.error) return { error: parsed.error };

  const supabase = await createClient();
  const { data } = parsed;

  const { data: existingVisit, error: fetchError } = await supabase
    .from("visits")
    .select("id, car_id")
    .eq("id", visitId)
    .single();

  if (fetchError || !existingVisit) {
    return { error: "Ziyaret bulunamadı." };
  }

  const upsertResult = await upsertCustomerAndCar(supabase, data);
  if (upsertResult.error) return { error: upsertResult.error };

  const { carId } = upsertResult;

  const { error: visitError } = await supabase
    .from("visits")
    .update({
      car_id: carId,
      entry_date: data.entryDate,
      exit_date: data.exitDate,
      total_amount: data.totalAmount,
      payment_method: data.paymentMethod,
      painted_parts_count: data.paintedPartsCount,
      bodywork_parts_count: data.bodyworkPartsCount,
      requires_chassis_alignment: data.requiresChassisAlignment,
      insurance: data.insurance,
      vehicle_expense: data.vehicleExpense,
      notes: data.notes,
    })
    .eq("id", visitId);

  if (visitError) {
    return { error: `Ziyaret güncellenemedi: ${visitError.message}` };
  }

  const servicesResult = await saveServices(supabase, visitId, data.services);
  if (servicesResult.error) return { error: servicesResult.error };

  revalidateVisitPaths(visitId, carId);
  if (existingVisit.car_id !== carId) {
    revalidatePath(`/cars/${existingVisit.car_id}`);
  }

  redirect(`/visits/${visitId}`);
}

export async function deleteVisit(visitId) {
  if (!visitId) {
    return { error: "Ziyaret ID gerekli." };
  }

  const supabase = await createClient();

  // Get car_id for revalidation before deleting
  const { data: visit, error: fetchError } = await supabase
    .from("visits")
    .select("car_id")
    .eq("id", visitId)
    .single();

  if (fetchError || !visit) {
    return { error: "Ziyaret bulunamadı." };
  }

  const { error: deleteError } = await supabase
    .from("visits")
    .delete()
    .eq("id", visitId);

  if (deleteError) {
    return { error: `Ziyaret silinemedi: ${deleteError.message}` };
  }

  revalidateVisitPaths(visitId, visit.car_id);
  redirect("/dashboard");
}

/* ── Staff Loan Actions ──────────────────────────────────────────── */

export async function addStaffLoan(formData) {
  const staffId = formData.get("staff_id")?.toString();
  const amount = parseFloat(formData.get("amount")?.toString() || "0");
  const loanDate = formData.get("loan_date")?.toString();

  if (!staffId) return { error: "Personel seçimi zorunludur." };
  if (!amount || amount <= 0) return { error: "Geçerli bir tutar giriniz." };
  if (!loanDate) return { error: "Tarih zorunludur." };

  const supabase = await createClient();

  const { error } = await supabase.from("staff_loans").insert({
    staff_id: staffId,
    amount,
    loan_date: loanDate,
  });

  if (error) {
    return { error: `Avans kaydedilemedi: ${error.message}` };
  }

  revalidatePath("/staff-loans");
  return { success: true };
}

export async function deleteStaffLoan(loanId) {
  if (!loanId) return { error: "Avans ID gerekli." };

  const supabase = await createClient();

  const { error } = await supabase
    .from("staff_loans")
    .delete()
    .eq("id", loanId);

  if (error) {
    return { error: `Avans silinemedi: ${error.message}` };
  }

  revalidatePath("/staff-loans");
  return { success: true };
}
