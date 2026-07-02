/**
 * Client-side content sanitizer — the RENDER half of the defense-in-depth pair.
 * Keep this in sync with lib/content-sanitize.ts (the server WRITE half). Both
 * are pure, dependency-free, and validate the same allowlists so a poisoned DB
 * row (bug or tamper) still cannot inject anything on the public site.
 *
 * The rich model is structured "runs" rendered by <RichText/> WITHOUT
 * dangerouslySetInnerHTML — React escapes all text, so the only attributes ever
 * emitted are the style/href values these functions validate.
 */
import type { CSSProperties } from 'react';
import type { RichDoc, RichSpan, FieldType } from './types';

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const FUNC_COLOR = /^(?:rgb|rgba|hsl|hsla)\(\s*[0-9.,%\s/]+\)$/;
const FONTS = new Set(['serif', 'sans']);
const ALIGN = new Set(['left', 'center', 'right']);

/** Allow only safe color literals; reject url()/;/expression/< entirely. */
export function sanitizeColor(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const c = v.trim();
  if (!c || c.length > 32) return undefined;
  if (/url\(|;|expression|<|javascript:/i.test(c)) return undefined;
  if (HEX.test(c) || FUNC_COLOR.test(c)) return c;
  return undefined;
}

/** Font-size in px, clamped to a sane range. */
export function clampSize(v: unknown): number | undefined {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(10, Math.min(72, Math.round(n)));
}

export function sanitizeFont(v: unknown): 'serif' | 'sans' | undefined {
  return typeof v === 'string' && FONTS.has(v) ? (v as 'serif' | 'sans') : undefined;
}

export function sanitizeAlign(v: unknown): 'left' | 'center' | 'right' | undefined {
  return typeof v === 'string' && ALIGN.has(v) ? (v as 'left' | 'center' | 'right') : undefined;
}

/** Allow http(s)/mailto/tel or a site-relative path (/… or #…); reject the rest. */
export function sanitizeHref(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const h = v.trim();
  if (!h || h.length > 2048) return undefined;
  if (h.startsWith('/') || h.startsWith('#')) return h; // site-relative
  if (/^(https?:|mailto:|tel:)/i.test(h) && !/[\s<>"']/.test(h) && !/javascript:/i.test(h)) return h;
  return undefined;
}

/** Build a validated inline style object for one span. */
export function spanCssStyle(span: RichSpan): CSSProperties {
  const style: CSSProperties = {};
  const color = sanitizeColor(span.color);
  if (color) style.color = color;
  const size = clampSize(span.size);
  if (size) style.fontSize = `${size}px`;
  const font = sanitizeFont(span.font);
  if (font === 'serif') style.fontFamily = 'var(--font-serif, "Cormorant Garamond", Georgia, serif)';
  if (font === 'sans') style.fontFamily = 'var(--font-sans, Inter, system-ui, sans-serif)';
  return style;
}

/** Clean one span down to allowlisted props only. Returns null if it's empty. */
export function sanitizeSpan(raw: unknown): RichSpan | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const text = typeof r.text === 'string' ? r.text : '';
  if (!text) return null;
  const span: RichSpan = { text };
  if (r.b === true) span.b = true;
  if (r.i === true) span.i = true;
  if (r.u === true) span.u = true;
  const color = sanitizeColor(r.color);
  if (color) span.color = color;
  const size = clampSize(r.size);
  if (size) span.size = size;
  const font = sanitizeFont(r.font);
  if (font) span.font = font;
  const href = sanitizeHref(r.href);
  if (href) span.href = href;
  return span;
}

/** Clean an unknown value into a valid RichDoc, or null if it isn't one. */
export function sanitizeRichDoc(raw: unknown): RichDoc | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (r.type !== 'rich' || !Array.isArray(r.spans)) return null;
  const spans = r.spans.map(sanitizeSpan).filter((s): s is RichSpan => s !== null);
  if (!spans.length) return null;
  const doc: RichDoc = { type: 'rich', spans };
  const align = sanitizeAlign(r.align);
  if (align) doc.align = align;
  return doc;
}

/**
 * Sanitize any field value by its declared type. Used on the WRITE path (server
 * mirror) and as a defensive pass anywhere a value is trusted.
 */
export function sanitizeFieldValue(type: FieldType, raw: unknown): unknown {
  switch (type) {
    case 'rich':
      return sanitizeRichDoc(raw) ?? { type: 'rich', spans: [] };
    case 'plain':
      return typeof raw === 'string' ? raw.slice(0, 5000) : String(raw ?? '').slice(0, 5000);
    case 'number':
      return Number.isFinite(Number(raw)) ? Number(raw) : null;
    case 'image': {
      const v = raw as { src?: unknown; alt?: unknown } | string;
      const src = typeof v === 'string' ? v : typeof v?.src === 'string' ? v.src : '';
      const safe = sanitizeImageSrc(src);
      const alt = typeof (v as { alt?: unknown })?.alt === 'string' ? (v as { alt: string }).alt.slice(0, 300) : undefined;
      return safe ? { src: safe, alt } : null;
    }
    case 'list':
      return Array.isArray(raw) ? raw.map((x) => (typeof x === 'string' ? x : String(x))).slice(0, 100) : [];
    default:
      return null;
  }
}

/** Image src must be a site path (/…) or an http(s) URL — never a data:/js: URI. */
export function sanitizeImageSrc(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const s = v.trim();
  if (!s || s.length > 2048) return undefined;
  if (s.startsWith('/')) return s;
  if (/^https?:\/\//i.test(s) && !/[\s<>"']/.test(s)) return s;
  return undefined;
}
