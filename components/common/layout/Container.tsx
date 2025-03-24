import React, { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

export type ContainerMaxWidth = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | 'none';

export interface ContainerProps {
  children: ReactNode;
  maxWidth?: ContainerMaxWidth;
  className?: string;
  fluid?: boolean;
  component?: React.ElementType;
}

const Container: React.FC<ContainerProps> = ({
  children,
  maxWidth = 'lg',
  className,
  fluid = false,
  component: Component = 'div',
}) => {
  const maxWidthClasses = {
    xs: 'max-w-xs',
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full',
    none: '',
  };

  return (
    <Component
      className={twMerge(
        'w-full px-4 mx-auto',
        fluid ? 'max-w-full' : maxWidthClasses[maxWidth],
        className
      )}
    >
      {children}
    </Component>
  );
};

export default Container; 