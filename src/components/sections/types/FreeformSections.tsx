/**
 * Renderers for the freeform section types — the blocks an admin can add from
 * scratch, in any number, on any page.
 *
 * Each one reads ONLY through a SectionReader (never section.config directly)
 * and degrades gracefully: a half-filled draft renders whatever is set and
 * silently omits the rest, so the admin sees progress rather than a crash.
 * Visual treatments are lifted verbatim from the hand-built components they
 * replace, so migrating a page is a refactor with no intended pixel diff.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { imageUrl } from '@/lib/image';
import { RichText } from '@/components/content/RichText';
import { NewsletterInline } from '@/components/forms/NewsletterInline';
import { SearchWidget } from '@/components/hero/SearchWidget';
import { useSectionReader } from '@/lib/content/sectionRead';
import type { PublicSection } from '@/lib/content/useSections';
import { SectionShell, SectionHead, SectionButton, isDarkTone, toneClass } from '../SectionShell';

const EASE = [0.22, 1, 0.36, 1] as const;
const REVEAL = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.55, ease: EASE },
} as const;

/** Internal links go through the router; external/anchor links stay plain. */
function SmartLink({ to, className, children }: { to: string; className?: string; children: React.ReactNode }) {
  if (/^https?:\/\//i.test(to) || to.startsWith('#') || to.startsWith('mailto:') || to.startsWith('tel:')) {
    return <a href={to} className={className} {...(/^https?:/i.test(to) ? { target: '_blank', rel: 'noreferrer' } : {})}>{children}</a>;
  }
  return <Link to={to} className={className}>{children}</Link>;
}

// ── Hero ─────────────────────────────────────────────────────────────────────

const HERO_HEIGHT: Record<string, string> = {
  tall: 'h-[calc(100vh-80px)] min-h-[600px] max-h-[880px]',
  medium: 'h-[calc(100vh-80px)] min-h-[480px] max-h-[620px]',
  short: 'h-[52vh] min-h-[360px] max-h-[480px]',
};

export function HeroSection({ section }: { section: PublicSection }) {
  const r = useSectionReader(section);
  const img = r.image('image');
  const tagline = r.rich('tagline');
  const eyebrow = r.text('eyebrow');
  const subtitle = r.text('subtitle');
  const primary = r.button('primaryCta');
  const secondary = r.button('secondaryCta');
  const showSearch = r.toggle('showSearch');
  const height = HERO_HEIGHT[r.select('height', 'medium')] ?? HERO_HEIGHT.medium;

  return (
    <>
      <section id={section.slug} className={`relative overflow-hidden bg-ink ${height}`}>
        {img && (
          <img
            src={imageUrl(img.src, { w: 1920, h: 1200, fit: 'cover' })}
            alt={img.alt ?? ''}
            className="absolute inset-0 h-full w-full object-cover animate-slow-zoom"
            loading="eager"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-ink/15 via-transparent to-ink/55 pointer-events-none" aria-hidden />
        <div className="absolute inset-0 bg-grain opacity-15 mix-blend-overlay pointer-events-none" aria-hidden />

        <div className={`absolute inset-0 flex flex-col items-center justify-end px-5 text-cream text-center ${showSearch ? 'pb-16 md:pb-20' : 'pb-20 md:pb-28'}`}>
          {eyebrow && <div className="eyebrow mb-4 text-cream/80">{eyebrow}</div>}
          {tagline && (
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: EASE, delay: 0.4 }}
              className="max-w-4xl mx-auto font-serif font-normal leading-[1.14] tracking-normal text-balance text-4xl sm:text-5xl md:text-6xl text-cream [text-shadow:0_2px_18px_rgba(12,35,64,0.45)]"
            >
              <RichText value={tagline} />
            </motion.h1>
          )}
          {subtitle && <p className="mt-5 max-w-xl text-cream/85 text-lg">{subtitle}</p>}
          {(primary || secondary) && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              {primary && <SectionButton {...primary} dark />}
              {secondary && <SectionButton {...secondary} dark />}
            </div>
          )}
          {!subtitle && !primary && !secondary && (
            <motion.span
              aria-hidden
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ duration: 0.8, ease: EASE, delay: 1 }}
              className="mt-6 h-px w-12 origin-center bg-accent-goldSoft shadow-[0_1px_4px_rgba(12,35,64,0.45)]"
            />
          )}
        </div>
      </section>

      {/* The search widget floats across the hero/cream seam — a fixed composite
          with the hero, deliberately not an independently movable section. */}
      {showSearch && (
        <div className="relative z-20 -mt-9 md:-mt-11 px-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: EASE, delay: 0.75 }}
            className="max-w-6xl mx-auto"
          >
            <SearchWidget />
          </motion.div>
        </div>
      )}
    </>
  );
}

// ── Text block ───────────────────────────────────────────────────────────────

export function RichTextSection({ section }: { section: PublicSection }) {
  const r = useSectionReader(section);
  const tone = r.select('tone', 'cream');
  const align = r.select('align', 'center') as 'left' | 'center';
  const body = r.rich('body');

  return (
    <SectionShell id={section.slug} tone={tone}>
      <SectionHead
        eyebrow={r.text('eyebrow')}
        heading={r.rich('heading')}
        align={align}
        dark={isDarkTone(tone)}
      />
      {body && (
        <div className={`mt-6 leading-relaxed text-pretty ${align === 'center' ? 'mx-auto text-center' : ''} max-w-prose ${isDarkTone(tone) ? 'text-cream/80' : 'text-ink-600'}`}>
          <RichText value={body} />
        </div>
      )}
    </SectionShell>
  );
}

// ── Cards grid — the "Spaces to discover" workhorse ──────────────────────────

const COLS: Record<string, string> = {
  '2': 'md:grid-cols-2',
  '3': 'md:grid-cols-3',
  '4': 'sm:grid-cols-2 lg:grid-cols-4',
};

export function CardsGridSection({ section }: { section: PublicSection }) {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const r = useSectionReader(section);
  const tone = r.select('tone', 'cream');
  const dark = isDarkTone(tone);
  const cards = r.cards('cards');
  const overlay = r.select('cardStyle', 'overlay') === 'overlay';
  const cols = COLS[r.select('columns', '3')] ?? COLS['3'];

  return (
    <SectionShell id={section.slug} tone={tone} className={dark ? '' : 'border-t border-cream-300/50'}>
      <SectionHead
        eyebrow={r.text('eyebrow')}
        heading={r.rich('heading')}
        intro={r.text('intro')}
        align="left"
        dark={dark}
        className="max-w-editorial mb-14 md:mb-20"
      />

      {cards.length > 0 && (
        <div className={`grid gap-8 ${cols}`}>
          {cards.map((card, i) => {
            const img = card.image('image');
            const title = card.text('title');
            const body = card.text('body');
            const href = card.link('href');
            const cta = card.text('ctaLabel') || t('common.explore', { defaultValue: 'Explore' });

            const inner = overlay ? (
              <>
                <div className="aspect-[3/4] overflow-hidden bg-cream-200">
                  {img && (
                    <img
                      src={imageUrl(img.src, { w: 760, h: 1013, fit: 'cover' })}
                      alt={img.alt ?? title}
                      className="h-full w-full object-cover transition-transform duration-[1600ms] ease-out-soft group-hover:scale-[1.07]"
                      loading="lazy"
                    />
                  )}
                </div>
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/35 to-transparent" aria-hidden />
                <div className="absolute inset-x-0 bottom-0 p-7 md:p-8 text-cream">
                  {title && <h3 className="font-serif text-3xl leading-tight text-cream">{title}</h3>}
                  {body && <p className="mt-2.5 max-w-[26ch] text-[0.95rem] leading-relaxed text-cream/80">{body}</p>}
                  {href && (
                    <span className="mt-6 inline-flex items-center gap-2.5 text-eyebrow uppercase tracking-eyebrow text-cream">
                      {cta}
                      <svg viewBox="0 0 24 24" className="h-[1.05em] w-[1.05em] text-accent-gold transition-transform duration-500 ease-out-soft group-hover:translate-x-1.5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                        <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="aspect-[4/5] overflow-hidden bg-cream-200">
                  {img && (
                    <img
                      src={imageUrl(img.src, { w: 760, h: 950, fit: 'cover' })}
                      alt={img.alt ?? title}
                      className="h-full w-full object-cover transition-transform duration-[1600ms] ease-out-soft group-hover:scale-[1.05]"
                      loading="lazy"
                    />
                  )}
                </div>
                <div className="pt-5">
                  {title && <h3 className={`font-serif text-2xl leading-tight ${dark ? 'text-cream' : 'text-ink'}`}>{title}</h3>}
                  {body && <p className={`mt-2 text-[0.95rem] leading-relaxed ${dark ? 'text-cream/75' : 'text-ink-600'}`}>{body}</p>}
                  {href && (
                    <span className={`mt-4 inline-flex items-center gap-2 text-eyebrow uppercase tracking-eyebrow ${dark ? 'text-cream' : 'text-accent-tan'}`}>
                      {cta}
                      <svg viewBox="0 0 24 24" className="h-[1.05em] w-[1.05em] transition-transform duration-500 ease-out-soft group-hover:translate-x-1.5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                        <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  )}
                </div>
              </>
            );

            const shellCls = overlay
              ? 'group relative block overflow-hidden rounded-card bg-ink ring-1 ring-cream-300/50 shadow-[0_8px_30px_-18px_rgba(12,35,64,0.35)] transition-[transform,box-shadow] duration-500 ease-out-soft hover:-translate-y-1.5 hover:shadow-[0_28px_60px_-28px_rgba(12,35,64,0.55)] focus-visible:-translate-y-1.5'
              : 'group block';

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: reduce ? 0 : 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.6, ease: EASE, delay: i * 0.08 }}
              >
                {href ? (
                  <SmartLink to={href} className={shellCls}>{inner}</SmartLink>
                ) : (
                  <div className={shellCls.replace('group ', 'group ')}>{inner}</div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </SectionShell>
  );
}

// ── Image + text ─────────────────────────────────────────────────────────────

export function ImageBannerSection({ section }: { section: PublicSection }) {
  const r = useSectionReader(section);
  const tone = r.select('tone', 'cream');
  const dark = isDarkTone(tone);
  const img = r.image('image');
  const body = r.rich('body');
  const cta = r.button('cta');
  const imageRight = r.select('layout', 'left') === 'right';

  return (
    <SectionShell id={section.slug} tone={tone}>
      <div className="grid items-center gap-10 md:gap-14 lg:grid-cols-2">
        <motion.div {...REVEAL} className={`aspect-[4/5] overflow-hidden bg-cream-200 ${imageRight ? 'lg:order-2' : ''}`}>
          {img && (
            <img
              src={imageUrl(img.src, { w: 880, h: 1100, fit: 'cover' })}
              alt={img.alt ?? ''}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          )}
        </motion.div>
        <motion.div {...REVEAL} transition={{ ...REVEAL.transition, delay: 0.08 }}>
          <SectionHead eyebrow={r.text('eyebrow')} heading={r.rich('heading')} align="left" dark={dark} />
          {body && (
            <div className={`mt-5 max-w-prose leading-relaxed text-pretty ${dark ? 'text-cream/80' : 'text-ink-600'}`}>
              <RichText value={body} />
            </div>
          )}
          {cta && <div className="mt-8"><SectionButton {...cta} dark={dark} /></div>}
        </motion.div>
      </div>
    </SectionShell>
  );
}

// ── Inclusions checklist ─────────────────────────────────────────────────────

export function ChecklistBandSection({ section }: { section: PublicSection }) {
  const r = useSectionReader(section);
  const tone = r.select('tone', 'cream');
  const dark = isDarkTone(tone);
  const items = r.list('items');
  const img = r.image('image');
  const note = r.text('note');

  return (
    <SectionShell id={section.slug} tone={tone}>
      <div className="text-center mb-12 md:mb-16">
        <span aria-hidden className="mx-auto mb-5 block h-px w-12 bg-accent-gold/60" />
        <SectionHead eyebrow={r.text('eyebrow')} heading={r.rich('heading')} align="center" dark={dark} />
      </div>

      <div className="grid items-center gap-10 md:gap-14 lg:grid-cols-2">
        <motion.ul {...REVEAL} className="max-w-prose">
          {items.map((item) => (
            <li key={item} className={`flex gap-3.5 border-b py-3.5 ${dark ? 'border-cream/15 text-cream' : 'border-cream-300/50 text-ink'}`}>
              <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-gold" />
              <span className="text-lg md:text-xl">{item}</span>
            </li>
          ))}
          {note && <li className={`pt-4 text-base italic ${dark ? 'text-cream/70' : 'text-ink-600'}`}>{note}</li>}
        </motion.ul>

        <motion.div {...REVEAL} transition={{ ...REVEAL.transition, delay: 0.08 }} className="aspect-[4/5] overflow-hidden bg-cream-200">
          {img && (
            <img
              src={imageUrl(img.src, { w: 760, h: 950, fit: 'cover' })}
              alt={img.alt ?? ''}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          )}
        </motion.div>
      </div>
    </SectionShell>
  );
}

// ── CTA band ─────────────────────────────────────────────────────────────────

export function CtaBandSection({ section }: { section: PublicSection }) {
  const r = useSectionReader(section);
  const tone = r.select('tone', 'ink');
  const dark = isDarkTone(tone);
  const primary = r.button('primaryCta');
  const secondary = r.button('secondaryCta');
  const body = r.text('body');

  return (
    <SectionShell id={section.slug} tone={tone} spacing="sm">
      <div className="text-center">
        <SectionHead eyebrow={r.text('eyebrow')} heading={r.rich('heading')} align="center" dark={dark} />
        {body && <p className={`mt-4 mx-auto max-w-prose ${dark ? 'text-cream/80' : 'text-ink-600'}`}>{body}</p>}
        {(primary || secondary) && (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            {primary && <SectionButton {...primary} dark={dark} />}
            {secondary && <SectionButton {...secondary} dark={dark} />}
          </div>
        )}
      </div>
    </SectionShell>
  );
}

// ── Video ────────────────────────────────────────────────────────────────────

export function VideoSection({ section }: { section: PublicSection }) {
  const reduce = useReducedMotion();
  const r = useSectionReader(section);
  const [playing, setPlaying] = useState(false);
  const videoId = r.text('videoId').trim();
  const poster = r.image('poster');
  const tone = r.select('tone', 'cream');
  const dark = isDarkTone(tone);
  const title = r.rich('title');

  if (!videoId) return null;
  const ytPoster = `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/maxresdefault.jpg`;

  return (
    <section id={section.slug} className={`${toneClass(tone)} py-section-y`}>
      <div className="container">
        <SectionHead eyebrow={r.text('eyebrow')} heading={title} align="center" dark={dark} />
      </div>

      <div className="mx-auto mt-12 w-full max-w-wide px-6 md:mt-14 md:px-8 lg:px-12">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.65, ease: EASE }}
          className="relative aspect-video w-full overflow-hidden rounded-card bg-ink shadow-xl ring-1 ring-ink/10"
        >
          {playing ? (
            <iframe
              className="absolute inset-0 h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0&modestbranding=1`}
              title="Video"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          ) : (
            <button
              type="button"
              aria-label="Play the film"
              onClick={() => setPlaying(true)}
              className="group absolute inset-0 h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
            >
              <img
                src={poster?.src ? imageUrl(poster.src, { w: 1600, h: 900, fit: 'cover' }) : ytPoster}
                onError={(e) => {
                  // maxres isn't generated for every upload — fall back to hq.
                  if (!e.currentTarget.src.endsWith('hqdefault.jpg')) {
                    e.currentTarget.src = `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;
                  }
                }}
                alt=""
                className="h-full w-full object-cover transition-transform duration-[1400ms] ease-out-soft group-hover:scale-[1.04]"
                loading="lazy"
              />
              <span aria-hidden className="absolute inset-0 bg-ink/25 transition-colors duration-500 group-hover:bg-ink/35" />
              <span aria-hidden className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-cream/90 shadow-lg ring-1 ring-ink/10 transition-transform duration-300 ease-out-soft group-hover:scale-110">
                <svg viewBox="0 0 24 24" className="ml-1 h-10 w-10 fill-ink" aria-hidden>
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </button>
          )}
        </motion.div>
      </div>
    </section>
  );
}

// ── Newsletter ───────────────────────────────────────────────────────────────

export function NewsletterSection({ section }: { section: PublicSection }) {
  const r = useSectionReader(section);
  const tone = r.select('tone', 'cream');
  const dark = isDarkTone(tone);
  const heading = r.rich('heading');
  const body = r.text('body');

  return (
    <section id={section.slug} className={dark ? 'bg-ink text-cream' : 'bg-cream-300'}>
      <div className="container py-section-y-sm">
        <motion.div {...REVEAL} className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
          <div className="max-w-prose">
            {heading && (
              <h2 className={`font-serif text-display-sm leading-tight text-balance ${dark ? 'text-cream' : 'text-ink'}`}>
                <RichText value={heading} />
              </h2>
            )}
            {body && <p className={`mt-3 text-[0.95rem] ${dark ? 'text-cream/80' : 'text-ink-700'}`}>{body}</p>}
          </div>
          <div className="md:justify-self-end md:w-full md:max-w-md">
            <NewsletterInline variant={dark ? 'dark' : 'light'} />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
