export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}) {
  const variants = {
    primary:
      "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60",
    secondary:
      "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-60",
    danger:
      "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-60",
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
