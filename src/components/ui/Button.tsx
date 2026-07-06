import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import Spinner from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size    = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  Variant;
  size?:     Size;
  loading?:  boolean;
  icon?:     React.ReactNode;
  iconRight?: React.ReactNode;
}

const variants: Record<Variant, string> = {
  primary:   'btn-red bg-gradient-to-br from-gm-red-lt via-gm-red to-gm-red-dk text-white shadow-lg shadow-gm-red/25 hover:shadow-xl hover:shadow-gm-red/40 active:scale-[0.98]',
  secondary: 'bg-slate-900/[0.04] border border-slate-900/[0.12] text-slate-900/70 hover:border-slate-900/[0.22] hover:text-slate-900 hover:bg-slate-900/[0.07] dark:bg-white/[0.06] dark:border-white/[0.1] dark:text-white/70 dark:hover:border-white/[0.2] dark:hover:text-white/95 dark:hover:bg-white/[0.09] active:scale-[0.98]',
  ghost:     'text-slate-900/45 hover:text-slate-900/80 hover:bg-slate-900/[0.04] dark:text-white/40 dark:hover:text-white/75 dark:hover:bg-white/[0.04] active:scale-[0.98]',
  danger:    'bg-gm-danger/90 text-white border border-gm-danger/20 hover:bg-gm-danger hover:shadow-lg hover:shadow-gm-danger/30 active:scale-[0.98]',
};

const sizes: Record<Size, string> = {
  sm: 'h-8  px-3 text-xs  gap-1.5',
  md: 'h-10 px-4 text-sm  gap-2',
  lg: 'h-12 px-6 text-base gap-2.5',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, iconRight, className, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-xl',
          'transition-all duration-200 select-none',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-red focus-visible:ring-offset-2',
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      >
        {loading ? (
          <Spinner size={size === 'sm' ? 14 : 16} color={variant === 'primary' ? '#fff' : '#E11428'} />
        ) : (
          icon
        )}
        {children}
        {!loading && iconRight}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
