/**
 * The one component a migrated page renders instead of its hardcoded JSX.
 *
 *   <PageSections page="home" fallback={<LegacyHomeSections />} />
 *   <PageSections page="ship-detail" entity={code} fallback={<LegacyShipDetail />} />
 *
 * `fallback` is load-bearing, not defensive padding: it's what makes migrating a
 * page reversible and what keeps the site up if the CMS query fails or the seed
 * hasn't run. A page is "migrated" the moment it has published sections — until
 * then (and if the DB is ever unreachable) the original composition renders.
 *
 * For entity pages it also resolves the entity itself and provides it to the
 * entity-bound renderers, and reports a genuine 404 upward when the slug isn't a
 * published entity — instead of silently showing a different one.
 */
import { useMemo, type ReactNode } from 'react';
import { useSections } from '@/lib/content/useSections';
import { useEntity, EntityContext } from '@/lib/content/useEntity';
import { entityKindForPage } from '@/content/entityTypes';
import { sectionTypeDef } from '@/content/sectionTypes';
import { StickySubNav, type SubNavSection } from '@/components/ship/StickySubNav';
import { useTranslation } from 'react-i18next';
import { RenderSections } from './registry';
import { PreviewBanner } from './PreviewBanner';

export function PageSections({
  page, entity: entitySlug, fallback = null, onMissingEntity, subNav = false,
}: {
  page: string;
  entity?: string | null;
  fallback?: ReactNode;
  /** Rendered when the slug isn't a published entity (a real 404, not a fallback). */
  onMissingEntity?: ReactNode;
  /** Derive the sticky anchor nav from the section list (ship detail pages). */
  subNav?: boolean;
}) {
  const { t } = useTranslation();
  const kind = entityKindForPage(page);
  const { sections, loading, hasSections, draft, previewRequested } = useSections(page, entitySlug);
  const { entity, status: entityStatus } = useEntity(kind, entitySlug);

  // Anchors come from the sections that are ACTUALLY rendered, so hiding or
  // removing one drops it from the nav with no extra admin step.
  const anchors = useMemo<SubNavSection[]>(() => {
    if (!subNav) return [];
    return sections
      .map((s) => {
        const def = sectionTypeDef(s.sectionType);
        if (!def?.anchor) return null;
        // A section that renders nothing for this entity must not leave an
        // anchor behind — otherwise the nav scrolls to a target that isn't there.
        if (def.hidesWhenEmpty?.(entity?.fields ?? {})) return null;
        return {
          id: s.slug,
          label: def.navLabelKey ? t(def.navLabelKey, { defaultValue: def.label }) : def.label,
        };
      })
      .filter((x): x is SubNavSection => x !== null);
  }, [sections, subNav, t, entity]);

  const waiting = loading || (kind ? entityStatus === 'loading' : false);
  if (waiting) return <>{fallback}</>;

  // A page that needs an entity but can't find one is a 404, not a fallback:
  // rendering the built-in layout here would show a DIFFERENT ship's content.
  if (kind && entityStatus === 'missing' && onMissingEntity) return <>{onMissingEntity}</>;

  if (!hasSections) return <>{fallback}</>;

  const body = (
    <>
      {previewRequested && <PreviewBanner active={draft} />}
      {subNav && anchors.length > 0 && <StickySubNav sections={anchors} />}
      <RenderSections sections={sections} />
    </>
  );

  return kind ? <EntityContext.Provider value={entity}>{body}</EntityContext.Provider> : body;
}
