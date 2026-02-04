import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'link' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';

const variantClasses = {
  default: 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600',
  outline: 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600',
  ghost: 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700',
  destructive: 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600',
  link: 'text-blue-600 dark:text-blue-400 underline-offset-4 hover:underline',
  secondary: 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600'
};

const sizeClasses = {
  default: 'h-10 py-2 px-4',
  sm: 'h-9 px-3 text-sm',
  lg: 'h-11 px-8',
  icon: 'h-10 w-10'
};

export const buttonVariants = ({ variant = 'default', size = 'default', className = '' }: { variant?: ButtonProps['variant'], size?: ButtonProps['size'], className?: string } = {}) => {
  return cn(baseClasses, variantClasses[variant || 'default'], sizeClasses[size || 'default'], className);
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', asChild = false, ...props }, ref) => {
    // Note: asChild functionality is temporarily disabled as @radix-ui/react-slot is not installed
    const Comp = "button"

    const classes = buttonVariants({ variant, size, className });

    return (
      <Comp
        className={classes}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button"
