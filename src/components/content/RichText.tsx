/**
 * Renders a rich "runs" document (or a plain string) with NO
 * dangerouslySetInnerHTML — React escapes every text node, and the only
 * attributes emitted are the style/href values validated in content/sanitize.
 *
 * Usage:
 *   <RichText tKey="hero.tagline" as="h1" className="..." />   // i18n key (plain OR overridden-rich)
 *   <RichText value={doc} />                                    // a direct RichDoc/string
 */
import type { CSSProperties, ElementType, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { isRichDoc, type RichDoc, type RichSpan } from '@/lib/content/types';
import { spanCssStyle, sanitizeHref } from '@/lib/content/sanitize';

interface RichTextProps {
  tKey?: string;
  value?: RichDoc | string;
  as?: ElementType;
  className?: string;
  fallback?: string;
}

function spanNode(span: RichSpan, i: number): ReactNode {
  const style: CSSProperties = { ...spanCssStyle(span) };
  if (span.b) style.fontWeight = 700;
  if (span.i) style.fontStyle = 'italic';
  if (span.u) style.textDecoration = 'underline';
  const href = sanitizeHref(span.href);
  if (href) {
    const external = /^https?:/i.test(href);
    return (
      <a
        key={i}
        href={href}
        style={style}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {span.text}
      </a>
    );
  }
  return (
    <span key={i} style={Object.keys(style).length ? style : undefined}>
      {span.text}
    </span>
  );
}

export function RichText({ tKey, value, as, className, fallback }: RichTextProps) {
  const { t, i18n } = useTranslation();

  let resolved: RichDoc | string | undefined = value;
  if (resolved === undefined && tKey) {
    // returnObjects → a plain default comes back as a string; an override comes back as the RichDoc object.
    resolved = i18n.exists(tKey)
      ? (i18n.t(tKey, { returnObjects: true }) as unknown as RichDoc | string)
      : undefined;
  }
  if (resolved === undefined) resolved = fallback ?? (tKey ? t(tKey) : '');

  const Tag: ElementType = as ?? 'span';

  if (isRichDoc(resolved)) {
    return (
      <Tag className={className} style={resolved.align ? { textAlign: resolved.align } : undefined}>
        {resolved.spans.map(spanNode)}
      </Tag>
    );
  }
  return <Tag className={className}>{typeof resolved === 'string' ? resolved : String(resolved ?? '')}</Tag>;
}
