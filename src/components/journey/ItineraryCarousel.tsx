import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Navigation, Pagination, Parallax, Keyboard } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/pagination';
import { destinationImage, seaDayImage } from '@/lib/portImages';
import type { JourneyDay } from '@/lib/api';

/**
 * Day-by-day itinerary as a cinematic "spotlight" carousel — the active day is a
 * large, sharp, centred image card; neighbours scale back with depth and dim into
 * the page behind a desaturated navy veil. Editorial (no autoplay): drive it with
 * the prev/next buttons, the pagination, arrow keys, swipe, or by clicking a side
 * card. Photos resolve from the port-image map (real where fetched, region/ocean
 * fallback otherwise — never a flag).
 */

const PREV_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const NEXT_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ARROW_CLS = [
  'w-12 h-12 md:w-14 md:h-14 inline-flex items-center justify-center rounded-full',
  'bg-ink text-cream shadow-lg transition-all duration-300 ease-out-soft',
  'hover:bg-ink-soft hover:scale-105',
  '[&.swiper-button-disabled]:opacity-25 [&.swiper-button-disabled]:cursor-not-allowed',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-mist focus-visible:ring-offset-2 focus-visible:ring-offset-cream-soft',
].join(' ');

const PAGINATION_CLS = [
  'itin-pagination flex justify-center items-center gap-2 mt-9',
  '[&_.swiper-pagination-bullet]:h-1.5 [&_.swiper-pagination-bullet]:w-1.5 [&_.swiper-pagination-bullet]:rounded-full',
  '[&_.swiper-pagination-bullet]:bg-ink/25 [&_.swiper-pagination-bullet]:opacity-100 [&_.swiper-pagination-bullet]:cursor-pointer',
  '[&_.swiper-pagination-bullet]:transition-all [&_.swiper-pagination-bullet]:duration-300',
  '[&_.swiper-pagination-bullet-active]:w-6 [&_.swiper-pagination-bullet-active]:bg-ink',
].join(' ');

interface ItineraryCarouselProps {
  days: JourneyDay[];
  region: string | null;
  nights?: number;
  fromPort?: string | null;
  toPort?: string | null;
}

export function ItineraryCarousel({ days, region, nights, fromPort, toPort }: ItineraryCarouselProps) {
  const { t } = useTranslation();
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const portCount = days.filter((d) => d.portCd).length;
  const summary = [
    nights ? t('journey.carousel.nightsCount', { count: nights, defaultValue: '{{count}} nights' }) : null,
    fromPort && toPort ? `${fromPort} → ${toPort}` : null,
    portCount ? t('journey.carousel.portsCount', { count: portCount, defaultValue: '{{count}} ports' }) : null,
  ].filter(Boolean).join('  ·  ');

  const showControls = days.length > 1;

  return (
    <div className="container max-w-page">
      {/* Heading + route summary + controls */}
      <div className="flex items-end justify-between gap-4 mb-10 md:mb-14">
        <div className="min-w-0">
          <div className="eyebrow mb-3">{t('journey.carousel.eyebrow', { defaultValue: 'Itinerary' })}</div>
          <h2 className="font-serif text-display md:text-hero-xl leading-[1.02] text-ink">
            {t('journey.carousel.heading', { defaultValue: 'Day by day' })}
          </h2>
          {summary && <div className="mt-3 text-sm md:text-base text-ink-600">{summary}</div>}
        </div>
        {showControls && (
          <div className="flex gap-2 md:gap-3 shrink-0">
            <button ref={prevRef} type="button" aria-label={t('journey.carousel.prevDay', { defaultValue: 'Previous day' })} className={ARROW_CLS}>{PREV_ICON}</button>
            <button ref={nextRef} type="button" aria-label={t('journey.carousel.nextDay', { defaultValue: 'Next day' })} className={ARROW_CLS}>{NEXT_ICON}</button>
          </div>
        )}
      </div>

      <Swiper
        modules={[EffectCoverflow, Navigation, Pagination, Parallax, Keyboard]}
        effect="coverflow"
        centeredSlides
        slidesPerView="auto"
        grabCursor
        parallax
        slideToClickedSlide
        keyboard={{ enabled: true }}
        loop={days.length > 4}
        speed={700}
        coverflowEffect={{ rotate: 0, stretch: 0, depth: 160, scale: 0.85, slideShadows: false }}
        navigation={{ prevEl: prevRef.current, nextEl: nextRef.current }}
        onBeforeInit={(swiper) => {
          const nav = swiper.params.navigation;
          if (nav && typeof nav !== 'boolean') {
            nav.prevEl = prevRef.current;
            nav.nextEl = nextRef.current;
          }
        }}
        pagination={{ el: '.itin-pagination', clickable: true }}
      >
        {days.map((d, i) => {
          const atSea = !d.portCd || (d.portName ?? '').trim().toLowerCase() === 'at sea';
          const atSeaLabel = t('journey.carousel.atSea', { defaultValue: 'At Sea' });
          const name = atSea ? atSeaLabel : (d.portName ?? d.portCd ?? atSeaLabel);
          const code = atSea ? null : (d.country ?? d.portCd);
          const numeral = String(d.dayNumber).padStart(2, '0');
          return (
            <SwiperSlide
              key={`${d.dayNumber}-${i}`}
              className="!h-auto !w-[78vw] sm:!w-[58vw] md:!w-[420px] lg:!w-[440px] xl:!w-[480px]"
            >
              <article className="group relative aspect-[3/4] overflow-hidden rounded-card bg-cream-200 transition-shadow duration-500 [.swiper-slide-active_&]:shadow-2xl">
                <img
                  src={atSea ? seaDayImage() : destinationImage(d.portCd, region)}
                  alt={name}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                {/* scrims: top for the numeral, bottom for the caption */}
                <div className="absolute inset-0 bg-gradient-to-b from-ink/55 via-transparent to-transparent" aria-hidden />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/25 to-transparent" aria-hidden />
                {/* neighbours sink into a desaturated navy veil; the active card is full clarity */}
                <div className="absolute inset-0 bg-accent-ocean/45 backdrop-saturate-50 transition-opacity duration-500 pointer-events-none [.swiper-slide-active_&]:opacity-0" aria-hidden />

                {/* Oversized day numeral */}
                <div className="absolute top-5 left-6 text-cream" data-swiper-parallax="-60">
                  <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-cream/75">{t('journey.carousel.dayLabel', { defaultValue: 'Day' })}</div>
                  <div className="font-serif text-5xl md:text-6xl leading-none mt-1">{numeral}<span className="text-cream/60">.</span></div>
                </div>

                {/* Caption */}
                <div className="absolute inset-x-0 bottom-0 p-6 md:p-7 text-cream" data-swiper-parallax="-30">
                  <h3 className="font-serif text-3xl md:text-4xl leading-[1.05] text-balance text-cream">{name}</h3>
                  {!atSea && code && (
                    <div className="mt-1.5 font-mono text-[0.7rem] uppercase tracking-[0.22em] text-cream/70">{code}</div>
                  )}
                  {(d.arrivalTime || d.departureTime) && (
                    <>
                      <div className="w-full h-px bg-cream/20 my-4" />
                      <div className="flex gap-6 font-mono text-[11px] uppercase tracking-[0.16em] text-cream/85">
                        {d.arrivalTime && (
                          <div><span className="text-cream/55 mr-2">{t('journey.carousel.arrival', { defaultValue: 'Arr' })}</span>{d.arrivalTime}</div>
                        )}
                        {d.departureTime && (
                          <div><span className="text-cream/55 mr-2">{t('journey.carousel.departure', { defaultValue: 'Dep' })}</span>{d.departureTime}</div>
                        )}
                      </div>
                    </>
                  )}
                  {d.overnight && (
                    <div className="mt-3 text-accent-goldSoft font-mono text-[10px] uppercase tracking-[0.22em]">{t('journey.carousel.overnight', { defaultValue: 'Overnight in port' })}</div>
                  )}
                </div>
              </article>
            </SwiperSlide>
          );
        })}
      </Swiper>

      {showControls && <div className={PAGINATION_CLS} />}
    </div>
  );
}
