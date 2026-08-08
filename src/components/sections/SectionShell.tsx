/**
 * The one section wrapper every admin-managed block renders inside.
 *
 * Before the page-builder each section hand-rolled its own
 * `<section className="py-section-y bg-cream"><div className="container">` and
 * its own heading markup — eight near-identical copies on Home alone, only two
 * of which used SectionHeading. Centralising it here is what makes "background
 * tone" and "spacing" admin-settable knobs instead of hardcoded classes, and
 * gives the draft outline in preview mode a single place to live.
 */
import type { ReactNode } from 'react';
import { RichText } from '@/components/content/RichText';
import type { RichDoc } from '@/lib/content/types';

export type SectionTone = 'cream' | 'cream-soft' | 'ink';

const TONE_CLASS: Record<SectionTone, string> = {
  cream: 'bg-cream text-ink',
  'cream-soft': 'bg-cream-soft text-ink',
  ink: 'bg-ink text-cream',
};

export function toneClass(tone: string): string {
  return TONE_CLASS[(tone as SectionTone)] ?? TONE_CLASS.cream;
}

/** True when this tone puts light text on a dark ground (flips muted colours). */
export function isDarkTone(tone: string): boolean {
  return tone === 'ink';
}

export function SectionShell({
  id, tone = 'cream', spacing = 'normal', contained = true, className = '', children,
}: {
  id?: string;
  tone?: string;
  spacing?: 'normal' | 'sm' | 'none';
  /** false → the caller manages its own width (full-bleed heroes, video frames). */
  contained?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const pad = spacing === 'none' ? '' : spacing === 'sm' ? 'py-section-y-sm' : 'py-section-y';
  return (
    <section id={id} className={`${toneClass(tone)} ${pad} ${className}`.trim()}>
      {contained ? <div className="container">{children}</div> : children}
    </section>
  );
}

/**
 * Shared eyebrow + rich heading + intro cluster. Mirrors the existing
 * SectionHeading treatment, but the heading is a RichDoc so the admin controls
 * its styling per-run (the "graphic style letters" ask) instead of the code
 * hardcoding which word is italic.
 */
export function SectionHead({
  eyebrow, heading, intro, align = 'center', dark = false, className = '',
}: {
  eyebrow?: string;
  heading?: RichDoc | string;
  intro?: string;
  align?: 'left' | 'center';
  dark?: boolean;
  className?: string;
}) {
  if (!eyebrow && !heading && !intro) return null;
  const centered = align === 'center';
  return (
    <div className={`${centered ? 'text-center mx-auto max-w-prose' : ''} ${className}`.trim()}>
      {eyebrow && (
        <div className={`text-eyebrow uppercase tracking-eyebrow mb-4 ${dark ? 'text-cream/70' : 'text-ink-600'}`}>
          {eyebrow}
        </div>
      )}
      {heading && (
        <h2 className={`font-serif font-medium text-display leading-tight text-balance ${dark ? 'text-cream' : 'text-ink'}`}>
          <RichText value={heading} />
        </h2>
      )}
      {intro && (
        <p className={`mt-5 text-pretty leading-relaxed ${centered ? 'mx-auto max-w-prose' : 'max-w-prose'} ${dark ? 'text-cream/80' : 'text-ink-600'}`}>
          {intro}
        </p>
      )}
    </div>
  );
}

/** The house button treatments, shared by every section that renders a CTA. */
export function SectionButton({
  label, href, style = 'primary', dark = false,
}: {
  label: string;
  href: string;
  style?: string;
  dark?: boolean;
}) {
  const cls =
    style === 'secondary'
      ? dark
        ? 'inline-flex items-center border border-cream/40 px-6 py-3 text-[0.7rem] uppercase tracking-[0.18em] font-medium text-cream transition-colors hover:bg-cream hover:text-ink'
        : 'btn-secondary'
      : style === 'ghost' || style === 'link'
        ? `link-underline text-[0.8rem] uppercase tracking-[0.18em] font-medium ${dark ? 'text-cream' : 'text-ink'}`
        : 'btn-primary';
  const external = /^https?:\/\//i.test(href);
  return (
    <a href={href} className={cls} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}>
      {label}
    </a>
  );
}
