/**
 * Server-side content sanitizer — the WRITE half of the defense-in-depth pair.
 * Keep in sync with src/lib/content/sanitize.ts (the client RENDER half). Pure,
 * dependency-free. Runs on every admin content write so the DB only ever stores
 * clean, allowlisted values (rich "runs", validated colors/sizes/fonts/links).
 *
 * Server-side only — never import from src/.
 */

type FieldType = 'plain' | 'rich' | 'image' | 'number' | 'list';

interface RichSpan {
  text: string;
  b?: boolean; i?: boolean; u?: boolean;
  color?: string; size?: number; font?: 'serif' | 'sans'; href?: string;
}
interface RichDoc {
  type: 'rich';
  align?: 'left' | 'center' | 'right';
  spans: RichSpan[];
}

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const FUNC_COLOR = /^(?:rgb|rgba|hsl|hsla)\(\s*[0-9.,%\s/]+\)$/;
const FONTS = new Set(['serif', 'sans']);
const ALIGN = new Set(['left', 'center', 'right']);

function sanitizeColor(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const c = v.trim();
  if (!c || c.length > 32) return undefined;
  if (/url\(|;|expression|<|javascript:/i.test(c)) return undefined;
  if (HEX.test(c) || FUNC_COLOR.test(c)) return c;
  return undefined;
}

function clampSize(v: unknown): number | undefined {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(10, Math.min(72, Math.round(n)));
}

function sanitizeFont(v: unknown): 'serif' | 'sans' | undefined {
  return typeof v === 'string' && FONTS.has(v) ? (v as 'serif' | 'sans') : undefined;
}

function sanitizeAlign(v: unknown): 'left' | 'center' | 'right' | undefined {
  return typeof v === 'string' && ALIGN.has(v) ? (v as 'left' | 'center' | 'right') : undefined;
}

function sanitizeHref(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const h = v.trim();
  if (!h || h.length > 2048) return undefined;
  if (h.startsWith('/') || h.startsWith('#')) return h;
  if (/^(https?:|mailto:|tel:)/i.test(h) && !/[\s<>"']/.test(h) && !/javascript:/i.test(h)) return h;
  return undefined;
}

export function sanitizeImageSrc(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const s = v.trim();
  if (!s || s.length > 2048) return undefined;
  if (s.startsWith('/')) return s;
  if (/^https?:\/\//i.test(s) && !/[\s<>"']/.test(s)) return s;
  return undefined;
}

function sanitizeSpan(raw: unknown): RichSpan | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const text = typeof r.text === 'string' ? r.text.slice(0, 5000) : '';
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

export function sanitizeRichDoc(raw: unknown): RichDoc | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (r.type !== 'rich' || !Array.isArray(r.spans)) return null;
  const spans = r.spans.map(sanitizeSpan).filter((s): s is RichSpan => s !== null).slice(0, 200);
  if (!spans.length) return null;
  const doc: RichDoc = { type: 'rich', spans };
  const align = sanitizeAlign(r.align);
  if (align) doc.align = align;
  return doc;
}

/** Sanitize a value by its declared field type, ready to store as jsonb. */
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
      const src = typeof v === 'string' ? v : typeof (v as { src?: unknown })?.src === 'string' ? (v as { src: string }).src : '';
      const safe = sanitizeImageSrc(src);
      const alt = typeof (v as { alt?: unknown })?.alt === 'string' ? (v as { alt: string }).alt.slice(0, 300) : undefined;
      return safe ? { src: safe, alt } : null;
    }
    case 'list':
      return Array.isArray(raw) ? raw.map((x) => (typeof x === 'string' ? x.slice(0, 5000) : String(x))).slice(0, 200) : [];
    default:
      return null;
  }
}

/** Render a rich "runs" doc to sanitized HTML (used for the email broadcast body). */
export function richDocToHtml(raw: unknown): string {
  const doc = sanitizeRichDoc(raw);
  if (!doc) return '';
  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
  const styleFor = (s: RichSpan): string => {
    const parts: string[] = [];
    if (s.color) parts.push(`color:${s.color}`);
    if (s.size) parts.push(`font-size:${s.size}px`);
    if (s.font === 'serif') parts.push("font-family:Georgia,serif");
    if (s.font === 'sans') parts.push('font-family:Arial,sans-serif');
    if (s.b) parts.push('font-weight:700');
    if (s.i) parts.push('font-style:italic');
    if (s.u) parts.push('text-decoration:underline');
    return parts.join(';');
  };
  const inner = doc.spans
    .map((s) => {
      const style = styleFor(s);
      const attr = style ? ` style="${style}"` : '';
      if (s.href) return `<a href="${esc(s.href)}"${attr}>${esc(s.text)}</a>`;
      return `<span${attr}>${esc(s.text)}</span>`;
    })
    .join('');
  const align = doc.align ? ` style="text-align:${doc.align}"` : '';
  return `<p${align}>${inner}</p>`;
}
