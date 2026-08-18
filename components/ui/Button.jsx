export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}) {
  const variants = {
    primary:
      "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm disabled:opacity-60",
    secondary:
      "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-60",
    danger:
      "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-60",
    red:
      "bg-red-600 text-white hover:bg-red-700 shadow-sm disabled:opacity-60",
    amber:
      "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-semibold hover:from-amber-400 hover:to-amber-500 shadow-md shadow-amber-500/20 active:scale-[0.99] disabled:opacity-60",
  };

  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
