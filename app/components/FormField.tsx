interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  error?: string;
  hint?: string;
  autoComplete?: string;
  className?: string;
}

export function FormField({
  label,
  name,
  type = "text",
  placeholder,
  required,
  defaultValue,
  error,
  hint,
  autoComplete,
  className = "",
}: FormFieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={name} className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-sky-500 ml-0.5">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        className={`
          w-full px-4 py-2.5 rounded-xl border text-slate-800 text-sm
          bg-white/80 placeholder-slate-400
          focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:border-sky-400
          transition-all
          ${error ? "border-red-300 bg-red-50/40" : "border-sky-200"}
        `}
      />
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

interface SelectFieldProps {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  required?: boolean;
  error?: string;
  className?: string;
}

export function SelectField({ label, name, options, defaultValue, required, error, className = "" }: SelectFieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={name} className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-sky-500 ml-0.5">*</span>}
      </label>
      <select
        id={name}
        name={name}
        required={required}
        defaultValue={defaultValue}
        className={`
          w-full px-4 py-2.5 rounded-xl border text-slate-800 text-sm bg-white/80
          focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:border-sky-400
          transition-all
          ${error ? "border-red-300" : "border-sky-200"}
        `}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
