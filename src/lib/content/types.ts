/**
 * Shared types for the client-editable content layer (the CMS overlay).
 *
 * Defaults live in code (src/locales, src/data, /photos). The DB stores ONLY
 * what the client changed, as a sparse override bundle fetched at boot and
 * merged over those defaults. See src/context/ContentContext.tsx.
 */

export type FieldType = 'plain' | 'rich' | 'image' | 'number' | 'list';
export type ContentKind = 'i18n' | 'data' | 'media';

/** One styled run of text inside a rich field. Text is ALWAYS escaped by React. */
export interface RichSpan {
  text: string;
  b?: boolean; // bold
  i?: boolean; // italic
  u?: boolean; // underline
  color?: string; // validated hex/rgb/hsl
  size?: number; // px, clamped 10–72
  font?: 'serif' | 'sans';
  href?: string; // validated scheme (http/https/mailto/tel or site-relative)
}

/** A rich text value = a list of styled runs + a block alignment. */
export interface RichDoc {
  type: 'rich';
  align?: 'left' | 'center' | 'right';
  spans: RichSpan[];
}

/** A media override value (image slot). */
export interface MediaValue {
  src: string;
  alt?: string;
}

/** What GET /api/content returns — the published override bundle. */
export interface ContentBundle {
  version: number; // max(published_at) epoch — cache-buster / poll token
  i18n: { en: Record<string, unknown>; el: Record<string, unknown> };
  /** key → { locale ('' = agnostic) → value }. Structured src/data overrides. */
  data: Record<string, Record<string, unknown>>;
  /** full media key ('media.home.hero') → { src, alt }. */
  media: Record<string, MediaValue>;
}

export function isRichDoc(v: unknown): v is RichDoc {
  return (
    typeof v === 'object' &&
    v !== null &&
    (v as { type?: unknown }).type === 'rich' &&
    Array.isArray((v as { spans?: unknown }).spans)
  );
}
