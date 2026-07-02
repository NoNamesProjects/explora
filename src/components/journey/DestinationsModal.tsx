import * as Dialog from '@radix-ui/react-dialog';
import { useTranslation } from 'react-i18next';
import { destinationImage } from '@/lib/portImages';
import type { JourneyCard as JourneyCardData, JourneyDestination } from '@/lib/api';

interface DestinationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: JourneyCardData;
  /** "A → B" route title. */
  title: string;
  /** "SHIP · N nights" eyebrow. */
  subtitle: string;
  /** Resolved region label (already translated), optional. */
  regionLabel?: string;
  /** Full ordered destination list (sea days already excluded). */
  destinations: JourneyDestination[];
}

/**
 * Turn a country value into a readable, locale-aware name. Ports store ISO-2
 * codes ('GB', 'NO'), so resolve them via Intl.DisplayNames ('GB' → 'United
 * Kingdom', localized). Falls back to the raw value if it's already a name, or
 * null for an unresolvable code.
 */
function countryName(c: string | null, locale: string): string | null {
  if (!c) return null;
  const s = c.trim();
  if (!s) return null;
  if (/^[A-Za-z]{2}$/.test(s)) {
    try {
      const name = new Intl.DisplayNames([locale || 'en'], { type: 'region' }).of(s.toUpperCase());
      if (name && name.toUpperCase() !== s.toUpperCase()) return name;
    } catch {
      /* unsupported code */
    }
    return null; // unresolved 2-letter code — hide it rather than show 'XZ'
  }
  return s.length > 3 ? s : null;
}

/**
 * Every destination of a journey — a photo hero (route + ship overlaid) over a
 * scrollable itinerary list where each stop carries a thumbnail, its day + date
 * (+ country), joined by a continuous gold timeline rail. Opens instantly from
 * the data already on the card (no fetch). Warm-maritime cream/ink.
 */
export function DestinationsModal({
  open,
  onOpenChange,
  card,
  title,
  subtitle,
  regionLabel,
  destinations,
}: DestinationsModalProps) {
  const { t, i18n } = useTranslation();
  const heroSrc = destinationImage(card.sailingPort, card.region);

  /** Calendar date of a given itinerary day (day 1 = embark date), in UTC. */
  const dateFor = (day: number): string => {
    const d = new Date(card.sailingDate);
    d.setUTCDate(d.getUTCDate() + Math.max(0, day - 1));
    return d.toLocaleDateString(i18n.language || undefined, {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/55 backdrop-blur-sm animate-fade-up motion-reduce:animate-none" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[86vh] w-[94vw] max-w-4xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-card bg-cream shadow-2xl">
          {/* Hero — the journey's embark/region photo with the route overlaid */}
          <div className="relative h-44 shrink-0 overflow-hidden bg-ink md:h-52">
            <img src={heroSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/45 to-ink/10" aria-hidden />
            <div className="absolute inset-0 bg-grain opacity-[0.12] mix-blend-overlay pointer-events-none" aria-hidden />
            <Dialog.Close
              aria-label={t('booking.suiteModal.close', { defaultValue: 'Close' })}
              className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-cream/85 text-ink transition-colors ease-out-soft hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </Dialog.Close>
            <div className="absolute inset-x-0 bottom-0 p-6 text-cream [text-shadow:0_1px_10px_rgba(12,35,64,0.55)]">
              {regionLabel && (
                <div className="mb-1.5 text-[0.6rem] uppercase tracking-[0.18em] text-cream/80">{regionLabel}</div>
              )}
              <Dialog.Title className="font-serif text-2xl leading-tight text-balance text-cream md:text-3xl">
                {title}
              </Dialog.Title>
              <Dialog.Description className="mt-1.5 text-xs uppercase tracking-[0.14em] text-cream/85">
                {subtitle} ·{' '}
                {t('journey.destinationsModal.stops', {
                  count: destinations.length,
                  defaultValue: '{{count}} destinations',
                })}
              </Dialog.Description>
            </div>
          </div>

          {/* Itinerary list */}
          <ol className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-8">
            {destinations.map((d, i) => {
              const country = countryName(d.country, i18n.language);
              const first = i === 0;
              const last = i === destinations.length - 1;
              return (
                <li key={`${d.day}-${d.code}-${i}`} className="relative flex items-center gap-5 py-4">
                  {/* Continuous gold timeline rail (self-aligning half-lines + dot) */}
                  <span aria-hidden className="relative w-3 shrink-0 self-stretch">
                    {!first && <span className="absolute left-1/2 top-0 h-1/2 w-px -translate-x-1/2 bg-accent-gold/40" />}
                    {!last && <span className="absolute bottom-0 left-1/2 top-1/2 w-px -translate-x-1/2 bg-accent-gold/40" />}
                    <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-gold ring-2 ring-cream" />
                  </span>

                  {/* Destination photo */}
                  <img
                    src={destinationImage(d.code, card.region)}
                    alt={d.name}
                    loading="lazy"
                    className="h-20 w-28 shrink-0 rounded-card bg-cream-200 object-cover md:h-24 md:w-36"
                  />

                  {/* Name + meta */}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-serif text-xl leading-tight text-ink md:text-2xl">{d.name}</div>
                    <div className="mt-1 text-[0.78rem] uppercase tracking-[0.12em] text-ink-500">
                      {t('journey.destinationsModal.day', { day: d.day, defaultValue: 'Day {{day}}' })} · {dateFor(d.day)}
                      {country ? ` · ${country}` : ''}
                    </div>
                  </div>

                  {/* Arrival / departure times, right-aligned */}
                  {(d.arrivalTime || d.departureTime) && (
                    <div className="shrink-0 space-y-1 pl-4 text-right tabular-nums">
                      {d.arrivalTime && (
                        <div className="flex items-baseline justify-end gap-2.5 whitespace-nowrap text-base leading-tight text-ink md:text-lg">
                          <span className="text-[0.68rem] uppercase tracking-[0.14em] text-ink-400">
                            {t('journey.itinerary.arrival', { defaultValue: 'Arrival' })}
                          </span>
                          {d.arrivalTime}
                        </div>
                      )}
                      {d.departureTime && (
                        <div className="flex items-baseline justify-end gap-2.5 whitespace-nowrap text-base leading-tight text-ink md:text-lg">
                          <span className="text-[0.68rem] uppercase tracking-[0.14em] text-ink-400">
                            {t('journey.itinerary.departure', { defaultValue: 'Departure' })}
                          </span>
                          {d.departureTime}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
