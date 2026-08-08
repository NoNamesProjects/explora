/**
 * Shared helpers for the page_sections (Tier B CMS) handlers — row shaping,
 * identity resolution and the draft/published projection, in one place so the
 * five endpoints that touch the table can't drift apart.
 *
 * Server-side only — never import from src/ *except* the section-type registry,
 * which is deliberately dependency-free and shared with the client bundle (the
 * same arrangement api/admin/content.ts has with src/content/registry.ts).
 */

export interface SectionRow {
  id: number | string;
  page_key: string;
  entity_slug: string | null;
  section_type: string;
  slug: string;
  position: number;
  position_published: number | null;
  visible_draft: boolean;
  visible_published: boolean | null;
  config_draft: unknown;
  config_published: unknown;
  is_new: boolean;
  deleted_draft: boolean;
  updated_at?: string;
  published_at?: string | null;
}

/**
 * jsonb columns arrive already-parsed on some driver paths and as a raw JSON
 * string on others (paramQuery goes through neon's `.query()` / porsager's
 * `.unsafe()`, which skip the tagged-template type parsers). Normalise once
 * here — the same defensive parse api/admin/catalog/fares.ts already does.
 */
function asObject(v: unknown): Record<string, unknown> {
  if (v == null) return {};
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v);
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

/** What the ADMIN editor sees: the draft state plus a "has unpublished edits" flag. */
export function toAdminSection(r: SectionRow) {
  return {
    id: Number(r.id),
    pageKey: r.page_key,
    entitySlug: r.entity_slug,
    sectionType: r.section_type,
    slug: r.slug,
    position: r.position,
    visible: r.visible_draft,
    config: asObject(r.config_draft),
    isNew: r.is_new,
    deleted: r.deleted_draft,
    dirty: isDirty(r),
    updatedAt: r.updated_at ?? null,
    publishedAt: r.published_at ?? null,
  };
}

/** What the PUBLIC site sees: the published projection only. */
export function toPublicSection(r: SectionRow) {
  return {
    id: Number(r.id),
    sectionType: r.section_type,
    slug: r.slug,
    config: asObject(r.config_published),
  };
}

/** Preview renders the DRAFT through the same public shape. */
export function toPreviewSection(r: SectionRow) {
  return {
    id: Number(r.id),
    sectionType: r.section_type,
    slug: r.slug,
    config: asObject(r.config_draft),
  };
}

/** True when the row's draft differs from what's live (drives the admin badge). */
export function isDirty(r: SectionRow): boolean {
  if (r.is_new || r.deleted_draft) return true;
  if (r.visible_draft !== r.visible_published) return true;
  if (r.position !== r.position_published) return true;
  return JSON.stringify(asObject(r.config_draft)) !== JSON.stringify(asObject(r.config_published));
}

export const SECTION_COLS =
  'id, page_key, entity_slug, section_type, slug, position, position_published, ' +
  'visible_draft, visible_published, config_draft, config_published, is_new, deleted_draft, ' +
  'updated_at, published_at';

/** Normalise an entity slug query/body value — '' and undefined both mean "singleton page". */
export function normEntity(v: unknown): string | null {
  const s = typeof v === 'string' ? v.trim() : '';
  return s ? s.slice(0, 80) : null;
}

/** kebab-case, bounded — used for section slugs (anchors + stable admin identity). */
export function slugify(input: string, fallback = 'section'): string {
  const s = String(input ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return s || fallback;
}
