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

const labelCls = "eyebrow block mb-1.5";
const inputCls =
  "bevel-sunken w-full px-3 py-2.5 text-sm text-ink placeholder:text-muted bg-surface-2 focus:outline-none focus:border-accent";

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
    <div className={className}>
      <label htmlFor={name} className={labelCls}>
        {label}
        {required && <span className="text-accent-dark ml-1">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        style={error ? { borderColor: "var(--err)" } : undefined}
        className={inputCls}
      />
      {hint && !error && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1.5 text-xs font-mono text-err">{error}</p>}
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
    <div className={className}>
      <label htmlFor={name} className={labelCls}>
        {label}
        {required && <span className="text-accent-dark ml-1">*</span>}
      </label>
      <select
        id={name}
        name={name}
        required={required}
        defaultValue={defaultValue}
        style={error ? { borderColor: "var(--err)" } : undefined}
        className={inputCls}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="mt-1.5 text-xs font-mono text-err">{error}</p>}
    </div>
  );
}
