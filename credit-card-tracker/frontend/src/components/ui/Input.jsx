import { forwardRef } from 'react';

export const Input = forwardRef(function Input(
  { label, error, className = '', ...props },
  ref
) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium mb-1">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={`w-full px-3 py-2 border-2 bg-white shadow-[3px_3px_0_0_#000] placeholder-gray-400 focus:outline-none focus:shadow-[1px_1px_0_0_#000] focus:translate-y-0.5 transition-all ${
          error ? 'border-(--color-destructive)' : 'border-black'
        } ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-(--color-destructive) font-medium">{error}</p>
      )}
    </div>
  );
});

export const Select = forwardRef(function Select(
  { label, error, children, className = '', ...props },
  ref
) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium mb-1">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={`w-full px-3 py-2 border-2 bg-white shadow-[3px_3px_0_0_#000] focus:outline-none focus:shadow-[1px_1px_0_0_#000] focus:translate-y-0.5 transition-all ${
          error ? 'border-(--color-destructive)' : 'border-black'
        } ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p className="mt-1 text-sm text-(--color-destructive) font-medium">{error}</p>
      )}
    </div>
  );
});
