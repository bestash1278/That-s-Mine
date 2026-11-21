export default function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  children,
  onClick,
  className = '',
  ...props
}) {
  const baseStyles = 'font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] flex items-center justify-center';

  const variants = {
    primary: 'bg-primary text-white hover:bg-blue-900',
    secondary: 'bg-gray-200 text-text hover:bg-gray-300',
    outline: 'border-2 border-primary text-primary hover:bg-blue-50',
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}
