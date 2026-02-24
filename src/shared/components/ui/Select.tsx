import React, { forwardRef } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, placeholder, className = '', id, ...props }, ref) => {
    const baseStyles = 'w-full rounded-xl border bg-white transition-all duration-200 focus:outline-none focus:ring-2 appearance-none';
    const errorStyles = error
      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
      : 'border-slate-200 focus:border-primary-500 focus:ring-primary-200';
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className={className}>
        {label && (
          <label htmlFor={selectId} className="block text-sm font-bold text-slate-700 mb-1.5">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={`${baseStyles} ${errorStyles} px-4 py-2.5 pr-10 text-sm font-medium text-slate-900`}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <title>Dropdown arrow</title>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {error && <p className="mt-1.5 text-xs font-medium text-red-500">{error}</p>}
        {helperText && !error && (
          <p className="mt-1.5 text-xs font-medium text-slate-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
