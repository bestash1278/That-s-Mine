export default function Input({
  label,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  required = false,
  helperText,
  className = '',
  ...props
}) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={name} className="block text-base font-medium text-text mb-2">
          {label}
          {required && <span className="text-error ml-1">*</span>}
          {required && <span className="text-sm text-sub ml-1">(필수)</span>}
        </label>
      )}
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`w-full px-3 py-2 text-base border rounded focus:outline-none focus:ring-2 focus:ring-primary ${
          error ? 'border-error' : 'border-gray-300'
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-error">{error}</p>}
      {helperText && !error && <p className="mt-1 text-sm text-sub">{helperText}</p>}
    </div>
  );
}
