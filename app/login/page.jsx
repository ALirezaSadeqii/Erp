"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/FormFields";
import { Button } from "@/components/ui/Button";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(
    async (_prevState, formData) => login(formData),
    null
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Oto Servis
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Yönetim Paneli</h1>
          <p className="mt-2 text-sm text-slate-500">Devam etmek için giriş yapın.</p>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <Input
            id="email"
            name="email"
            type="email"
            label="E-posta"
            placeholder="ornek@firma.com"
            autoComplete="email"
            required
          />
          <Input
            id="password"
            name="password"
            type="password"
            label="Şifre"
            autoComplete="current-password"
            required
          />

          {state?.error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {state.error}
            </div>
          )}

          <Button type="submit" disabled={isPending} className="mt-2 w-full">
            {isPending ? "Giriş yapılıyor..." : "Giriş Yap"}
          </Button>
        </form>
      </div>
    </div>
  );
}
