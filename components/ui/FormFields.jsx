const fieldClass =
  "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

function FieldWrapper({ label, id, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      {children}
    </div>
  );
}

export function Input({ label, id, className = "", ...props }) {
  return (
    <FieldWrapper label={label} id={id}>
      <input id={id} className={`${fieldClass} ${className}`} {...props} />
    </FieldWrapper>
  );
}

export function Select({
  label,
  id,
  options = [],
  placeholder = "Seçiniz",
  className = "",
  ...props
}) {
  return (
    <FieldWrapper label={label} id={id}>
      <select id={id} className={`${fieldClass} ${className}`} {...props}>
        <option value="">{placeholder}</option>
        {options.map(({ value, label: optionLabel }) => (
          <option key={value} value={value}>
            {optionLabel}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
}

export function Textarea({ label, id, className = "", ...props }) {
  return (
    <FieldWrapper label={label} id={id}>
      <textarea
        id={id}
        rows={3}
        className={`${fieldClass} ${className}`}
        {...props}
      />
    </FieldWrapper>
  );
}
