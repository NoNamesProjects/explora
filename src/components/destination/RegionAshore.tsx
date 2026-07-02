import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { imageUrl } from '@/lib/image';
import { ParallaxMedia } from '@/components/ship/ParallaxMedia';

/**
 * RegionAshore — the "ashore / experience the region" editorial section for a
 * destination-region page. Renders four alternating image/text feature blocks
 * (culture, culinary, history, nature) mirroring the house pattern in
 * src/routes/Experience.tsx: a md:grid-cols-2 row whose image and text sides
 * swap each row, with the section background alternating cream / cream-soft for
 * vertical rhythm.
 *
 * This is the airy, photography-forward refinement: each block image is wrapped
 * in <ParallaxMedia> for subtle scroll depth and rounded as a card; each text
 * column carries a small serif index numeral (01–04) above a thin gold rule as
 * an editorial accent, with a refined serif heading and a generously-leaded
 * blurb. Vertical rhythm is opened up (py-section-y) and the whole row fades up
 * on scroll, reduced-motion safe.
 *
 * Imagery is keyed off the region slug + block key via the placeholder ladder
 * (imageUrl → 'explora/placeholder/life-<slug>-<key>'), which always resolves
 * to a real photo or a procedural fallback — never broken.
 *
 * Copy (the blurb per block) is supplied via props (RegionCopy.ashore) so no
 * brand campaign copy is reproduced here; the eyebrow labels are original.
 */

interface RegionAshoreProps {
  label: string;
  slug: string;
  ashore: { culture: string; culinary: string; history: string; nature: string };
}

interface AshoreBlock {
  key: 'culture' | 'culinary' | 'history' | 'nature';
  labelKey: string;
  labelEn: string;
}

const BLOCKS: ReadonlyArray<AshoreBlock> = [
  { key: 'culture', labelKey: 'destination.ashore.culture', labelEn: 'Culture' },
  { key: 'culinary', labelKey: 'destination.ashore.culinary', labelEn: 'Culinary' },
  { key: 'history', labelKey: 'destination.ashore.history', labelEn: 'History' },
  { key: 'nature', labelKey: 'destination.ashore.nature', labelEn: 'Nature' },
];

export function RegionAshore({ label, slug, ashore }: RegionAshoreProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  return (
    <section id="ashore" aria-label={label}>
      {BLOCKS.map((block, i) => {
        const odd = i % 2 === 1;
        const heading = t(block.labelKey, { defaultValue: block.labelEn });
        const index = String(i + 1).padStart(2, '0');

        return (
          <div
            key={block.key}
            className={
              odd
                ? 'py-section-y bg-cream-soft border-y border-cream-300/50'
                : 'py-section-y bg-cream'
            }
          >
            <div className="container grid items-center gap-12 lg:gap-20 md:grid-cols-2 max-w-page">
              <motion.div
                initial={{ opacity: 0, y: reduceMotion ? 0 : 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className={odd ? '' : 'md:order-2'}
              >
                <ParallaxMedia
                  src={imageUrl(`explora/placeholder/life-${slug}-${block.key}`, {
                    w: 1040,
                    h: 832,
                    fit: 'cover',
                  })}
                  alt={`${heading} — ${label}`}
                  className="aspect-[5/4] rounded-card bg-cream-200 shadow-lg"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: reduceMotion ? 0 : 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                className={odd ? 'md:order-1' : ''}
              >
                <div className="mb-7 flex items-baseline gap-4">
                  <span
                    aria-hidden="true"
                    className="font-serif text-display-sm leading-none text-accent-goldSoft"
                  >
                    {index}
                  </span>
                  <span className="h-px flex-1 max-w-[3.5rem] bg-accent-gold/40" aria-hidden="true" />
                  <span className="eyebrow text-ink-500">
                    {heading}
                  </span>
                </div>

                <h3 className="font-serif font-normal text-display mb-6 text-ink text-balance">
                  {heading}
                </h3>

                <p className="text-ink-600 text-lg leading-loose max-w-prose text-pretty">
                  {ashore[block.key]}
                </p>
              </motion.div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
