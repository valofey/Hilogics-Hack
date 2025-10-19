/* eslint-disable react-refresh/only-export-components */
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-none border border-transparent px-4 py-2 text-sm font-semibold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black disabled:pointer-events-none disabled:opacity-60',
  {
    variants: {
      variant: {
        default: 'border-black bg-black text-white hover:bg-white hover:text-black',
        secondary: 'border-black bg-white text-black hover:bg-black hover:text-white',
        outline: 'border-black bg-white text-black hover:bg-black hover:text-white',
        ghost: 'border-none bg-transparent text-black hover:bg-black/5',
        link: 'border-none bg-transparent text-black underline-offset-4 hover:underline',
        destructive: 'border-black bg-white text-red-600 hover:bg-red-600 hover:text-white',
        subtle: 'border-black bg-white text-slate-600 hover:text-black'
      },
      size: {
        default: 'h-11 px-5',
        sm: 'h-9 px-3 text-xs',
        lg: 'h-12 px-6 text-base',
        icon: 'h-11 w-11 p-0'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
