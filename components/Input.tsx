'use client';

import React, { useId } from 'react';

type BaseProps = {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  required?: boolean;
  helperText?: string;
  className?: string;
  as?: 'input' | 'select' | 'textarea';
  children?: React.ReactNode;
  id?: string;
};

type InputAsInput = BaseProps &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> & {
    as?: 'input';
  };

type InputAsSelect = BaseProps &
  React.SelectHTMLAttributes<HTMLSelectElement> & {
    as: 'select';
  };

type InputAsTextarea = BaseProps &
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    as: 'textarea';
  };

type InputProps = InputAsInput | InputAsSelect | InputAsTextarea;

export function Input({
  label,
  error,
  hint,
  icon,
  required,
  helperText,
  className = '',
  id,
  as = 'input',
  children,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id || `input-${generatedId}`;

  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const helperTextId = helperText && !error ? `${inputId}-helper` : undefined;

  const describedBy = [hintId, errorId, helperTextId].filter(Boolean).join(' ') || undefined;

  const sharedClasses = `input-base ${
    error ? 'border-red-500/50 focus:border-red-500' : ''
  } ${icon ? 'pl-12' : ''} ${className}`;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-2 block text-sm font-medium text-text-light">
          {label}
          {required && <span className="ml-1 text-accent-orange">*</span>}
        </label>
      )}

      {hint && (
        <p id={hintId} className="mb-2 text-xs text-text-muted">
          {hint}
        </p>
      )}

      <div className="relative">
        {icon && (
          <span
            className={`absolute left-4 text-text-muted flex-shrink-0 ${
              as === 'textarea'
                ? 'top-4'
                : 'top-1/2 -translate-y-1/2'
            }`}
          >
            {icon}
          </span>
        )}

        {as === 'select' ? (
          <select
            id={inputId}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            className={sharedClasses}
            {...(props as React.SelectHTMLAttributes<HTMLSelectElement>)}
          >
            {children}
          </select>
        ) : as === 'textarea' ? (
          <textarea
            id={inputId}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            className={`${sharedClasses} resize-none`}
            {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <input
            id={inputId}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            className={sharedClasses}
            {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
          />
        )}
      </div>

      {error && (
        <p id={errorId} className="mt-2 flex items-center gap-1 text-sm text-red-400">
          <span>⚠</span> {error}
        </p>
      )}

      {helperText && !error && (
        <p id={helperTextId} className="mt-2 text-sm text-text-muted">
          {helperText}
        </p>
      )}
    </div>
  );
}