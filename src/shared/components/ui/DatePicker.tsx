import React, { forwardRef } from 'react';

interface DatePickerProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const baseStyles = 'w-full rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2';
    const errorStyles = error
      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
      : 'border-slate-200 focus:border-primary-500 focus:ring-primary-200';
    const dateId = id || `date-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className={className}>
        {label && (
          <label htmlFor={dateId} className="block text-sm font-bold text-slate-700 mb-1.5">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={dateId}
            type="date"
            className={`${baseStyles} ${errorStyles} px-4 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400`}
            {...props}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <title>Calendar icon</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
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

DatePicker.displayName = 'DatePicker';
