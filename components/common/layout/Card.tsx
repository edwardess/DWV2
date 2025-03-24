import React, { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

export interface CardProps {
  children: ReactNode;
  title?: string | ReactNode;
  subtitle?: string;
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  footerClassName?: string;
  noPadding?: boolean;
  bordered?: boolean;
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  footer,
  className,
  bodyClassName,
  titleClassName,
  subtitleClassName,
  footerClassName,
  noPadding = false,
  bordered = true,
  shadow = 'md',
  rounded = 'md',
}) => {
  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow',
    lg: 'shadow-lg',
  };

  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  };

  const hasHeader = !!title || !!subtitle;

  return (
    <div
      className={twMerge(
        'bg-white overflow-hidden',
        bordered ? 'border border-gray-200' : '',
        shadowClasses[shadow],
        roundedClasses[rounded],
        className
      )}
    >
      {hasHeader && (
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
          {title && (
            <div
              className={twMerge(
                'text-base font-medium text-gray-900',
                typeof title !== 'string' ? 'flex items-center' : '',
                titleClassName
              )}
            >
              {title}
            </div>
          )}
          {subtitle && (
            <div className={twMerge('mt-1 text-sm text-gray-500', subtitleClassName)}>
              {subtitle}
            </div>
          )}
        </div>
      )}
      <div className={twMerge(noPadding ? '' : 'p-4', bodyClassName)}>{children}</div>
      {footer && (
        <div
          className={twMerge(
            'border-t border-gray-200 bg-gray-50 px-4 py-3',
            footerClassName
          )}
        >
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card; 