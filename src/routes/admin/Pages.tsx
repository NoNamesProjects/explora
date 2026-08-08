/**
 * /admin/pages — the page-builder.
 *
 * Pick a page, then reorder / hide / delete / add its sections and edit each
 * one's content. Everything is staged: the live site only changes when
 * "Publish page" is pressed, and "Preview" opens the REAL route with the draft
 * applied so what you check is what visitors will get.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PAGE_KEYS, sectionTypeDef, sectionTypesForPage } from '@/content/sectionTypes';
import { entityKindForPage, entityTypeDef } from '@/content/entityTypes';
import { sectionsApi, previewUrlFor, type AdminSection } from '@/lib/admin/sectionsApi';
import { entitiesApi, type AdminEntity } from '@/lib/admin/entitiesApi';
import { Panel } from '@/components/admin/ui/Panel';
import { Spinner } from '@/components/admin/ui/Spinner';
import { EmptyState } from '@/components/admin/ui/EmptyState';
import { ErrorState } from '@/components/admin/ui/ErrorState';
import { ConfirmDialog } from '@/components/admin/ui/ConfirmDialog';
import { useToast } from '@/components/admin/ui/Toast';
import { SectionEditor } from '@/components/admin/pages/SectionEditor';

/** Pages whose sections hang off a specific ship/destination — Phase 2/3. */
const ENTITY_PAGES = new Set(PAGE_KEYS.filter((p) => p.entityKind).map((p) => p.key as string));

export function Pages() {
  const toast = useToast();
  const [pageKey, setPageKey] = useState<string>('home');
  const [entitySlug, setEntitySlug] = useState<string | null>(null);
  const [entityOptions, setEntityOptions] = useState<AdminEntity[]>([]);
  const [sections, setSections] = useState<AdminSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<AdminSection | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminSection | null>(null);
  const [adding, setAdding] = useState(false);

  const isEntityPage = ENTITY_PAGES.has(pageKey);
  const entityKind = entityKindForPage(pageKey);
  // An entity page edits ONE record's sections at a time, so it needs a record
  // picked before there is anything to show.
  const needsEntity = isEntityPage && !entitySlug;
  const available = useMemo(() => sectionTypesForPage(pageKey), [pageKey]);
  const pendingCount = sections.filter((s) => s.dirty).length;

  // Pull the pickable records whenever the page is entity-scoped, and reset the
  // selection so switching Ships → Destinations can't leave a stale ship selected.
  useEffect(() => {
    setEntitySlug(null);
    if (!entityKind) { setEntityOptions([]); return; }
    let alive = true;
    entitiesApi.list(entityKind)
      .then((r) => { if (alive) setEntityOptions(r.items); })
      .catch(() => { if (alive) setEntityOptions([]); });
    return () => { alive = false; };
  }, [entityKind]);

  const load = useCallback(() => {
    if (needsEntity) { setSections([]); setLoading(false); setError(false); return; }
    setLoading(true);
    setError(false);
    sectionsApi.list(pageKey, entitySlug)
      .then((r) => setSections(r.items))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [pageKey, entitySlug, needsEntity]);

  useEffect(load, [load]);

  // ── Mutations ──────────────────────────────────────────────────────────────

  const withBusy = async (fn: () => Promise<unknown>, errMsg: string) => {
    setBusy(true);
    try { await fn(); } catch { toast.push({ tone: 'error', message: errMsg }); }
    finally { setBusy(false); }
  };

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= sections.length) return;
    const next = sections.slice();
    [next[index], next[j]] = [next[j], next[index]];
    setSections(next); // optimistic — the server is the source of truth on reload
    void withBusy(
      () => sectionsApi.reorder(pageKey, entitySlug, next.map((s) => s.id)).then((r) => setSections(r.items)),
      'Could not save the new order.',
    );
  };

  const toggleVisible = (s: AdminSection) =>
    withBusy(
      () => sectionsApi.update(s.id, { visible: !s.visible })
        .then((r) => setSections((prev) => prev.map((x) => (x.id === s.id ? r.section : x)))),
      'Could not change visibility.',
    );

  const doDelete = (s: AdminSection) =>
    withBusy(async () => {
      const r = await sectionsApi.remove(s.id);
      setConfirmDelete(null);
      if (r.removed) {
        setSections((prev) => prev.filter((x) => x.id !== s.id));
        toast.push({ tone: 'success', message: 'Section removed.' });
      } else if (r.section) {
        setSections((prev) => prev.map((x) => (x.id === s.id ? r.section! : x)));
        toast.push({ tone: 'info', message: 'Staged for removal — it disappears from the live site when you publish.' });
      }
    }, 'Could not delete this section.');

  const doRestore = (s: AdminSection) =>
    withBusy(
      () => sectionsApi.restore(s.id).then((r) => setSections((prev) => prev.map((x) => (x.id === s.id ? r.section : x)))),
      'Could not restore this section.',
    );

  const addSection = (type: string) =>
    withBusy(async () => {
      const r = await sectionsApi.create({ pageKey, entitySlug, sectionType: type });
      setSections((prev) => [...prev, r.section]);
      setAdding(false);
      setEditing(r.section); // straight into editing — an empty section is useless
      toast.push({ tone: 'success', message: 'Section added as a draft.' });
    }, 'Could not add that section.');

  const saveConfig = async (id: number, config: Record<string, unknown>) => {
    const r = await sectionsApi.update(id, { config });
    setSections((prev) => prev.map((x) => (x.id === id ? r.section : x)));
    setEditing(r.section);
  };

  const publish = () =>
    withBusy(async () => {
      const r = await sectionsApi.publish(pageKey, entitySlug);
      setSections(r.items);
      toast.push({
        tone: 'success',
        message: `Published — ${r.published} section(s) live${r.deleted ? `, ${r.deleted} removed` : ''}.`,
      });
    }, 'Could not publish this page.');

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-[1.75rem] leading-tight text-ink">Pages</h1>
          <p className="mt-1 text-sm text-ink-500">
            Build each page from sections — reorder, hide, remove, or add new ones. Changes stay
            private until you publish.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href={previewUrlFor(pageKey, entitySlug)} target="_blank" rel="noreferrer"
            className="rounded border border-cream-300 px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-cream-200">
            Preview drafts ↗
          </a>
          <button type="button" onClick={publish} disabled={busy || pendingCount === 0}
            className="btn-primary px-4 py-1.5 text-xs disabled:opacity-40">
            {busy ? <Spinner className="text-cream" /> : `Publish page${pendingCount ? ` (${pendingCount})` : ''}`}
          </button>
        </div>
      </div>

      {/* Page picker */}
      <div className="flex flex-wrap items-center gap-2">
        {PAGE_KEYS.map((p) => (
          <button key={p.key} type="button" onClick={() => setPageKey(p.key)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              pageKey === p.key ? 'border-ink bg-ink text-cream' : 'border-cream-300 text-ink-500 hover:bg-cream-200'
            }`}>
            {p.label}
          </button>
        ))}
      </div>

      {isEntityPage && (
        <div className="flex flex-wrap items-center gap-2 rounded-card border border-cream-300 bg-cream-soft px-4 py-3">
          <span className="text-xs text-ink-500">
            {entityTypeDef(entityKind ?? '')?.labelSingular ?? 'Record'}:
          </span>
          {entityOptions.length === 0 ? (
            <span className="text-xs text-ink-400">None yet — create one under Ships &amp; destinations.</span>
          ) : (
            entityOptions.map((e) => (
              <button key={e.slug} type="button" onClick={() => setEntitySlug(e.slug)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  entitySlug === e.slug ? 'border-ink bg-ink text-cream' : 'border-cream-300 text-ink-500 hover:bg-cream-200'
                }`}>
                {e.nameEn}{!e.visible && ' ·hidden'}
              </button>
            ))
          )}
        </div>
      )}

      {needsEntity ? (
        <EmptyState
          title={`Pick a ${entityTypeDef(entityKind ?? '')?.labelSingular.toLowerCase() ?? 'record'} first`}
          body="Every ship and destination has its own page, so they're edited one at a time. Choose one above."
        />
      ) : loading ? (
        <div className="flex items-center gap-2 py-16 text-sm text-ink-500"><Spinner /> Loading sections…</div>
      ) : error ? (
        <ErrorState title="Could not load this page's sections" onRetry={load} />
      ) : (
        <>
          <Panel
            title={`${sections.length} section${sections.length === 1 ? '' : 's'}`}
            actions={
              <button type="button" onClick={() => setAdding((v) => !v)}
                className="rounded border border-cream-300 px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-cream-200">
                {adding ? 'Cancel' : '+ Add section'}
              </button>
            }
            bodyClassName="p-0"
          >
            {adding && (
              <div className="border-b border-cream-300 bg-cream-100/50 p-4">
                <p className="mb-3 text-xs text-ink-500">Choose what to add:</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {available.map((t) => (
                    <button key={t.type} type="button" disabled={busy} onClick={() => addSection(t.type)}
                      className="rounded-card border border-cream-300 bg-white p-3 text-left transition-colors hover:border-ink disabled:opacity-50">
                      <div className="text-sm font-medium text-ink">{t.label}</div>
                      {t.description && <div className="mt-0.5 text-[0.7rem] leading-snug text-ink-500">{t.description}</div>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {sections.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title="No sections yet"
                  body="This page still renders its original built-in layout. Add a section to take it over."
                />
              </div>
            ) : (
              <ul className="divide-y divide-cream-200">
                {sections.map((s, i) => {
                  const def = sectionTypeDef(s.sectionType);
                  return (
                    <li key={s.id}
                      className={`flex flex-wrap items-center gap-3 px-4 py-3 ${s.deleted ? 'bg-red-50/40' : ''}`}>
                      <div className="flex shrink-0 flex-col gap-0.5">
                        <button type="button" onClick={() => move(i, -1)} disabled={i === 0 || busy}
                          aria-label="Move section up"
                          className="h-6 w-6 rounded border border-cream-300 text-xs text-ink transition-colors hover:bg-cream-200 disabled:opacity-30">↑</button>
                        <button type="button" onClick={() => move(i, 1)} disabled={i === sections.length - 1 || busy}
                          aria-label="Move section down"
                          className="h-6 w-6 rounded border border-cream-300 text-xs text-ink transition-colors hover:bg-cream-200 disabled:opacity-30">↓</button>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-sm font-medium ${s.visible ? 'text-ink' : 'text-ink-400 line-through'}`}>
                            {def?.label ?? s.sectionType}
                          </span>
                          {s.deleted && <Badge tone="bad">Removing on publish</Badge>}
                          {!s.deleted && s.isNew && <Badge tone="warn">Not live yet</Badge>}
                          {!s.deleted && !s.isNew && s.dirty && <Badge tone="warn">Unpublished edits</Badge>}
                          {!s.visible && !s.deleted && <Badge>Hidden</Badge>}
                          {def?.nature === 'structural' && <Badge>Live data</Badge>}
                        </div>
                        <p className="mt-0.5 font-mono text-[0.7rem] text-ink-400">#{s.slug}</p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {s.deleted ? (
                          <button type="button" onClick={() => doRestore(s)} disabled={busy}
                            className="rounded border border-cream-300 px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-cream-200 disabled:opacity-50">
                            Undo
                          </button>
                        ) : (
                          <>
                            <button type="button" onClick={() => toggleVisible(s)} disabled={busy}
                              className="rounded border border-cream-300 px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-cream-200 disabled:opacity-50">
                              {s.visible ? 'Hide' : 'Show'}
                            </button>
                            <button type="button" onClick={() => setEditing(s)}
                              className="rounded border border-cream-300 px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-cream-200">
                              Edit
                            </button>
                            <button type="button" onClick={() => setConfirmDelete(s)} disabled={busy}
                              className="rounded border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50">
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <p className="text-xs text-ink-500">
            The live site keeps showing the last published version until you press
            <strong className="text-ink"> Publish page</strong>. Use <strong className="text-ink">Preview drafts</strong> to
            see your unpublished changes on the real page first.
          </p>
        </>
      )}

      <SectionEditor
        section={editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
        onSave={saveConfig}
      />

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}
        title="Delete this section?"
        body={
          confirmDelete?.isNew
            ? 'This section was never published, so it will be removed immediately.'
            : 'It stays on the live site until you publish the page — you can undo before then.'
        }
        confirmLabel="Delete"
        tone="danger"
        busy={busy}
        onConfirm={() => { if (confirmDelete) void doDelete(confirmDelete); }}
      />
    </div>
  );
}

function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'warn' | 'bad' }) {
  const cls =
    tone === 'bad' ? 'border-red-300 bg-red-50 text-red-700'
    : tone === 'warn' ? 'border-accent-gold/40 bg-accent-gold/10 text-accent-tan'
    : 'border-cream-300 bg-cream-100 text-ink-500';
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[0.6rem] uppercase tracking-eyebrow ${cls}`}>
      {children}
    </span>
  );
}
