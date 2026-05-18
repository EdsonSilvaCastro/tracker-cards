export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  type = 'button',
  ...props
}) {
  const base = 'inline-flex items-center justify-center font-medium border-2 border-black transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2';

  const variants = {
    primary:   'bg-(--color-primary) text-black shadow-[3px_3px_0_0_#000] hover:shadow-[1px_1px_0_0_#000] hover:translate-y-0.5 hover:translate-x-0.5 active:shadow-none active:translate-y-1',
    secondary: 'bg-black text-(--color-primary) shadow-[3px_3px_0_0_#ffdb33] hover:shadow-[1px_1px_0_0_#ffdb33] hover:translate-y-0.5 active:shadow-none active:translate-y-1',
    danger:    'bg-(--color-destructive) text-white shadow-[3px_3px_0_0_#000] hover:shadow-[1px_1px_0_0_#000] hover:translate-y-0.5 active:shadow-none active:translate-y-1',
    outline:   'bg-white text-black shadow-[3px_3px_0_0_#000] hover:shadow-[1px_1px_0_0_#000] hover:translate-y-0.5 active:shadow-none',
    ghost:     'bg-transparent border-transparent text-black hover:bg-(--color-accent)',
  };

  const sizes = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-1.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      type={type}
      disabled={disabled}
      className={`${base} ${variants[variant] ?? variants.primary} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
