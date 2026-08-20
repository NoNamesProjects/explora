import { useEffect } from 'react';

/**
 * Per-route document metadata for a client-rendered SPA.
 *
 * Every URL previously served the same hardcoded <title> and description from
 * index.html, so ~600 sailing pages were indistinguishable to a crawler. This
 * sets title/description/canonical/OG per route on navigation.
 *
 * Honest limitation: Google renders JavaScript and will pick these up, but
 * social scrapers (Facebook, WhatsApp, Slack) generally do NOT run JS, so link
 * previews still fall back to the shell's tags in index.html. Fixing that
 * properly needs prerendering or SSR — tracked separately.
 */

const SITE_NAME = 'Explora Journeys';

function upsertMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export interface DocumentMeta {
  /** Page title WITHOUT the site suffix; the hook appends it. */
  title?: string;
  description?: string;
  /** Absolute or root-relative image for social cards. */
  image?: string;
  /** Defaults to the current location. */
  canonicalPath?: string;
  /** Set false while the data a title depends on is still loading. */
  ready?: boolean;
}

export function useDocumentMeta({ title, description, image, canonicalPath, ready = true }: DocumentMeta): void {
  useEffect(() => {
    if (!ready) return;

    const fullTitle = title ? `${title} · ${SITE_NAME}` : SITE_NAME;
    document.title = fullTitle;

    const origin = window.location.origin;
    const url = origin + (canonicalPath ?? window.location.pathname);

    upsertLink('canonical', url);
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', fullTitle);
    upsertMeta('meta[property="og:url"]', 'property', 'og:url', url);
    upsertMeta('meta[property="og:type"]', 'property', 'og:type', 'website');
    upsertMeta('meta[property="og:site_name"]', 'property', 'og:site_name', SITE_NAME);
    upsertMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', fullTitle);

    if (description) {
      upsertMeta('meta[name="description"]', 'name', 'description', description);
      upsertMeta('meta[property="og:description"]', 'property', 'og:description', description);
      upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    }
    if (image) {
      const abs = image.startsWith('http') ? image : origin + image;
      upsertMeta('meta[property="og:image"]', 'property', 'og:image', abs);
      upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', abs);
    }
  }, [title, description, image, canonicalPath, ready]);
}

/**
 * Inject a JSON-LD block for the current route, removed on unmount. Search
 * engines read this even when the visible copy is client-rendered, so it is the
 * most reliable structured signal a SPA can emit.
 */
export function useJsonLd(data: Record<string, unknown> | null): void {
  useEffect(() => {
    if (!data) return;
    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.text = JSON.stringify(data);
    document.head.appendChild(el);
    return () => { el.remove(); };
  }, [data]);
}
