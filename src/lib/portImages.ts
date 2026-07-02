import raw from '@/data/portImages.generated.json';
import { imageUrl } from '@/lib/image';

/**
 * Destination/port photography. The script scripts/fetch-port-images.ts sources
 * one landscape photo per port and writes the map below — keyless via Wikimedia
 * Commons (--commons, real photographs) or Wikipedia (--wiki), or via Pexels
 * (needs PEXELS_API_KEY). Every photo here was visually audited against its port;
 * a port with no good match is intentionally omitted, so it resolves to null and
 * destinationImage() falls back to the region image (never a wrong/placeholder).
 */
export interface PortImageEntry {
  file: string;          // /photos/ports/<code>.jpg
  credit?: string;       // photographer name
  creditUrl?: string;    // photographer profile
  source?: string;       // "pexels"
  query?: string;        // search query used (for auditing)
}

const PORT_IMAGES = raw as Record<string, PortImageEntry>;

/** Local destination photo for a port code, or null if not fetched yet. */
export function portImage(portCode?: string | null): string | null {
  if (!portCode) return null;
  return PORT_IMAGES[portCode]?.file ?? null;
}

/** Attribution for a port photo (for a credit line), or null. */
export function portImageCredit(portCode?: string | null): PortImageEntry | null {
  if (!portCode) return null;
  return PORT_IMAGES[portCode] ?? null;
}

/**
 * The headline image for a journey card / hero: the departure-port photo if we
 * have one, else the region's destination placeholder, else a neutral ocean
 * image — never the ship (ship photos live on the ship pages).
 */
export function destinationImage(portCode?: string | null, region?: string | null): string {
  const p = portImage(portCode);
  if (p) return p;
  if (region) return imageUrl(`explora/placeholder/destination-${region}`, { w: 1200, h: 750, fit: 'cover' });
  return imageUrl('explora/placeholder/hero-ocean', { w: 1200, h: 750, fit: 'cover' });
}

/**
 * The image for an "At Sea" / sea day — a real EXPLORA aerial-at-sea drone shot
 * (ship's pool decks ringed by open ocean), never a region placeholder. Sea days
 * have no port, so itinerary rows call this instead of destinationImage().
 */
const SEA_DAY_IMAGE = '/photos/Explora_1/ship_photos/Explora_Conservatory_Pool_Drone_347_MASTER-1.webp';
export function seaDayImage(): string {
  return SEA_DAY_IMAGE;
}
