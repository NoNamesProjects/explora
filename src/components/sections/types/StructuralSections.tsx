/**
 * Renderers for STRUCTURAL section types.
 *
 * Their body is live data — real sailings from the catalogue, the real published
 * destination list — so it is deliberately NOT admin-editable: the page must
 * stay truthful to what's actually bookable. What the admin does own is the
 * chrome (heading, intro, link label) plus the section's order and visibility.
 *
 * Each one is a thin adapter over the existing, unchanged live component.
 */
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PackagesTeaser } from '@/components/home/PackagesTeaser';
import { DestinationsRow } from '@/components/home/DestinationsRow';
import { RichText } from '@/components/content/RichText';
import { useSectionReader } from '@/lib/content/sectionRead';
import type { PublicSection } from '@/lib/content/useSections';
import { SectionShell, isDarkTone } from '../SectionShell';

export function PackagesTeaserSection({ section }: { section: PublicSection }) {
  const { t } = useTranslation();
  const r = useSectionReader(section);
  const tone = r.select('tone', 'cream');
  const dark = isDarkTone(tone);
  const ctaLabel = r.text('ctaLabel');
  const ctaHref = r.link('ctaHref') || '/find-your-journey';
  const titleLead = r.text('titleLead');
  const heading = r.rich('heading');

  return (
    <SectionShell id={section.slug} tone={tone}>
      <div className="text-center mx-auto max-w-prose mb-5">
        {r.has('eyebrow') && (
          <div className={`text-eyebrow uppercase tracking-eyebrow mb-4 ${dark ? 'text-cream/70' : 'text-ink-600'}`}>
            {r.text('eyebrow')}
          </div>
        )}
        {(titleLead || heading) && (
          <h2 className={`font-serif font-medium text-display leading-tight text-balance ${dark ? 'text-cream' : 'text-ink'}`}>
            {titleLead && <>{titleLead} </>}
            {heading && <RichText value={heading} />}
          </h2>
        )}
      </div>
      {r.has('intro') && (
        <p className={`text-center max-w-prose mx-auto mb-12 md:mb-14 ${dark ? 'text-cream/80' : 'text-ink-600'}`}>
          {r.text('intro')}
        </p>
      )}

      <PackagesTeaser />

      {ctaLabel && (
        <div className="mt-12 text-center">
          <Link to={ctaHref} className="btn-secondary">
            {ctaLabel || t('home.packages.viewAll')}
          </Link>
        </div>
      )}
    </SectionShell>
  );
}

export function DestinationsRowSection({ section }: { section: PublicSection }) {
  const r = useSectionReader(section);
  return (
    <DestinationsRow
      id={section.slug}
      tone={r.select('tone', 'cream')}
      heading={r.rich('heading')}
      intro={r.text('intro')}
      ctaLabel={r.text('ctaLabel')}
    />
  );
}
