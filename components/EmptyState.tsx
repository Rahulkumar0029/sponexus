'use client';

import Link from 'next/link';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;

  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;

  secondaryActionLabel?: string;
  secondaryActionHref?: string;

  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  actionHref,
  secondaryActionLabel,
  secondaryActionHref,
  className = '',
}: EmptyStateProps) {
  const renderPrimaryAction = () => {
    if (!actionLabel) return null;

    if (actionHref) {
      return (
        <Button asChild>
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      );
    }

    if (onAction) {
      return (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      );
    }

    return null;
  };

  const renderSecondaryAction = () => {
    if (!secondaryActionLabel || !secondaryActionHref) return null;

    return (
      <Button asChild variant="secondary">
        <Link href={secondaryActionHref}>{secondaryActionLabel}</Link>
      </Button>
    );
  };

  return (
    <div
      role="region"
      aria-label="Empty state"
      className={`rounded-[24px] border border-white/10 bg-white/[0.05] py-16 text-center backdrop-blur-xl ${className}`}
    >
      {icon && (
        <div className="mb-6 flex justify-center text-5xl">
          {icon}
        </div>
      )}

      <h3 className="mb-3 text-2xl font-bold text-text-light">{title}</h3>

      <p className="mx-auto mb-8 max-w-md text-text-muted">
        {description}
      </p>

      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
        {renderPrimaryAction()}
        {renderSecondaryAction()}
      </div>
    </div>
  );
}