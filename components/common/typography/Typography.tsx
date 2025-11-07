import React, { ReactNode, ElementType } from 'react';
import { twMerge } from 'tailwind-merge';

export type TypographyVariant =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'subtitle1'
  | 'subtitle2'
  | 'body1'
  | 'body2'
  | 'caption'
  | 'overline';

export interface TypographyProps {
  children: ReactNode;
  variant?: TypographyVariant;
  component?: ElementType;
  className?: string;
  color?: 'inherit' | 'primary' | 'secondary' | 'textPrimary' | 'textSecondary' | 'error';
  noWrap?: boolean;
  gutterBottom?: boolean;
  align?: 'inherit' | 'left' | 'center' | 'right' | 'justify';
}

const Typography: React.FC<TypographyProps> = ({
  children,
  variant = 'body1',
  component,
  className,
  color = 'textPrimary',
  noWrap = false,
  gutterBottom = false,
  align = 'inherit',
  ...props
}) => {
  // Map variant to appropriate component if not specified
  const Component = component || 
    (variant === 'h1' ? 'h1' :
    variant === 'h2' ? 'h2' :
    variant === 'h3' ? 'h3' :
    variant === 'h4' ? 'h4' :
    variant === 'h5' ? 'h5' :
    variant === 'h6' ? 'h6' :
    'p');
  
  // Variant classes
  const variantClasses = {
    h1: 'text-3xl font-bold',
    h2: 'text-2xl font-bold',
    h3: 'text-xl font-bold',
    h4: 'text-lg font-semibold',
    h5: 'text-base font-semibold',
    h6: 'text-sm font-semibold',
    subtitle1: 'text-base',
    subtitle2: 'text-sm',
    body1: 'text-base',
    body2: 'text-sm',
    caption: 'text-xs',
    overline: 'text-xs uppercase tracking-wider',
  };
  
  // Color classes
  const colorClasses = {
    inherit: 'text-inherit',
    primary: 'text-blue-600',
    secondary: 'text-gray-600',
    textPrimary: 'text-gray-900',
    textSecondary: 'text-gray-600',
    error: 'text-red-600',
  };
  
  // Alignment classes
  const alignClasses = {
    inherit: '',
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
    justify: 'text-justify',
  };
  
  return (
    <Component
      className={twMerge(
        variantClasses[variant],
        colorClasses[color],
        alignClasses[align],
        noWrap ? 'truncate' : '',
        gutterBottom ? 'mb-2' : '',
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
};

export default Typography; 