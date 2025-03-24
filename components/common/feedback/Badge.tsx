import React, { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

export type BadgeColor = 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' | 'gray';
export type BadgeVariant = 'standard' | 'dot' | 'outline';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps {
  children?: ReactNode;
  content?: ReactNode;
  color?: BadgeColor;
  variant?: BadgeVariant;
  size?: BadgeSize;
  max?: number;
  showZero?: boolean;
  overlap?: boolean;
  className?: string;
  badgeClassName?: string;
}

const Badge: React.FC<BadgeProps> = ({
  children,
  content,
  color = 'primary',
  variant = 'standard',
  size = 'md',
  max = 99,
  showZero = false,
  overlap = false,
  className,
  badgeClassName,
}) => {
  // Color classes based on variant
  const getColorClasses = (color: BadgeColor, variant: BadgeVariant) => {
    const colorMap = {
      primary: {
        standard: 'bg-blue-500 text-white',
        dot: 'bg-blue-500',
        outline: 'bg-white text-blue-500 border border-blue-500',
      },
      secondary: {
        standard: 'bg-gray-500 text-white',
        dot: 'bg-gray-500',
        outline: 'bg-white text-gray-500 border border-gray-500',
      },
      success: {
        standard: 'bg-green-500 text-white',
        dot: 'bg-green-500',
        outline: 'bg-white text-green-500 border border-green-500',
      },
      error: {
        standard: 'bg-red-500 text-white',
        dot: 'bg-red-500',
        outline: 'bg-white text-red-500 border border-red-500',
      },
      warning: {
        standard: 'bg-yellow-500 text-white',
        dot: 'bg-yellow-500',
        outline: 'bg-white text-yellow-500 border border-yellow-500',
      },
      info: {
        standard: 'bg-blue-400 text-white',
        dot: 'bg-blue-400',
        outline: 'bg-white text-blue-400 border border-blue-400',
      },
      gray: {
        standard: 'bg-gray-400 text-white',
        dot: 'bg-gray-400',
        outline: 'bg-white text-gray-400 border border-gray-400',
      },
    };
    
    return colorMap[color][variant];
  };
  
  const sizeClasses = {
    sm: variant === 'dot' ? 'h-2 w-2' : 'text-xs min-w-[16px] h-4 px-1',
    md: variant === 'dot' ? 'h-3 w-3' : 'text-xs min-w-[20px] h-5 px-1.5',
    lg: variant === 'dot' ? 'h-4 w-4' : 'text-sm min-w-[24px] h-6 px-2',
  };
  
  // Calculate position
  const positionClasses = overlap ? '-translate-y-1/2 translate-x-1/2' : 'translate-x-0 translate-y-0';
  
  // Calculate content to display
  const displayContent = () => {
    if (variant === 'dot') return null;
    if (content === undefined) return null;
    if (content === 0 && !showZero) return null;
    
    const contentValue = typeof content === 'number' && content > max ? `${max}+` : content;
    return contentValue;
  };
  
  const badgeContent = displayContent();
  
  if (badgeContent === null && variant !== 'dot') {
    return <>{children}</>;
  }
  
  return (
    <div className={twMerge('relative inline-flex', className)}>
      {children}
      <span
        className={twMerge(
          'absolute flex items-center justify-center rounded-full',
          variant === 'dot' ? 'rounded-full' : 'rounded-full',
          getColorClasses(color, variant),
          sizeClasses[size],
          overlap ? 'top-0 right-0' : '-top-1 -right-1',
          positionClasses,
          badgeClassName
        )}
      >
        {badgeContent}
      </span>
    </div>
  );
};

export default Badge; 