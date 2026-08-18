"use client";

import { useActionState } from "react";
import Image from "next/image";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(
    async (_prevState, formData) => login(formData),
    null
  );

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-12 selection:bg-amber-500 selection:text-slate-950">
      {/* Background ambient lighting effects */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-amber-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-slate-800/20 blur-[120px]" />

      {/* Login Card */}
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800/90 bg-slate-900/80 p-8 shadow-2xl shadow-black/80 backdrop-blur-xl sm:p-10">
        {/* Top subtle highlight line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

        {/* Logo & Header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="relative mb-5 h-20 w-44 overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60 p-2 shadow-inner">
            <Image
              src="/altik-logo.jpg"
              alt="Altik Auto Service"
              fill
              className="object-contain p-1"
              priority
            />
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            Premium Auto Care
          </div>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-white">
            Yönetim Paneli
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Devam etmek için yetkili hesabınızla giriş yapın
          </p>
        </div>

        {/* Login Form */}
        <form action={formAction} autoComplete="on" className="flex flex-col gap-4">
          {/* Email field */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-xs font-semibold uppercase tracking-wider text-slate-300"
            >
              E-posta
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="ornek@firma.com"
                className="w-full rounded-xl border border-slate-700/80 bg-slate-950/60 py-2.5 pr-3.5 pl-10 text-sm text-slate-100 placeholder-slate-500 shadow-inner transition-all duration-200 focus:border-amber-500 focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-xs font-semibold uppercase tracking-wider text-slate-300"
            >
              Şifre
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-700/80 bg-slate-950/60 py-2.5 pr-3.5 pl-10 text-sm text-slate-100 placeholder-slate-500 shadow-inner transition-all duration-200 focus:border-amber-500 focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center justify-between py-0.5">
            <label htmlFor="rememberMe" className="group flex cursor-pointer items-center gap-2.5 select-none">
              <input
                id="rememberMe"
                name="rememberMe"
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-slate-700 bg-slate-950/80 accent-amber-500 transition focus:ring-amber-500/20 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-xs font-medium text-slate-400 transition-colors group-hover:text-slate-200">
                Beni hatırla
              </span>
            </label>
          </div>

          {/* Error Message */}
          {state?.error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mt-0.5 h-4 w-4 shrink-0"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{state.error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isPending}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-500/20 transition-all duration-200 hover:from-amber-400 hover:to-amber-500 hover:shadow-amber-500/30 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin text-slate-950"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Giriş yapılıyor...</span>
              </>
            ) : (
              <>
                <span>Giriş Yap</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        </form>

        {/* Footer Security Badge */}
        <div className="mt-8 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-500">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5 text-amber-500/70"
          >
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>Güvenli Yönetim Portalı • Sadece Yetkili Erişim</span>
        </div>
      </div>
    </div>
  );
}
