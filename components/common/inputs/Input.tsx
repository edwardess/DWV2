import React, { InputHTMLAttributes, ReactNode, forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  containerClassName?: string;
  labelClassName?: string;
  inputWrapperClassName?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      fullWidth = false,
      leftIcon,
      rightIcon,
      className,
      containerClassName,
      labelClassName,
      inputWrapperClassName,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputClasses = twMerge(
      'block border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm',
      leftIcon ? 'pl-10' : '',
      rightIcon ? 'pr-10' : '',
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
        <div className={twMerge('relative', inputWrapperClassName)}>
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            disabled={disabled}
            className={inputClasses}
            aria-invalid={!!error}
            aria-describedby={error ? `${props.id}-error` : helperText ? `${props.id}-description` : undefined}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              {rightIcon}
            </div>
          )}
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

Input.displayName = 'Input';

export default Input; 