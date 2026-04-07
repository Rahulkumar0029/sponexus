'use client';

import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`card text-center py-16 ${className}`}>
      {icon && <div className="text-5xl mb-6 flex justify-center">{icon}</div>}
      <h3 className="text-2xl font-bold text-text-light mb-3">{title}</h3>
      <p className="text-text-muted mb-8 max-w-md mx-auto">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
