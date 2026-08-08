/**
 * Read the admin-defined section list for a page.
 *
 * Live visitors get the PUBLISHED projection. An admin who appends
 * `?cms_preview=1` to any real route gets the DRAFT projection instead — served
 * by the same endpoint, rendered by the same components, so a preview can never
 * drift from what actually ships.
 *
 * Safety property: an empty result is indistinguishable from "this page hasn't
 * been migrated yet", so every caller keeps its hardcoded composition as the
 * fallback (`hasSections === false` → render the legacy JSX). A DB outage
 * degrades to the old site rather than a blank page.
 */
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useContent } from '@/context/ContentContext';

export interface PublicSection {
  id: number;
  sectionType: string;
  slug: string;
  config: Record<string, unknown>;
}

interface SectionsState {
  sections: PublicSection[];
  loading: boolean;
  /** True when the server actually served drafts (i.e. a valid admin session). */
  draft: boolean;
}

export const PREVIEW_PARAM = 'cms_preview';

/** True when the current URL asks for draft content. */
export function usePreviewRequested(): boolean {
  const { search } = useLocation();
  return new URLSearchParams(search).get(PREVIEW_PARAM) === '1';
}

export function useSections(pageKey: string, entitySlug?: string | null) {
  const previewRequested = usePreviewRequested();
  // Re-fetch when a publish lands (ContentContext already polls a cheap version
  // endpoint on focus / route change, so we get live invalidation for free).
  const { version } = useContent();
  const [state, setState] = useState<SectionsState>({ sections: [], loading: true, draft: false });

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true }));

    const qs = new URLSearchParams({ page: pageKey });
    if (entitySlug) qs.set('entity', entitySlug);
    if (previewRequested) qs.set('draft', '1');

    fetch(`/api/content/sections?${qs.toString()}`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d: { items?: PublicSection[]; draft?: boolean }) => {
        if (!alive) return;
        setState({
          sections: Array.isArray(d.items) ? d.items : [],
          loading: false,
          draft: d.draft === true,
        });
      })
      .catch(() => {
        if (alive) setState({ sections: [], loading: false, draft: false });
      });

    return () => { alive = false; };
  }, [pageKey, entitySlug, previewRequested, version]);

  return {
    ...state,
    /** Has this page been migrated to admin-managed sections? */
    hasSections: state.sections.length > 0,
    previewRequested,
  };
}
