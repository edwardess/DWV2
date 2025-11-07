// Put the components/Select.tsx code here 
// Select.tsx
import React, { SelectHTMLAttributes, forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  options: SelectOption[];
  helperText?: string;
  error?: string;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
  containerClassName?: string;
  labelClassName?: string;
  selectWrapperClassName?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      options,
      helperText,
      error,
      fullWidth = false,
      size = 'md',
      className,
      containerClassName,
      labelClassName,
      selectWrapperClassName,
      disabled,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: 'py-1 text-sm',
      md: 'py-2 text-base',
      lg: 'py-3 text-lg',
    };

    const selectClasses = twMerge(
      'block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500',
      sizeClasses[size],
      error ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500' : '',
      disabled ? 'bg-gray-100 cursor-not-allowed opacity-75' : '',
      className
    );

    return (
      <div className={twMerge('mb-4', fullWidth ? 'w-full' : '', containerClassName)}>
        {label && (
          <label
            htmlFor={props.id}
            className={twMerge('block text-sm font-medium text-gray-700 mb-1', labelClassName)}
          >
            {label}
          </label>
        )}
        <div className={twMerge('relative', selectWrapperClassName)}>
          <select
            ref={ref}
            disabled={disabled}
            className={selectClasses}
            aria-invalid={!!error}
            aria-describedby={error ? `${props.id}-error` : helperText ? `${props.id}-description` : undefined}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-600" id={`${props.id}-error`}>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500" id={`${props.id}-description`}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
