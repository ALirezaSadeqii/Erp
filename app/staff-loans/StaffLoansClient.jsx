"use client";

import { useState, useTransition, useRef } from "react";
import { addStaffLoan, deleteStaffLoan } from "@/lib/actions";
import { formatCurrency, formatDate } from "@/lib/format";

/* ── Inline helpers ─────────────────────────────────────────────── */

function today() {
  return new Date().toISOString().slice(0, 10);
}

function StaffCard({ person }) {
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef(null);

  async function handleAdd(formData) {
    setError(null);
    startTransition(async () => {
      const result = await addStaffLoan(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        formRef.current?.reset();
        setShowForm(false);
      }
    });
  }

  async function handleDelete(loanId) {
    if (!confirm("Bu avans kaydını silmek istediğinize emin misiniz?")) return;
    startTransition(async () => {
      const result = await deleteStaffLoan(loanId);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Card Header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-slate-50"
        aria-expanded={open}
      >
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-sm font-bold text-white shadow">
            {person.name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{person.name}</p>
            {person.role && (
              <p className="text-xs text-slate-400">{person.role}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-xs text-slate-400">Sabit Maaş</p>
            <p className="text-sm font-semibold text-slate-600">
              {formatCurrency(person.fixedSalary)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Toplam Avans</p>
            <p
              className={`text-sm font-bold ${
                person.totalLoaned > 0 ? "text-rose-600" : "text-slate-400"
              }`}
            >
              {formatCurrency(person.totalLoaned)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                person.loans.length > 0
                  ? "bg-rose-100 text-rose-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {person.loans.length} avans
            </span>
            <svg
              className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                open ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </button>

      {/* Expandable body */}
      {open && (
        <div className="border-t border-slate-100 px-6 pb-6 pt-4">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Loan table */}
          {person.loans.length > 0 ? (
            <div className="mb-4 overflow-x-auto rounded-xl border border-slate-100">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Tarih
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Tutar
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      İşlem
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {person.loans.map((loan) => (
                    <tr key={loan.id} className="transition-colors hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {formatDate(loan.loan_date)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-rose-600">
                        {formatCurrency(loan.amount)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleDelete(loan.id)}
                          className="rounded-md px-2.5 py-1 text-xs font-medium text-rose-500 transition hover:bg-rose-50 hover:text-rose-700 disabled:opacity-40"
                        >
                          Sil
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                  <tr>
                    <td className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Toplam
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-extrabold text-rose-700">
                      {formatCurrency(person.totalLoaned)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p className="mb-4 text-sm text-slate-400">
              Bu personele henüz avans verilmemiş.
            </p>
          )}

          {/* Add loan toggle */}
          {!showForm ? (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 rounded-lg border border-dashed border-blue-300 px-4 py-2.5 text-sm font-medium text-blue-600 transition hover:border-blue-400 hover:bg-blue-50"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Avans Ekle
            </button>
          ) : (
            <form
              ref={formRef}
              action={handleAdd}
              className="flex flex-wrap items-end gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4"
            >
              <input type="hidden" name="staff_id" value={person.id} />

              <div className="flex flex-col gap-1">
                <label
                  htmlFor={`amount-${person.id}`}
                  className="text-xs font-semibold uppercase tracking-wider text-slate-500"
                >
                  Tutar (₺)
                </label>
                <input
                  id={`amount-${person.id}`}
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  className="w-36 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor={`date-${person.id}`}
                  className="text-xs font-semibold uppercase tracking-wider text-slate-500"
                >
                  Tarih
                </label>
                <input
                  id={`date-${person.id}`}
                  name="loan_date"
                  type="date"
                  defaultValue={today()}
                  required
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50"
                >
                  {isPending ? "Kaydediliyor…" : "Kaydet"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setError(null);
                  }}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                >
                  İptal
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main export ────────────────────────────────────────────────── */

export default function StaffLoansClient({ staff }) {
  return (
    <div className="flex flex-col gap-4">
      {staff.map((person) => (
        <StaffCard key={person.id} person={person} />
      ))}
    </div>
  );
}
