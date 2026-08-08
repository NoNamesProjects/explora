/**
 * Typed, locale-aware reader over an entity's `fields` jsonb — the entity twin
 * of sectionRead.ts, sharing the same field vocabulary and the same
 * "never throw, always degrade" contract.
 */
import { useTranslation } from 'react-i18next';
import { entityTypeDef } from '@/content/entityTypes';
import type { PublicEntity } from '@/content/entityTypes';
import { fieldValue, type SectionField } from '@/content/sectionTypes';
import type { RichDoc } from '@/lib/content/types';

export interface ImageValue { src: string; alt?: string }

export interface EntityReader {
  has(key: string): boolean;
  text(key: string, fallback?: string): string;
  rich(key: string): RichDoc | string | undefined;
  image(key: string): ImageValue | undefined;
  number(key: string): number | null;
  list(key: string): string[];
  /** A repeating group, each item read through the same locale rules. */
  rows(key: string): Array<(sub: string) => unknown>;
  /** Raw locale-resolved item list — convenient for adapters that reshape. */
  items(key: string): Array<Record<string, unknown>>;
}

function resolveItem(
  itemFields: SectionField[],
  item: unknown,
  locale: string,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of itemFields) out[f.key] = fieldValue(item, f, locale);
  return out;
}

export function useEntityReader(entity: PublicEntity | null): EntityReader {
  const { i18n } = useTranslation();
  const locale = i18n.language?.startsWith('el') ? 'el' : 'en';
  const def = entity ? entityTypeDef(entity.kind) : undefined;
  const byKey = new Map((def?.fields ?? []).map((f) => [f.key, f]));
  const config = entity?.fields ?? {};

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
    number(key) {
      const v = read(key);
      return typeof v === 'number' && Number.isFinite(v) ? v : null;
    },
    list(key) {
      const v = read(key);
      return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
    },
    items(key) {
      const field = byKey.get(key);
      const v = read(key);
      if (!field?.itemFields || !Array.isArray(v)) return [];
      return v.map((item) => resolveItem(field.itemFields!, item, locale));
    },
    rows(key) {
      const field = byKey.get(key);
      const v = read(key);
      if (!field?.itemFields || !Array.isArray(v)) return [];
      return v.map((item) => (sub: string) => {
        const f = field.itemFields!.find((x) => x.key === sub);
        return f ? fieldValue(item, f, locale) : undefined;
      });
    },
  };
}
