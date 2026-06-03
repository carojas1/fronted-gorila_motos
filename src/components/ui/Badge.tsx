import { cn } from '../../lib/utils';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'gold' | 'purple' | 'teal';

/* Variantes con fondo semitransparente — funcionan en fondos oscuros Y claros */
const variants: Record<BadgeVariant, string> = {
  default: 'bg-white/[0.08]    text-white/60   border border-white/[0.08]',
  success: 'bg-emerald-500/15  text-emerald-400 border border-emerald-500/20',
  warning: 'bg-amber-500/15    text-amber-400   border border-amber-500/20',
  danger:  'bg-red-500/15      text-red-400     border border-red-500/20',
  info:    'bg-blue-500/15     text-blue-400    border border-blue-500/20',
  gold:    'bg-gm-red/15       text-gm-red      border border-gm-red/25',
  purple:  'bg-purple-500/15   text-purple-400  border border-purple-500/20',
  teal:    'bg-teal-500/15     text-teal-400    border border-teal-500/20',
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  dot?: boolean;
}

export default function Badge({ children, variant = 'default', className, dot }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold',
      variants[variant],
      className,
    )}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
