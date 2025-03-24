import React, { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

export interface FormFieldProps {
  children: ReactNode;
  label?: string;
  htmlFor?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  className?: string;
  labelClassName?: string;
}

const FormField: React.FC<FormFieldProps> = ({
  children,
  label,
  htmlFor,
  helperText,
  error,
  required = false,
  className,
  labelClassName,
}) => {
  return (
    <div className={twMerge('mb-4', className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className={twMerge(
            'block text-sm font-medium text-gray-700 mb-1',
            labelClassName
          )}
        >
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1 text-sm text-red-600" id={`${htmlFor}-error`}>
          {error}
        </p>
      ) : helperText ? (
        <p className="mt-1 text-sm text-gray-500" id={`${htmlFor}-description`}>
          {helperText}
        </p>
      ) : null}
    </div>
  );
};

export default FormField; 