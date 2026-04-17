'use client';

import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  asChild?: boolean;
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
  asChild = false,
  type = 'button',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const baseStyles =
    'relative inline-flex items-center justify-center gap-2 rounded-2xl font-medium whitespace-nowrap transition-all duration-300 ease-out active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyles: Record<ButtonVariant, string> = {
    primary:
      'bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 text-black shadow-[0_6px_30px_rgba(245,158,11,0.25)] hover:shadow-[0_10px_40px_rgba(245,158,11,0.35)] hover:brightness-110',
    secondary:
      'border border-white/15 text-white bg-white/[0.03] backdrop-blur-md hover:bg-white/[0.08] hover:border-white/25',
    ghost: 'text-text-light hover:bg-white/10',
  };

  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  const mergedClassName =
    `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthClass} ${className}`.trim();

  const content = (
    <>
      {variant === 'primary' && (
        <span className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 opacity-40 blur-xl" />
      )}

      {loading ? (
        <>
          <span
            aria-hidden="true"
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
          <span>{children}</span>
        </>
      ) : (
        <>
          {icon && <span className="flex-shrink-0">{icon}</span>}
          <span>{children}</span>
        </>
      )}
    </>
  );

  if (asChild) {
    if (!React.isValidElement(children)) {
      throw new Error(
        'Button with asChild expects exactly one valid React element as child.'
      );
    }

    const child = children as React.ReactElement<{
      className?: string;
      children?: React.ReactNode;
      'aria-disabled'?: boolean;
      'aria-busy'?: boolean;
      tabIndex?: number;
    }>;

    const childClassName = child.props.className ?? '';
    const finalClassName = `${mergedClassName} ${
      isDisabled ? 'pointer-events-none opacity-50' : ''
    } ${childClassName}`.trim();

    return React.cloneElement(child, {
      className: finalClassName,
      'aria-disabled': isDisabled ? true : undefined,
      'aria-busy': loading ? true : undefined,
      tabIndex: isDisabled ? -1 : child.props.tabIndex,
      children: content,
    });
  }

  return (
    <button
      type={type}
      className={mergedClassName}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {content}
    </button>
  );
}