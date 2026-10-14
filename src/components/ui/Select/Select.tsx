import type { SelectHTMLAttributes } from "react";

interface SelectOption { value: string; label: string; }
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  error?: string;
}

export function Select({ label, options, error, required, id, ...props }: SelectProps) {
  const selectId = id ?? props.name;
  return (
    <label className="field" htmlFor={selectId}>
      <span className="field__label">{label}{required && <span className="field__required">*</span>}</span>
      <select id={selectId} className="field-control" required={required} {...props}>
        <option value="">请选择</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      {error && <span className="field__error">{error}</span>}
    </label>
  );
}
