'use client';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  message?: string;
  className?: string;
}

export function Loader({
  size = 'md',
  fullScreen = false,
  message,
  className = '',
}: LoaderProps) {
  const sizeClass = {
    sm: 'h-6 w-6 border-2',
    md: 'h-10 w-10 border-4',
    lg: 'h-16 w-16 border-4',
  }[size];

  const messageClass = {
    sm: 'text-sm',
    md: 'text-sm',
    lg: 'text-base',
  }[size];

  const spinner = (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-4 ${className}`}
    >
      <div
        aria-hidden="true"
        className={`${sizeClass} animate-spin rounded-full border-accent-orange/30 border-t-accent-orange`}
      />
      {message ? (
        <p className={`text-center text-text-muted ${messageClass}`}>{message}</p>
      ) : (
        <span className="sr-only">Loading</span>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark-base/80 backdrop-blur-sm">
        {spinner}
      </div>
    );
  }

  return spinner;
}