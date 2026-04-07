'use client';

import React from 'react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  required?: boolean;
  helperText?: string;
  as?: 'input' | 'select' | 'textarea';
  children?: React.ReactNode;
}

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
  const inputId = id || `input-${Math.random()}`;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-text-light mb-2">
          {label}
          {required && <span className="text-accent-orange ml-1">*</span>}
        </label>
      )}

      {hint && <p className="text-xs text-text-muted mb-2">{hint}</p>}

      <div className="relative">
        {icon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted flex-shrink-0">
            {icon}
          </span>
        )}

        {as === 'select' ? (
          <select
            id={inputId}
            className={`input-base ${error ? 'border-red-500/50 focus:border-red-500' : ''} ${
              icon ? 'pl-12' : ''
            } ${className}`}
            {...(props as React.SelectHTMLAttributes<HTMLSelectElement>)}
          >
            {children}
          </select>
        ) : as === 'textarea' ? (
          <textarea
            id={inputId}
            className={`input-base ${error ? 'border-red-500/50 focus:border-red-500' : ''} ${
              icon ? 'pl-12' : ''
            } resize-none ${className}`}
            {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <input
            id={inputId}
            className={`input-base ${error ? 'border-red-500/50 focus:border-red-500' : ''} ${
              icon ? 'pl-12' : ''
            } ${className}`}
            {...props}
          />
        )}
      </div>

      {error && (
        <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}

      {helperText && !error && (
        <p className="text-text-muted text-sm mt-2">{helperText}</p>
      )}
    </div>
  );
}
