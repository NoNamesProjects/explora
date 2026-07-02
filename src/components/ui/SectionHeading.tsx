import { RichText } from '@/components/content/RichText';

interface SectionHeadingProps {
  eyebrow?: string;
  titleLead?: string;
  highlight: string;
  titleTail?: string;
  align?: 'left' | 'center';
  variant?: 'dark' | 'light';
  size?: 'display' | 'hero-xl' | 'display-sm';
  className?: string;
  /** When set, the highlight noun can carry client rich styling (falls back to `highlight`). */
  highlightRichKey?: string;
}

/**
 * Editorial section heading — eyebrow label + upright classical-serif title
 * (Cormorant Garamond) with a gentle italic-serif highlight noun phrase.
 * Standard pattern across the brand.
 */
export function SectionHeading({
  eyebrow,
  titleLead,
  highlight,
  titleTail,
  align = 'left',
  variant = 'dark',
  size = 'display',
  className = '',
  highlightRichKey,
}: SectionHeadingProps) {
  const eyebrowColor = variant === 'light' ? 'text-cream/70' : 'text-ink-600';
  const titleColor = variant === 'light' ? 'text-cream' : 'text-ink';
  const alignCls = align === 'center' ? 'text-center mx-auto max-w-prose' : '';
  const sizeCls = size === 'hero-xl'
    ? 'text-hero-xl'
    : size === 'display-sm'
      ? 'text-display-sm'
      : 'text-display';

  return (
    <div className={`${alignCls} ${className}`}>
      {eyebrow && (
        <div className={`text-eyebrow uppercase tracking-eyebrow mb-4 ${eyebrowColor}`}>
          {eyebrow}
        </div>
      )}
      <h2 className={`${sizeCls} font-serif font-medium leading-tight text-balance ${titleColor}`}>
        {titleLead && <>{titleLead} </>}
        {highlightRichKey ? (
          <RichText tKey={highlightRichKey} as="em" className="italic font-normal" fallback={highlight} />
        ) : (
          <em className="italic font-normal">{highlight}</em>
        )}
        {titleTail && <> {titleTail}</>}
      </h2>
    </div>
  );
}
