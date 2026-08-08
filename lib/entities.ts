/**
 * Shared row shaping for site_entities. Server-side only, except for the
 * dependency-free entity-type registry it validates against.
 */

export interface EntityRow {
  id: number | string;
  kind: string;
  slug: string;
  name_en: string;
  name_el: string;
  group_key: string | null;
  visible: boolean;
  position: number;
  fields: unknown;
  created_at?: string;
  updated_at?: string;
}

export const ENTITY_COLS =
  'id, kind, slug, name_en, name_el, group_key, visible, position, fields, created_at, updated_at';

/** jsonb arrives parsed on some driver paths and as a string on others. */
function asObject(v: unknown): Record<string, unknown> {
  if (v == null) return {};
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v);
      return p && typeof p === 'object' ? (p as Record<string, unknown>) : {};
    } catch { return {}; }
  }
  return typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

export function toAdminEntity(r: EntityRow) {
  return {
    id: Number(r.id),
    kind: r.kind,
    slug: r.slug,
    nameEn: r.name_en,
    nameEl: r.name_el,
    groupKey: r.group_key,
    visible: r.visible,
    position: r.position,
    fields: asObject(r.fields),
    updatedAt: r.updated_at ?? null,
  };
}

/** The public projection — no ids, no timestamps, only what a page renders. */
export function toPublicEntity(r: EntityRow) {
  return {
    kind: r.kind,
    slug: r.slug,
    nameEn: r.name_en,
    nameEl: r.name_el,
    groupKey: r.group_key,
    position: r.position,
    fields: asObject(r.fields),
  };
}

/** kebab-case, bounded. An entity slug is its URL and its sections' foreign key. */
export function entitySlugify(input: string): string {
  return String(input ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
