'use client';

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
  size?: 'default' | 'compact';
  as?: 'h1' | 'h2' | 'h3';
}

export function SectionHeading({
  title,
  subtitle,
  align = 'center',
  className = '',
  size = 'default',
  as = 'h2',
}: SectionHeadingProps) {
  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[align];

  const subtitleAlignClass = {
    left: 'mr-auto',
    center: 'mx-auto',
    right: 'ml-auto',
  }[align];

  const sizeClass =
    size === 'compact'
      ? 'text-2xl sm:text-3xl'
      : 'text-4xl sm:text-5xl';

  const HeadingTag = as;

  return (
    <div className={`${alignClass} ${className}`}>
      <HeadingTag className={`${sizeClass} font-bold mb-4`}>
        <span className="gradient-text">{title}</span>
      </HeadingTag>

      {subtitle && (
        <p
          className={`text-lg text-text-muted max-w-2xl ${subtitleAlignClass}`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}