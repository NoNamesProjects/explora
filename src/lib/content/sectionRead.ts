/**
 * Typed, locale-aware reader over one section's stored config.
 *
 * Renderers never poke at `section.config` directly — they go through a reader,
 * so the bilingual wrapper ({ en, el }), the per-type value shapes and the
 * "field isn't declared on this type" case are all handled in exactly one place.
 * Every getter returns a safe empty value rather than throwing: a half-filled
 * draft must still render.
 */
import { useTranslation } from 'react-i18next';
import {
  sectionTypeDef, fieldValue, buttonLabel,
  type SectionField, type ButtonValue,
} from '@/content/sectionTypes';
import type { RichDoc } from '@/lib/content/types';
import type { PublicSection } from './useSections';

export interface ImageValue { src: string; alt?: string }
export interface ResolvedButton { label: string; href: string; style: string }

export interface SectionReader {
  /** Is anything actually set for this key? */
  has(key: string): boolean;
  text(key: string, fallback?: string): string;
  rich(key: string): RichDoc | string | undefined;
  image(key: string): ImageValue | undefined;
  list(key: string): string[];
  link(key: string): string;
  button(key: string): ResolvedButton | undefined;
  select(key: string, fallback: string): string;
  toggle(key: string): boolean;
  /** One nested reader per card, scoped to the card's own itemFields. */
  cards(key: string): SectionReader[];
}

function makeReader(
  fields: SectionField[],
  config: unknown,
  locale: string,
): SectionReader {
  const byKey = new Map(fields.map((f) => [f.key, f]));
  const read = (key: string): unknown => {
    const field = byKey.get(key);
    if (!field) return undefined;
    return fieldValue(config, field, locale);
  };

  return {
    has(key) {
      const v = read(key);
      if (v == null) return false;
      if (typeof v === 'string') return v.trim().length > 0;
      if (Array.isArray(v)) return v.length > 0;
      return true;
    },
    text(key, fallback = '') {
      const v = read(key);
      return typeof v === 'string' && v.trim() ? v : fallback;
    },
    rich(key) {
      const v = read(key);
      if (v && typeof v === 'object' && (v as RichDoc).type === 'rich') {
        // An empty spans array renders nothing — treat it as unset so callers
        // can fall back rather than emitting a stray empty heading.
        return (v as RichDoc).spans?.length ? (v as RichDoc) : undefined;
      }
      return typeof v === 'string' && v.trim() ? v : undefined;
    },
    image(key) {
      const v = read(key);
      if (v && typeof v === 'object' && typeof (v as ImageValue).src === 'string' && (v as ImageValue).src) {
        return v as ImageValue;
      }
      return undefined;
    },
    list(key) {
      const v = read(key);
      return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : [];
    },
    link(key) {
      const v = read(key);
      return typeof v === 'string' ? v : '';
    },
    button(key) {
      const v = read(key) as ButtonValue | undefined;
      if (!v || typeof v !== 'object') return undefined;
      const label = buttonLabel(v, locale);
      const href = typeof v.href === 'string' ? v.href : '';
      if (!label || !href) return undefined; // a button needs both to be useful
      return { label, href, style: typeof v.style === 'string' ? v.style : 'primary' };
    },
    select(key, fallback) {
      const v = read(key);
      return typeof v === 'string' && v ? v : fallback;
    },
    toggle(key) {
      return read(key) === true;
    },
    cards(key) {
      const field = byKey.get(key);
      const v = read(key);
      if (!field?.itemFields || !Array.isArray(v)) return [];
      return v.map((item) => makeReader(field.itemFields!, item, locale));
    },
  };
}

/**
 * Hook form — subscribes to the i18next language so a section re-reads its
 * values (and re-renders) the moment the visitor flips EN｜ΕΛ.
 */
export function useSectionReader(section: PublicSection): SectionReader {
  const { i18n } = useTranslation();
  const locale = i18n.language?.startsWith('el') ? 'el' : 'en';
  const def = sectionTypeDef(section.sectionType);
  return makeReader(def?.fields ?? [], section.config, locale);
}
