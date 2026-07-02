import { motion, useReducedMotion } from 'framer-motion';

export interface LifeOnboardItem {
  key: string;
  title: string;
  descriptor: string;
  image: string;
}

export interface LifeOnboardGridProps {
  items: LifeOnboardItem[];
}

/**
 * Editorial showcase grid for the "Life on board" section of a ship page.
 *
 * Non-navigating tiles by design — the target experience routes are not
 * built yet, so these are presentational <article> cards (no anchors, no
 * navigating CTA). A more detailed, classier evolution of the plain image
 * tiles that previously lived inline in ShipDetail.tsx.
 */
export function LifeOnboardGrid({ items }: LifeOnboardGridProps) {
  const reduce = useReducedMotion();

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((item, i) => (
        <motion.article
          key={item.key}
          initial={{ opacity: 0, y: reduce ? 0 : 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{
            duration: 0.6,
            ease: [0.22, 1, 0.36, 1],
            delay: i * 0.06,
          }}
        >
          <div className="group relative aspect-[3/4] overflow-hidden rounded-card bg-cream-200 ring-1 ring-cream-300/50 transition-transform duration-500 ease-out-soft hover:-translate-y-1 shadow-[0_24px_60px_-36px_rgba(12,35,64,0.4)]">
            <img
              src={item.image}
              alt={`${item.title} aboard the ship`}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1400ms] ease-out-soft group-hover:scale-105"
            />

            {/* Bottom scrim — deep enough for legible serif over any photo */}
            <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/35 to-transparent" />

            {/* Subtle film grain for warmth */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-grain opacity-[0.06] mix-blend-soft-light"
            />

            {/* Index */}
            <span className="absolute left-4 top-4 font-serif text-sm text-cream/70">
              {String(i + 1).padStart(2, '0')}
            </span>

            {/* Caption */}
            <div className="absolute bottom-0 left-0 right-0 p-5 text-cream">
              <div className="mb-3 h-px w-8 bg-accent-goldSoft/80" />
              <h3 className="font-serif text-xl leading-tight md:text-2xl">
                {item.title}
                <span
                  aria-hidden="true"
                  className="ml-1.5 inline-block not-italic text-accent-goldSoft/90 transition-transform duration-500 ease-out-soft group-hover:translate-x-1"
                >
                  &rsaquo;
                </span>
              </h3>
              <p className="mt-1.5 text-pretty text-sm leading-snug text-cream/80">
                {item.descriptor}
              </p>
            </div>
          </div>
        </motion.article>
      ))}
    </div>
  );
}
