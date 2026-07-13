"use client";

import { useState, useEffect, useRef } from "react";

const STORAGE_KEY = "crm-visible-columns";

export function ColumnToggle({ columns, visibleKeys, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  /* close on outside click */
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /* group columns by category */
  const groups = {};
  columns.forEach((col) => {
    const g = col.group ?? "Diğer";
    if (!groups[g]) groups[g] = [];
    groups[g].push(col);
  });

  function toggle(key) {
    const next = visibleKeys.includes(key)
      ? visibleKeys.filter((k) => k !== key)
      : [...visibleKeys, key];
    onChange(next);
  }

  function selectAll() {
    onChange(columns.map((c) => c.key));
  }

  function resetDefaults() {
    onChange(columns.filter((c) => c.defaultVisible).map((c) => c.key));
  }

  const visibleCount = visibleKeys.length;
  const totalCount = columns.length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
      >
        <svg
          className="h-4 w-4 text-slate-500"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75"
          />
        </svg>
        Sütunlar
        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-500">
          {visibleCount}/{totalCount}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
          {/* Header buttons */}
          <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Görünür Sütunlar
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
              >
                Tümü
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={resetDefaults}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
              >
                Varsayılan
              </button>
            </div>
          </div>

          {/* Grouped checkboxes */}
          <div className="max-h-80 space-y-3 overflow-y-auto">
            {Object.entries(groups).map(([groupName, cols]) => (
              <div key={groupName}>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {groupName}
                </p>
                <div className="space-y-1">
                  {cols.map((col) => {
                    const checked = visibleKeys.includes(col.key);
                    return (
                      <label
                        key={col.key}
                        className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(col.key)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-slate-700">
                          {col.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* Hook to manage visible columns with localStorage persistence */
export function useColumnVisibility(columns) {
  const defaultKeys = columns.filter((c) => c.defaultVisible).map((c) => c.key);

  const [visibleKeys, setVisibleKeys] = useState(defaultKeys);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        /* only keep keys that still exist in columns config */
        const valid = parsed.filter((k) => columns.some((c) => c.key === k));
        if (valid.length > 0) {
          setVisibleKeys(valid);
        }
      }
    } catch {
      /* ignore parse errors */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleKeys));
    }
  }, [visibleKeys, loaded]);

  return { visibleKeys, setVisibleKeys, loaded };
}
