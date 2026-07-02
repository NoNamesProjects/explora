/**
 * Cloudinary URL builder — mimics Adobe Scene7's `?wid=&hei=&fit=&fmt=`
 * query-string transforms with Cloudinary's `c_*,w_*,h_*,q_auto,f_auto`
 * path-style transforms.
 *
 * Until partner uploads to Cloudinary (no VITE_CLOUDINARY_CLOUD), this
 * helper falls back to a curated Unsplash placeholder registry — see
 * src/lib/placeholderImages.ts. Any unregistered asset ID resolves to a
 * procedural ocean-toned gradient (never breaks).
 *
 * Partner workflow when assets arrive:
 *   VITE_CLOUDINARY_CLOUD=your-cloud-name
 *   VITE_CLOUDINARY_BASE=https://res.cloudinary.com   (custom CNAME only)
 */

import { placeholderUrl } from './placeholderImages';

const BASE = (import.meta.env.VITE_CLOUDINARY_BASE as string | undefined) ?? 'https://res.cloudinary.com';
const CLOUD = (import.meta.env.VITE_CLOUDINARY_CLOUD as string | undefined) ?? '';

export type ImageFit = 'cover' | 'contain' | 'crop' | 'fill';
export type ImageFormat = 'auto' | 'webp' | 'jpg' | 'png' | 'avif';

export interface ImageOpts {
  w?: number;
  h?: number;
  fit?: ImageFit;
  fmt?: ImageFormat;
  quality?: number | 'auto';
  gravity?: 'auto' | 'face' | 'center';
  dpr?: number;
}

const FIT_MAP: Record<ImageFit, string> = {
  cover: 'c_fill',
  contain: 'c_fit',
  crop: 'c_crop',
  fill: 'c_scale',
};

export function imageUrl(assetId: string, opts: ImageOpts = {}): string {
  const { w = 1280, h = 720, fit = 'cover', fmt = 'auto', quality = 'auto', gravity = 'auto', dpr } = opts;

  // Local static assets (public/photos/...) and absolute URLs pass through
  // unchanged — no Cloudinary / Unsplash fallback needed.
  if (assetId.startsWith('/') || assetId.startsWith('http')) {
    return assetId;
  }

  if (!CLOUD) {
    return placeholderUrl(assetId, w, h, dpr);
  }

  const transforms = [
    FIT_MAP[fit],
    gravity === 'auto' ? 'g_auto' : `g_${gravity}`,
    w ? `w_${w}` : null,
    h ? `h_${h}` : null,
    `q_${quality}`,
    `f_${fmt}`,
    dpr ? `dpr_${dpr}` : null,
  ]
    .filter(Boolean)
    .join(',');
  const clean = assetId.replace(/^\/+/, '');
  return `${BASE}/${CLOUD}/image/upload/${transforms}/${clean}`;
}

/** Build a srcset string at 1×, 2×, 3× DPR for responsive `<img>`. */
export function imageSrcSet(assetId: string, opts: ImageOpts = {}): string {
  return [1, 2, 3]
    .map((dpr) => `${imageUrl(assetId, { ...opts, dpr })} ${dpr}x`)
    .join(', ');
}
