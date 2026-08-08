/**
 * Fetch one entity (a ship / a destination) for the page that renders it, and
 * expose it to the entity-bound section renderers via context.
 *
 * `status` matters to the caller: 'missing' is a genuine 404 (the slug isn't a
 * published entity), which is what lets a route show a real not-found instead of
 * silently falling back to another record — the failure mode the old closed
 * `REGION_SLUG_TO_KEY[slug] ?? 'mediterranean'` map had.
 */
import { createContext, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContent } from '@/context/ContentContext';
import { usePreviewRequested } from './useSections';
import { entityName, type PublicEntity } from '@/content/entityTypes';

export type EntityStatus = 'loading' | 'ready' | 'missing';

export function useEntity(kind: string | undefined, slug: string | undefined | null) {
  const previewRequested = usePreviewRequested();
  const { version } = useContent();
  const [entity, setEntity] = useState<PublicEntity | null>(null);
  const [status, setStatus] = useState<EntityStatus>('loading');

  useEffect(() => {
    if (!kind || !slug) { setEntity(null); setStatus('missing'); return; }
    let alive = true;
    setStatus('loading');

    const qs = new URLSearchParams({ kind, slug });
    if (previewRequested) qs.set('draft', '1'); // lets an admin preview a hidden entity

    fetch(`/api/content/entities?${qs.toString()}`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
      .then(async (r) => (r.ok ? r.json() : null))
      .then((d: { entity?: PublicEntity } | null) => {
        if (!alive) return;
        if (d?.entity) { setEntity(d.entity); setStatus('ready'); }
        else { setEntity(null); setStatus('missing'); }
      })
      .catch(() => { if (alive) { setEntity(null); setStatus('missing'); } });

    return () => { alive = false; };
  }, [kind, slug, previewRequested, version]);

  return { entity, status };
}

/** Every visible entity of a kind — for index pages and "related" rows. */
export function useEntityList(kind: string) {
  const { version } = useContent();
  const [items, setItems] = useState<PublicEntity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`/api/content/entities?kind=${encodeURIComponent(kind)}`, { headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d: { items?: PublicEntity[] }) => { if (alive) setItems(Array.isArray(d.items) ? d.items : []); })
      .catch(() => { if (alive) setItems([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [kind, version]);

  return { items, loading };
}

// ── Context, so entity-bound renderers don't each re-fetch ───────────────────

export const EntityContext = createContext<PublicEntity | null>(null);

export function useCurrentEntity(): PublicEntity | null {
  return useContext(EntityContext);
}

/** The current entity's display name in the active locale. */
export function useEntityName(): string {
  const { i18n } = useTranslation();
  const e = useCurrentEntity();
  if (!e) return '';
  return entityName(e, i18n.language?.startsWith('el') ? 'el' : 'en');
}
