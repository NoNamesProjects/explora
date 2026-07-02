/**
 * Resolve a banner/hero image slot: a client media override (if set) else the
 * hardcoded code default, both run through the existing imageUrl() transform/
 * fallback layer. imageUrl() stays the pure pipeline — override lookup lives
 * here, scoped to named media slots, not buried in every image call.
 *
 *   bannerSrc('home.hero', '/photos/banner/astern-pool.webp')
 */
import { imageUrl } from '@/lib/image';
import { mediaSrc } from './store';

export function bannerSrc(slot: string, fallback: string): string {
  const override = mediaSrc(`media.${slot}`);
  return imageUrl(override ?? fallback);
}

/** The raw overridden path (no imageUrl transform) or null — for <img src> where a component already calls imageUrl. */
export function bannerOverride(slot: string): string | null {
  return mediaSrc(`media.${slot}`);
}
