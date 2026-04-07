'use client';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  loading = false,
  icon,
  fullWidth = false,
  disabled = false,
  ...props
}: ButtonProps) {
  const baseStyles =
    'relative inline-flex items-center justify-center gap-2 rounded-2xl font-medium whitespace-nowrap transition-all duration-300 ease-out active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyles: Record<ButtonVariant, string> = {
    primary:
      'bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 text-black shadow-[0_6px_30px_rgba(245,158,11,0.25)] hover:shadow-[0_10px_40px_rgba(245,158,11,0.35)] hover:brightness-110',

    secondary:
      'border border-white/15 text-white bg-white/[0.03] backdrop-blur-md hover:bg-white/[0.08] hover:border-white/25',

    ghost:
      'text-text-light hover:bg-white/10',
  };

  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthClass} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {/* Glow layer (only for primary) */}
      {variant === 'primary' && (
        <span className="absolute inset-0 rounded-2xl blur-xl opacity-40 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 -z-10" />
      )}

      {loading ? (
        <>
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          {children}
        </>
      ) : (
        <>
          {icon && <span className="flex-shrink-0">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
}