/**
 * 공통 입력창. label은 항상 보이게 두고 placeholder는 예시로만 쓴다.
 * multiline이면 textarea로 그린다.
 */
export default function Input({
  label,
  name,
  id,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  required = false,
  helperText,
  multiline = false,
  rows = 3,
  className = '',
  ...props
}) {
  const inputId = id || name;
  const describedBy = error ? `${inputId}-error` : helperText ? `${inputId}-help` : undefined;
  const fieldClass = `w-full min-h-[44px] px-3 py-2 text-base bg-white border rounded focus:outline-none focus:ring-2 focus:ring-primary ${
    error ? 'border-error' : 'border-gray-300'
  } ${className}`;

  const common = {
    id: inputId,
    name,
    placeholder,
    value,
    onChange,
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': describedBy,
    'aria-required': required || undefined,
    className: fieldClass,
    ...props,
  };

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-base font-medium text-text mb-2">
          {label}
          {required && (
            <>
              <span className="text-error ml-1" aria-hidden="true">*</span>
              <span className="text-sm text-sub ml-1">(필수)</span>
            </>
          )}
        </label>
      )}
      {multiline ? <textarea rows={rows} {...common} /> : <input type={type} {...common} />}
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
