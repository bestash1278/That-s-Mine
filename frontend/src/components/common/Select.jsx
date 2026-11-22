export default function Select({
  label,
  name,
  id,
  options,
  value,
  onChange,
  placeholder,
  required = false,
  error,
  helperText,
  className = '',
  labelClassName = 'text-text',
  ...props
}) {
  const inputId = id || name;
  const describedBy = error ? `${inputId}-error` : helperText ? `${inputId}-help` : undefined;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className={`block text-base font-medium mb-2 ${labelClassName}`}>
          {label}
          {required && (
            <>
              <span className="text-error ml-1" aria-hidden="true">*</span>
              <span className="text-sm text-sub ml-1">(필수)</span>
            </>
          )}
        </label>
      )}
      <select
        id={inputId}
        name={name}
        value={value}
        onChange={onChange}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        aria-required={required || undefined}
        className={`w-full min-h-[44px] px-3 py-2 text-base bg-white border rounded focus:outline-none focus:ring-2 focus:ring-primary ${
          error ? 'border-error' : 'border-gray-300'
        } ${className}`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options?.map((option) => (
          <option key={option.id ?? option.value} value={option.id ?? option.value}>
            {option.name ?? option.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${inputId}-error`} className="mt-1 text-sm text-error">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${inputId}-help`} className="mt-1 text-sm text-sub">
          {helperText}
        </p>
      )}
    </div>
  );
}
