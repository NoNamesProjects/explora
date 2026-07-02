import type { OnboardVenue } from '@/lib/shipAssets';

interface VenueCarouselProps {
  venues: ReadonlyArray<OnboardVenue>;
}

/**
 * Horizontal scroll-snap row of venue cards. Each card shows the venue
 * photo at 4:3 aspect + the venue name in italic-serif underneath.
 * Mobile-friendly swipe; on desktop the row fits comfortably within the
 * container with overflow-x: auto.
 */
export function VenueCarousel({ venues }: VenueCarouselProps) {
  return (
    <div className="overflow-x-auto snap-x snap-mandatory scroll-pl-6 [&::-webkit-scrollbar]:hidden">
      <div className="flex gap-4 md:gap-5 pl-6 pr-6 md:pl-8 md:pr-8 lg:pl-12 lg:pr-12">
        {venues.map((v, i) => (
          <div
            key={v.key}
            className="snap-start shrink-0 w-[80vw] sm:w-[55vw] lg:w-[38vw] xl:w-[28vw]"
          >
            <div className="aspect-[4/3] overflow-hidden bg-cream-200">
              <img
                src={v.src}
                alt={v.name}
                className="h-full w-full object-cover transition-transform duration-[1400ms] ease-out-soft hover:scale-105"
                loading={i < 2 ? 'eager' : 'lazy'}
              />
            </div>
            <div className="mt-3 font-serif text-lg md:text-xl text-ink">
              {v.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
