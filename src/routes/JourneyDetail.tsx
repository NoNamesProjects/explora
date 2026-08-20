import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { api, ApiError, type JourneyDetail } from '@/lib/api';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { getShipAssets, cabinImageForSuite, suiteTierKey } from '@/lib/shipAssets';
import { groupSuites } from '@/lib/bookingUI';
import { destinationImage } from '@/lib/portImages';
import { useDocumentMeta, useJsonLd } from '@/lib/useDocumentMeta';
import type { SubNavSection } from '@/components/ship/StickySubNav';
import { JourneySubNav } from '@/components/journey/JourneySubNav';
import { ItineraryTable } from '@/components/journey/ItineraryTable';
import { InclusionsBlock } from '@/components/journey/InclusionsBlock';
import { OnboardExperiences } from '@/components/journey/OnboardExperiences';
import { JourneyFaq } from '@/components/journey/JourneyFaq';
import { SuitePreviewModal } from '@/components/booking/SuitePreviewModal';
import { ShipInfoModal } from '@/components/ship/ShipInfoModal';

export default function JourneyDetailRoute() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const [detail, setDetail] = useState<JourneyDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.journeys.byId(id)
      .then((res) => { if (!cancelled) setDetail(res); })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) setError('not-found');
        else setError('error');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  // ── Per-route metadata ────────────────────────────────────────────────────
  // MUST sit above the loading/error early-returns: these are hooks, and the
  // returns below are conditional, so placing them lower would change hook
  // order between renders. `ready` gates the write until the data lands.
  const metaJourney = detail?.journey;
  const metaFrom = metaJourney?.sailingPortName ?? metaJourney?.sailingPort ?? null;
  const metaTo = metaJourney?.terminationPortName ?? metaJourney?.terminationPort ?? null;
  const metaRoute = metaFrom && metaTo ? `${metaFrom} to ${metaTo}` : (metaJourney?.itinDesc ?? '');
  const metaTitle = metaJourney
    ? `${metaJourney.nights}-night ${metaRoute}`.trim()
    : undefined;
  const metaDesc = metaJourney
    ? (metaJourney.summary
      ?? `A ${metaJourney.nights}-night all-suite voyage${metaFrom ? ` departing ${metaFrom}` : ''}`
        + `${metaJourney.sailingDate ? ` on ${metaJourney.sailingDate}` : ''}`
        + `${metaTo ? ` and arriving ${metaTo}` : ''}. View the full itinerary, suites and fares.`)
    : undefined;

  useDocumentMeta({
    title: metaTitle,
    description: metaDesc ?? undefined,
    image: metaJourney?.heroImage ?? undefined,
    ready: !!metaJourney,
  });

  // TouristTrip is the closest schema.org type for a cruise itinerary and is
  // what actually earns rich results for this page shape.
  useJsonLd(metaJourney ? {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: metaTitle,
    description: metaDesc,
    ...(metaJourney.heroImage ? { image: metaJourney.heroImage } : {}),
    ...(metaFrom ? { departureLocation: { '@type': 'Place', name: metaFrom } } : {}),
    ...(metaTo ? { arrivalLocation: { '@type': 'Place', name: metaTo } } : {}),
    ...(metaJourney.sailingDate ? { startDate: metaJourney.sailingDate } : {}),
    ...(metaJourney.lowestPriceEUR != null ? {
      offers: {
        '@type': 'Offer',
        price: metaJourney.lowestPriceEUR,
        priceCurrency: 'EUR',
        availability: 'https://schema.org/InStock',
      },
    } : {}),
  } : null);

  if (loading) {
    return (
      <div className="container py-section-y">
        <div className="h-12 bg-cream-200 animate-pulse w-1/2 mb-6" />
        <div className="h-6 bg-cream-200 animate-pulse w-1/3" />
      </div>
    );
  }

  if (error === 'not-found') {
    return (
      <div className="container py-section-y text-center">
        <h1 className="font-serif text-display font-medium mb-6">{t('journeyDetail.notFoundTitle', { defaultValue: 'Sailing not found' })}</h1>
        <p className="text-ink-600 mb-10">{t('journeyDetail.notFoundBody', { defaultValue: 'This journey may no longer be available.' })}</p>
        <Link to="/find-your-journey" className="btn-secondary">{t('journeyDetail.backToSearch', { defaultValue: 'Back to search' })}</Link>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="container py-section-y text-center">
        <h1 className="font-serif text-display font-medium mb-6">{t('journeyDetail.errorTitle', { defaultValue: "Couldn't load this sailing" })}</h1>
        <Link to="/find-your-journey" className="btn-secondary">{t('journeyDetail.backToSearch', { defaultValue: 'Back to search' })}</Link>
      </div>
    );
  }

  const { journey, ship, days, fares } = detail;
  const locale = i18n.language || 'en';
  const shipSlug = shipCdToSlug(ship?.ship_cd);
  const shipImage = ship?.hero_image ?? (() => {
    try { return getShipAssets(shipSlug).hero; } catch { return getShipAssets('explora-i').hero; }
  })();
  // Hero = the departure-port destination photo (region/ocean fallback), not the ship.
  // Custom packages ship their own art and copy; feed sailings derive both from
  // the port/region and the generated overview line.
  const isCustom = !!journey.isCustom;
  const heroImage = journey.heroImage || destinationImage(journey.sailingPort, journey.region);
  const customBody = locale.startsWith('el')
    ? journey.descriptionEl || journey.description
    : journey.description;
  const customSummary = locale.startsWith('el')
    ? journey.summaryEl || journey.summary
    : journey.summary;
  const dateFmt: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  const departureDate = new Date(journey.sailingDate).toLocaleDateString(locale, dateFmt);
  // Return/arrival date = sailing date + nights (an N-night sailing disembarks N days later).
  const arrivalDate = (() => {
    const d = new Date(journey.sailingDate);
    d.setDate(d.getDate() + journey.nights);
    return d.toLocaleDateString(locale, dateFmt);
  })();
  const fromPort = journey.sailingPortName ?? journey.sailingPort;
  const toPort = journey.terminationPortName ?? journey.terminationPort;

  // One card per suite *type*, cheapest-first — variants that share a name
  // (OT1–OT4 → "Ocean Terrace Suite") collapse into a single card, and
  // unavailable/unpriced cabins drop out. Shared with the booking step.
  const suiteGroups = groupSuites(detail);

  // Tier tagline lookup (e.g. "A private wellness retreat…") for the suite cards.
  const suiteTiers = (t('ship.tiers', { returnObjects: true }) as { key: string; tagline: string }[]) ?? [];
  const taglineByKey = new Map(suiteTiers.map((x) => [x.key, x.tagline]));

  // Lowest EUR fare across all suites — shown in the reserve card and the
  // sticky navy detail bar. Plain computation (not a hook).
  const minPrice = fares
    .filter((f) => f.currency === 'EUR')
    .flatMap((f) => Object.values(f.prices).filter((v): v is number => typeof v === 'number'))
    .reduce((a, b) => (a == null || b < a ? b : a), null as number | null);
  const minPriceLabel = minPrice != null ? `€${Math.round(minPrice).toLocaleString(locale)}` : null;

  // Sub-nav anchors — push ship/suites only when present so the scroll-spy
  // never points at a dead anchor. Plain const (NOT useMemo): this runs below
  // the loading/error early-returns, so a hook here would break hook ordering.
  const subNavSections: SubNavSection[] = [
    { id: 'overview', label: t('journey.nav.overview') },
    { id: 'itinerary', label: t('journey.nav.itinerary') },
    { id: 'inclusions', label: t('journey.nav.inclusions') },
  ];
  // Order matches the on-page section order: Suites (cabins) come BEFORE the Ship card.
  if (suiteGroups.length > 0) subNavSections.push({ id: 'suites', label: t('journey.nav.suites') });
  if (ship) subNavSections.push({ id: 'ship', label: t('journey.nav.ship') });
  subNavSections.push({ id: 'onboard', label: t('journey.nav.onboard') });
  subNavSections.push({ id: 'faq', label: t('journey.nav.faq') });

  return (
    <>
      {/* ═══════════════════ HERO ═══════════════════════════════════════ */}
      <section className="relative min-h-[78vh] flex items-end overflow-hidden bg-ink">
        <img
          src={heroImage}
          alt={fromPort ?? journey.itinDesc ?? ''}
          className="absolute inset-0 w-full h-full object-cover animate-slow-zoom"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/45 via-ink/20 to-ink/90 pointer-events-none" aria-hidden />
        <div className="absolute inset-0 bg-grain opacity-[0.12] mix-blend-overlay pointer-events-none" aria-hidden />

        <div className="relative container pb-24 pt-32 text-cream">
          <Breadcrumb
            variant="light"
            items={[
              { label: t('nav.home'), href: '/' },
              { label: t('nav.findAJourney'), href: '/find-your-journey' },
              { label: fromPort && toPort ? `${fromPort} → ${toPort}` : journey.itinDesc ?? t('journeyDetail.breadcrumbFallback', { defaultValue: 'Journey' }) },
            ]}
            className="mb-8 opacity-90"
          />
          <span aria-hidden className="mb-6 block h-px w-12 bg-accent-goldSoft/80" />
          <div className="text-[0.7rem] uppercase tracking-[0.22em] mb-5 text-cream/85">
            {t('journeyDetail.heroMeta', {
              ship: ship?.ship_name ?? journey.shipCd,
              nights: journey.nights,
              date: departureDate,
              defaultValue: '{{ship}} · {{nights}} nights · {{date}}',
            })}
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="font-serif text-hero-xl font-medium leading-[1.05] text-balance max-w-4xl text-cream"
          >
            {fromPort && toPort
              ? <>{fromPort} <em className="font-serif italic font-normal">{t('journeyDetail.toConnector', { defaultValue: 'to' })}</em> {toPort}</>
              : journey.itinDesc ?? t('journeyDetail.sailingFallback', { defaultValue: 'Sailing' })}
          </motion.h1>
        </div>
      </section>

      <JourneySubNav
        sections={subNavSections}
        fields={[
          { label: t('journeyDetail.fields.departs', { defaultValue: 'Departs' }), value: departureDate },
          { label: t('journeyDetail.fields.arrives', { defaultValue: 'Arrives' }), value: arrivalDate },
          { label: t('journeyDetail.fields.departurePort', { defaultValue: 'Departure port' }), value: fromPort ?? '—' },
          { label: t('journeyDetail.fields.returnPort', { defaultValue: 'Return port' }), value: toPort ?? '—' },
          { label: t('journeyDetail.fields.nights', { defaultValue: 'Nights' }), value: String(journey.nights) },
        ]}
        priceFrom={minPriceLabel}
        reserveHref={`/journeys/${id}/book/guests`}
      />

      {/* ═══════════════════ OVERVIEW + PRICE BLOCK ═════════════════════ */}
      <section id="overview" className="py-section-y bg-cream scroll-mt-32">
        <div className="container grid gap-12 lg:gap-16 lg:grid-cols-[1.6fr,1fr] items-start max-w-page">
          <div>
            <div className="eyebrow mb-4">{t('journeyDetail.overview', { defaultValue: 'Overview' })}</div>
            <h2 className="font-serif text-display-sm mb-6 leading-tight">
              {journey.itinDesc ?? t('journeyDetail.nightsAtSea', { nights: journey.nights, defaultValue: '{{nights}} nights at sea' })}
            </h2>
            {isCustom ? (
              <div className="max-w-prose space-y-4">
                {customSummary && <p className="text-ink-soft text-lg text-pretty">{customSummary}</p>}
                {customBody && customBody.split('\n').filter(Boolean).map((para: string, i: number) => (
                  <p key={i} className="text-ink-soft text-pretty">{para}</p>
                ))}
                {!customSummary && !customBody && (
                  <p className="text-ink-soft text-lg text-pretty">
                    {t('journeyDetail.customFallback', {
                      nights: journey.nights,
                      port: fromPort ?? '—',
                      date: departureDate,
                      defaultValue: 'A {{nights}}-night journey departing {{port}} on {{date}}.',
                    })}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-ink-soft text-lg text-pretty max-w-prose">
                {t('journeyDetail.overviewBody', {
                  nights: journey.nights,
                  ship: ship?.ship_name ?? journey.shipCd,
                  port: fromPort ?? '—',
                  date: departureDate,
                  defaultValue: 'A {{nights}}-night sailing aboard {{ship}}, departing {{port}} on {{date}}.',
                })}
              </p>
            )}

            {isCustom && (journey.inclusions?.length ?? 0) > 0 && (
              <ul className="mt-8 grid gap-x-8 gap-y-2 sm:grid-cols-2 max-w-prose">
                {journey.inclusions!.map((inc) => (
                  <li key={inc} className="flex items-start gap-2 text-ink-soft">
                    <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent-gold" />
                    <span>{inc}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-10 pt-8 border-t border-cream-300">
              <Fact label={t('journeyDetail.fields.departs', { defaultValue: 'Departs' })} value={departureDate} />
              <Fact label={t('journeyDetail.fields.from', { defaultValue: 'From' })} value={fromPort ?? '—'} />
              <Fact label={t('journeyDetail.fields.to', { defaultValue: 'To' })} value={toPort ?? '—'} />
              <Fact label={t('journeyDetail.fields.nights', { defaultValue: 'Nights' })} value={String(journey.nights)} />
            </div>
          </div>

          {/* Price block */}
          <div className="lg:sticky lg:top-32 bg-cream-soft border border-cream-300 rounded-card p-7 md:p-8 shadow-[0_28px_64px_-40px_rgba(12,35,64,0.5)]">
            <span aria-hidden className="mb-5 block h-px w-10 bg-accent-gold" />
            <div className="text-[0.7rem] uppercase tracking-[0.16em] text-ink-600 mb-1.5">{t('journeyDetail.lowestFrom', { defaultValue: 'Lowest from' })}</div>
            <div className="font-sans font-bold tabular-nums text-4xl text-ink leading-none mb-4">
              {minPriceLabel ?? '—'}
            </div>
            <p className="text-sm text-ink-600 leading-relaxed mb-7">{t('journeyDetail.perGuestNote', { defaultValue: 'Per guest, double occupancy. Fares vary by suite.' })}</p>
            <Link to={`/journeys/${id}/book/guests`} className="btn-primary w-full justify-center">{t('journeyDetail.reserveCta', { defaultValue: 'Reserve this journey' })}</Link>
          </div>
        </div>
      </section>

      {/* ═══════════════ CUSTOM PACKAGE GALLERY (owner's photos) ═══════════ */}
      {isCustom && (journey.photos?.length ?? 0) > 0 && (
        <section className="py-section-y bg-cream">
          <div className="container max-w-page">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {journey.photos!.map((p, i) => (
                <figure key={`${p.url}-${i}`} className="overflow-hidden bg-cream-200 aspect-[4/3] group">
                  <img
                    src={p.url}
                    alt={(locale.startsWith('el') ? p.altEl || p.altEn : p.altEn) ?? ''}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-[1400ms] ease-out-soft group-hover:scale-[1.04] motion-reduce:transition-none"
                  />
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════ DAY-BY-DAY ITINERARY ══════════════════════ */}
      <section id="itinerary" className="py-section-y bg-cream-soft border-y border-cream-300/60 scroll-mt-32">
        <div className="container">
          <div className="eyebrow text-ink-500 mb-4">{t('journey.itinerary.eyebrow')}</div>
          <h2 className="font-serif font-medium text-ink leading-[1.04] text-balance text-[clamp(2.25rem,5vw,3.5rem)] mb-9 md:mb-11">
            {t('journey.itinerary.titleLead')}{' '}
            <em className="font-serif italic font-normal">{t('journey.itinerary.titleHighlight')}</em>
          </h2>
          {days.length > 0 ? (
            <ItineraryTable
              days={days}
              region={journey.region}
              sailingDate={journey.sailingDate}
              embkTime={journey.embkTime}
              disEmbkTime={journey.disEmbkTime}
            />
          ) : (
            <p className="text-ink-600">{t('journey.itinerary.pending')}</p>
          )}
        </div>
      </section>

      {/* ═══════════════════ INCLUSIONS ═════════════════════════════════ */}
      <section id="inclusions" className="py-section-y bg-cream scroll-mt-32">
        <div className="container max-w-page">
          <InclusionsBlock />
        </div>
      </section>

      {/* ═══════════════════ FARES PER SUITE ═══════════════════════════ */}
      {suiteGroups.length > 0 && (
        <section id="suites" className="py-section-y bg-cream scroll-mt-32">
          <div className="container max-w-page">
            <SectionHeading
              eyebrow={t('journey.suites.eyebrow')}
              titleLead={t('journey.suites.titleLead')}
              highlight={t('journey.suites.titleHighlight')}
              align="center"
              className="mb-5"
            />
            <p className="text-ink-600 text-center max-w-prose mx-auto mb-12 md:mb-14">
              {t('ship.suitesIntro')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-7">
              {suiteGroups.map((g, i) => {
                // One display card per suite type. The whole card opens a detail
                // popup (gallery + Overview/Full Details/Inclusions) — the same
                // modal the booking flow uses — instead of navigating away.
                // Booking still starts from the main "Reserve" button; no cabin is
                // preselected from here.
                const suite = g.code;
                const name = g.name;
                const tierKey = suiteTierKey(suite);
                const tagline = taglineByKey.get(tierKey ?? '');

                const card = (
                  <div className="relative block aspect-[3/4] overflow-hidden rounded-card bg-ink shadow-[0_24px_60px_-44px_rgba(12,35,64,0.6)] transition-shadow duration-500 ease-out-soft group-hover:shadow-[0_40px_80px_-44px_rgba(12,35,64,0.75)]">
                    <img
                      src={cabinImageForSuite(journey.shipCd, suite)}
                      alt={name}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1400ms] ease-out-soft group-hover:scale-[1.06] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/95 via-ink/35 to-transparent" aria-hidden />

                    <div className="absolute inset-x-0 bottom-0 p-6 md:p-7 text-cream">
                      <div className="text-[0.6rem] uppercase tracking-[0.2em] text-cream/60 mb-2">{t('journeyDetail.suiteEyebrow', { defaultValue: 'Suite' })}</div>
                      <h3 className="font-serif text-2xl leading-tight">{name}</h3>
                      {tagline && (
                        <p className="mt-2 text-sm leading-relaxed text-cream/80 text-pretty max-w-[34ch] line-clamp-2">
                          {tagline}
                        </p>
                      )}
                      <span className="mt-5 inline-flex items-center gap-1.5 text-eyebrow uppercase tracking-eyebrow text-accent-goldSoft transition-colors duration-300 group-hover:text-cream">
                        {t('journeyDetail.exploreSuite', { defaultValue: 'Explore suite' })}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="motion-safe:transition-transform motion-safe:duration-300 group-hover:translate-x-1">
                          <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                        </svg>
                      </span>
                    </div>
                  </div>
                );

                return (
                  <motion.article
                    key={suite}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: (i % 3) * 0.07 }}
                  >
                    <SuitePreviewModal group={g} shipCd={journey.shipCd} reserveHref={`/journeys/${id}/book/guests`}>
                      <button
                        type="button"
                        aria-label={t('journeyDetail.exploreThe', { name, defaultValue: 'Explore the {{name}}' })}
                        className="group block w-full text-left transition-transform duration-500 ease-out-soft hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
                      >
                        {card}
                      </button>
                    </SuitePreviewModal>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════ SHIP CARD ══════════════════════════════════ */}
      {ship && (
        <section id="ship" className="py-section-y bg-cream-soft border-t border-cream-300/60 scroll-mt-32">
          <div className="container max-w-page grid gap-10 md:grid-cols-2 items-center">
            <div className="aspect-[16/10] overflow-hidden rounded-card bg-cream-200 shadow-[0_24px_60px_-44px_rgba(12,35,64,0.5)]">
              <img src={shipImage} alt={ship.ship_name} className="h-full w-full object-cover" loading="lazy" />
            </div>
            <div>
              <div className="eyebrow mb-3">{t('journey.nav.ship')}</div>
              <h3 className="font-serif text-display-sm mb-5">{ship.ship_name}</h3>
              <p className="text-ink-soft mb-8 max-w-prose text-lg">
                {t('journeyDetail.shipBlurb', { defaultValue: 'Designed to feel like your own private yacht — intimate suites, generous ocean views, and an unhurried rhythm at sea.' })}
              </p>
              {(ship.launch_year != null || ship.capacity != null || ship.decks != null) && (
                <dl className="grid grid-cols-3 gap-6 border-t border-cream-300 pt-6 mb-8">
                  {ship.launch_year != null && <Fact label={t('journeyDetail.fields.inService', { defaultValue: 'In service' })} value={String(ship.launch_year)} />}
                  {ship.capacity != null && <Fact label={t('journeyDetail.fields.guests', { defaultValue: 'Guests' })} value={String(ship.capacity)} />}
                  {ship.decks != null && <Fact label={t('journeyDetail.fields.decks', { defaultValue: 'Decks' })} value={String(ship.decks)} />}
                </dl>
              )}
              <ShipInfoModal shipSlug={shipSlug}>
                <button type="button" className="btn-secondary">{t('cta.exploreShip')}</button>
              </ShipInfoModal>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════ ONBOARD EXPERIENCES ════════════════════════ */}
      <section id="onboard" className="scroll-mt-32">
        <OnboardExperiences shipCd={journey.shipCd} />
      </section>

      {/* ═══════════════════ FAQ ═════════════════════════════════════════ */}
      <section id="faq" className="scroll-mt-32">
        <JourneyFaq />
      </section>

      {/* ═══════════════════ CONTACT CTA ═════════════════════════════════ */}
      <section id="contact" className="relative overflow-hidden py-section-y bg-ink text-cream">
        <div className="absolute inset-0 bg-grain opacity-25 mix-blend-soft-light pointer-events-none" aria-hidden />
        <div className="relative container max-w-editorial text-center">
          <span aria-hidden className="mx-auto mb-6 block h-px w-12 bg-accent-goldSoft" />
          <div className="eyebrow text-cream/70 mb-5">{t('journeyDetail.reserveEyebrow', { defaultValue: 'Reserve' })}</div>
          <h3 className="font-serif text-display mb-7 leading-tight">
            {t('journeyDetail.contactTitle', { defaultValue: 'Speak to a journey specialist' })}
          </h3>
          <p className="text-cream/80 mb-10 max-w-prose mx-auto text-lg">
            {t('journeyDetail.contactBody', { defaultValue: 'Personalised quotes, suite recommendations, and seasonal offers — by phone or email.' })}
          </p>
          <Link to="/contact" className="btn-ghost-light">{t('journeyDetail.requestQuote', { defaultValue: 'Request a quote' })}</Link>
        </div>
      </section>
    </>
  );
}

// Feed ship code (e.g. "EP01") → site ship-page slug ("explora-i"). Null-safe
// and not capped at six ships.
const SHIP_ROMAN = ['', 'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii'];
function shipCdToSlug(cd: string | null | undefined): string {
  if (!cd) return 'explora-i';
  const n = parseInt(String(cd).replace(/\D/g, ''), 10);
  return Number.isFinite(n) && n >= 1 ? `explora-${SHIP_ROMAN[n] ?? n}` : 'explora-i';
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-eyebrow uppercase tracking-eyebrow text-accent-tan mb-1.5">{label}</div>
      <div className="font-serif text-lg md:text-xl text-ink leading-snug">{value}</div>
    </div>
  );
}
