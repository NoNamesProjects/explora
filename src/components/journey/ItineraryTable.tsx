import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import * as Accordion from '@radix-ui/react-accordion';
import { portImage, destinationImage, seaDayImage } from '@/lib/portImages';
import type { JourneyDay } from '@/lib/api';

/**
 * Day-by-day itinerary as an expandable editorial table — one row per day or
 * per multi-day stay. A trigger row shows a thumbnail, the day label, the port
 * (+ country), and a muted derived-date/times line; expanding reveals a larger
 * photo and structured fact rows. Per-day dates are derived from the sailing
 * date + (dayNumber − 1) in UTC (there is no per-day date in the DB). Photos
 * resolve from the port-image map, falling back to the region placeholder.
 */

const CHEVRON = (
  <svg
    width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
    className="shrink-0 text-ink/40 transition-all duration-300 group-hover:text-accent-patina group-data-[state=open]:rotate-180" aria-hidden
  >
    <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

interface ItineraryTableProps {
  days: JourneyDay[];
  region: string | null;
  sailingDate: string;
  embkTime: string | null;
  disEmbkTime: string | null;
}

/** Derive a day's calendar date from the sailing date + (dayNumber − 1), UTC. */
function dayDate(sailingDateIso: string, dayNumber: number, locale: string): string | null {
  const base = new Date(sailingDateIso);
  if (Number.isNaN(base.getTime())) return null;
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + (dayNumber - 1));
  return d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}

/** A day with no port (or an explicit "At Sea" name) is a sea day. */
function isSeaDay(d: JourneyDay): boolean {
  return !d.portCd || (d.portName ?? '').trim().toLowerCase() === 'at sea';
}

interface Row {
  startDay: number;
  endDay: number;
  day: JourneyDay;
  endDayData?: JourneyDay;
}

/**
 * Build the display rows: an overnight day whose NEXT day shares the same
 * non-null portCd merges into a single Day N–M stay (the partner day is
 * consumed; departure comes from the end day); otherwise a single-day row.
 */
function buildRows(days: JourneyDay[]): Row[] {
  const sorted = [...days].sort((a, b) => a.dayNumber - b.dayNumber);
  const rows: Row[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const day = sorted[i];
    const next = sorted[i + 1];
    if (
      day.overnight &&
      day.portCd &&
      next &&
      next.portCd &&
      next.portCd === day.portCd
    ) {
      rows.push({ startDay: day.dayNumber, endDay: next.dayNumber, day, endDayData: next });
      i++; // consume the partner day
    } else {
      rows.push({ startDay: day.dayNumber, endDay: day.dayNumber, day });
    }
  }
  return rows;
}

function FactRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-4 py-2.5 border-b border-cream-300/40 last:border-b-0">
      <dt className="w-28 shrink-0 text-eyebrow uppercase tracking-eyebrow text-ink-600 pt-0.5">{label}</dt>
      <dd className="text-ink">{children}</dd>
    </div>
  );
}

export function ItineraryTable({ days, region, sailingDate, embkTime, disEmbkTime }: ItineraryTableProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || 'en';
  const rows = buildRows(days);

  return (
    <Accordion.Root type="single" collapsible className="relative">
      {rows.map((row, idx) => {
        const { day, endDayData, startDay, endDay } = row;
        const sea = isSeaDay(day);
        const isFirst = idx === 0;
        const isLast = idx === rows.length - 1;
        const prevSea = idx > 0 && isSeaDay(rows[idx - 1].day);
        const nextSea = idx < rows.length - 1 && isSeaDay(rows[idx + 1].day);

        // Route-rail connectors: a hairline gold line threading the day markers.
        // Drawn as two half-lines that meet at the marker's vertical centre
        // (top 0→50%, bottom 50%→100%) so the line self-aligns to any row height
        // and stays continuous between adjacent days. Dashed around At-Sea days;
        // first/last ends are clipped so the line never dangles past the voyage.
        const halfBase = 'absolute left-1/2 -translate-x-1/2 w-0 border-l';
        const topLine = `${halfBase} top-0 h-1/2 ${sea || prevSea ? 'border-dashed border-accent-gold/55' : 'border-accent-gold/40'}`;
        const bottomLine = `${halfBase} top-1/2 bottom-0 ${sea || nextSea ? 'border-dashed border-accent-gold/55' : 'border-accent-gold/40'}`;

        const portName = sea
          ? t('journey.itinerary.atSea')
          : (day.portName ?? day.portCd ?? t('journey.itinerary.atSea'));
        const country = sea ? null : day.country;

        const dayLabel = startDay === endDay
          ? t('journey.itinerary.day', { n: startDay })
          : t('journey.itinerary.dayRange', { from: startDay, to: endDay });

        const dateLabel = dayDate(sailingDate, startDay, locale);
        const dep = (endDayData ?? day).departureTime;
        const arr = day.arrivalTime;

        let timeLabel: string;
        if (sea) {
          timeLabel = t('journey.itinerary.atSea');
        } else if (isFirst) {
          timeLabel = [
            embkTime ? `${t('journey.itinerary.embarkation')} ${embkTime}` : t('journey.itinerary.embarkation'),
            dep ? `${t('journey.itinerary.departure')} ${dep}` : null,
          ].filter(Boolean).join('  ·  ');
        } else if (isLast) {
          timeLabel = [
            arr ? `${t('journey.itinerary.arrival')} ${arr}` : t('journey.itinerary.arrival'),
            disEmbkTime ? `${t('journey.itinerary.disembarkation')} ${disEmbkTime}` : t('journey.itinerary.disembarkation'),
          ].filter(Boolean).join('  ·  ');
        } else {
          const parts = [
            arr ? `${t('journey.itinerary.arrival')} ${arr}` : null,
            dep ? `${t('journey.itinerary.departure')} ${dep}` : null,
          ].filter(Boolean);
          timeLabel = parts.length ? parts.join('  ·  ') : t('journey.itinerary.inPort');
        }

        // Split the composed time string into its parts so the desktop layout can
        // stack them right-aligned (e.g. "Arrival 09:00" / "Departure 17:00").
        const timeParts = timeLabel.split('·').map((s) => s.trim()).filter(Boolean);

        const thumbSrc = sea
          ? seaDayImage()
          : portImage(day.portCd) ?? destinationImage(day.portCd, region);
        const photoSrc = thumbSrc;
        const photoAlt = sea ? t('journey.itinerary.atSea') : portName;

        return (
          <Accordion.Item key={`${startDay}-${endDay}-${idx}`} value={`day-${idx}`} className="relative">
            <Accordion.Header>
              <Accordion.Trigger className="group grid w-full grid-cols-[3rem,1fr] md:grid-cols-[3.5rem,1fr] gap-4 md:gap-6 text-left">
                {/* Voyage route rail — gold line threading the centred day markers. */}
                <div className="relative" aria-hidden>
                  {!isFirst && <span className={topLine} />}
                  {!isLast && <span className={bottomLine} />}
                  <div className="absolute left-1/2 top-1/2 z-10 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center">
                    {sea ? (
                      <span className="h-3 w-3 rounded-full border border-accent-gold/60 bg-cream" />
                    ) : (
                      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-accent-gold/60 bg-cream font-serif text-lg leading-none text-accent-tan shadow-[0_3px_12px_-5px_rgba(12,35,64,0.4)] transition-colors group-hover:border-accent-gold group-hover:text-accent-patina">
                        {startDay}
                      </span>
                    )}
                  </div>
                </div>

                {/* Row content — photo · port · times · chevron, spanning the width. */}
                <div className="flex items-center gap-5 md:gap-7 py-7">
                  <img
                    src={thumbSrc}
                    alt=""
                    loading="lazy"
                    className="h-24 w-32 md:h-28 md:w-48 shrink-0 rounded-card object-cover bg-cream-200 ring-1 ring-cream-300/70 transition-transform duration-500 ease-out-soft group-hover:scale-[1.02]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 text-eyebrow uppercase tracking-eyebrow text-accent-tan mb-2">
                      <span>{dayLabel}</span>
                      {day.overnight && (
                        <>
                          <span aria-hidden className="h-1 w-1 rounded-full bg-accent-gold/70" />
                          <span>{t('journey.itinerary.overnight')}</span>
                        </>
                      )}
                    </div>
                    <div className="font-serif text-3xl md:text-4xl lg:text-5xl text-ink leading-[1.05] transition-colors group-hover:text-accent-patina">
                      {portName}
                      {country && <span className="not-italic font-sans text-base md:text-lg text-ink-500 align-baseline">, {country}</span>}
                    </div>
                    <div className="mt-3 text-eyebrow uppercase tracking-eyebrow text-ink-600">
                      {dateLabel}
                      {timeLabel && (
                        <span className="md:hidden">{dateLabel ? '  ·  ' : ''}{timeLabel}</span>
                      )}
                    </div>
                  </div>

                  {/* Right-aligned times (desktop) — the row's right anchor. */}
                  {timeParts.length > 0 && (
                    <div className="hidden md:flex shrink-0 flex-col items-end gap-1.5 pl-4 text-right">
                      {timeParts.map((p, i) => (
                        <span key={i} className="text-[0.72rem] uppercase tracking-[0.16em] text-ink-600 whitespace-nowrap">
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                  {CHEVRON}
                </div>
              </Accordion.Trigger>
            </Accordion.Header>

            <Accordion.Content className="overflow-hidden data-[state=open]:animate-fade-up">
              <div className="grid md:grid-cols-[1.2fr,1fr] gap-6 md:gap-10 pb-12 md:pl-[5rem]">
                <img
                  src={photoSrc}
                  alt={photoAlt}
                  loading="lazy"
                  className="aspect-[16/9] w-full rounded-card object-cover bg-cream-200 shadow-[0_24px_60px_-44px_rgba(12,35,64,0.5)]"
                />
                <div>
                  <h3 className="font-serif text-2xl md:text-3xl text-ink mb-5">
                    {sea ? t('journey.itinerary.atSea') : t('journey.itinerary.moreAbout', { port: portName })}
                  </h3>
                  <dl>
                    {dateLabel && (
                      <FactRow label={t('journey.itinerary.dateLabel')}>{dateLabel}</FactRow>
                    )}
                    {!sea && arr && (
                      <FactRow label={t('journey.itinerary.arrival')}>{arr}</FactRow>
                    )}
                    {!sea && dep && (
                      <FactRow label={t('journey.itinerary.departure')}>{dep}</FactRow>
                    )}
                    {country && (
                      <FactRow label={t('journey.itinerary.country')}>{country}</FactRow>
                    )}
                    {day.overnight && (
                      <FactRow label={t('journey.itinerary.overnight')}>
                        {t('journey.itinerary.overnightNote', { defaultValue: 'Overnight stay in port' })}
                      </FactRow>
                    )}
                  </dl>
                  {day.description && (
                    <p className="mt-5 text-ink-600 leading-relaxed max-w-prose">{day.description}</p>
                  )}
                </div>
              </div>
            </Accordion.Content>
          </Accordion.Item>
        );
      })}
    </Accordion.Root>
  );
}
