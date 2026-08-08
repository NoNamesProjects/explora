/**
 * /admin/entities — the ships and destinations themselves.
 *
 * This is the screen that turns "add EXPLORA VII" from a multi-file code change
 * plus a redeploy into filling in a form. A new record starts HIDDEN, so it can
 * be built up over days and switched on when it's ready.
 *
 * Unlike Pages, edits here save immediately — an entity is a record, not a
 * staged layout. `Visible` is the gate that decides whether the public site
 * shows it at all.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError } from '@/lib/api';
import { ENTITY_TYPES, entityTypeDef } from '@/content/entityTypes';
import { entitiesApi, type AdminEntity } from '@/lib/admin/entitiesApi';
import { Panel } from '@/components/admin/ui/Panel';
import { Spinner } from '@/components/admin/ui/Spinner';
import { EmptyState } from '@/components/admin/ui/EmptyState';
import { ErrorState } from '@/components/admin/ui/ErrorState';
import { ConfirmDialog } from '@/components/admin/ui/ConfirmDialog';
import { Drawer } from '@/components/admin/ui/Drawer';
import { useToast } from '@/components/admin/ui/Toast';
import { FieldControl } from '@/components/admin/pages/FieldControl';

export function Entities() {
  const toast = useToast();
  const [kind, setKind] = useState(ENTITY_TYPES[0]?.kind ?? 'ship');
  const [items, setItems] = useState<AdminEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<AdminEntity | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminEntity | null>(null);
  const [adding, setAdding] = useState(false);

  const def = useMemo(() => entityTypeDef(kind), [kind]);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    entitiesApi.list(kind)
      .then((r) => setItems(r.items))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [kind]);

  useEffect(load, [load]);

  const withBusy = async (fn: () => Promise<unknown>, errMsg: string) => {
    setBusy(true);
    try { await fn(); } catch (e) {
      toast.push({
        tone: 'error',
        message: e instanceof ApiError && e.message === 'slug-taken' ? 'That web address is already in use.' : errMsg,
      });
    } finally { setBusy(false); }
  };

  const patch = (slug: string, body: Parameters<typeof entitiesApi.update>[1], msg?: string) =>
    withBusy(async () => {
      const r = await entitiesApi.update(slug, body);
      setItems((prev) => prev.map((x) => (x.slug === slug ? r.entity : x)));
      if (editing?.slug === slug) setEditing(r.entity);
      if (msg) toast.push({ tone: 'success', message: msg });
    }, 'Could not save.');

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= items.length) return;
    const a = items[index];
    const b = items[j];
    // Swap the two positions — the list is small, so two writes beat a batch API.
    void withBusy(async () => {
      await entitiesApi.update(a.slug, { position: b.position });
      await entitiesApi.update(b.slug, { position: a.position });
      load();
    }, 'Could not reorder.');
  };

  const doDelete = (e: AdminEntity) =>
    withBusy(async () => {
      const r = await entitiesApi.remove(e.slug);
      setConfirmDelete(null);
      setItems((prev) => prev.filter((x) => x.slug !== e.slug));
      toast.push({
        tone: 'success',
        message: `Removed ${e.nameEn}${r.sectionsRemoved ? ` and its ${r.sectionsRemoved} page sections` : ''}.`,
      });
    }, 'Could not delete.');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-[1.75rem] leading-tight text-ink">Ships &amp; destinations</h1>
        <p className="mt-1 text-sm text-ink-500">
          The records behind the detail pages. Changes here save immediately —
          use <strong className="text-ink">Visible</strong> to control whether something is on the site.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {ENTITY_TYPES.map((e) => (
          <button key={e.kind} type="button" onClick={() => setKind(e.kind)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              kind === e.kind ? 'border-ink bg-ink text-cream' : 'border-cream-300 text-ink-500 hover:bg-cream-200'
            }`}>
            {e.label}
          </button>
        ))}
      </div>

      {def?.helpText && (
        <p className="rounded-card border border-accent-gold/30 bg-accent-gold/5 px-4 py-2.5 text-xs text-ink-600">
          {def.helpText}
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-16 text-sm text-ink-500"><Spinner /> Loading…</div>
      ) : error ? (
        <ErrorState title="Could not load these records" onRetry={load} />
      ) : (
        <Panel
          title={`${items.length} ${def?.label.toLowerCase() ?? kind}`}
          actions={
            <button type="button" onClick={() => setAdding((v) => !v)}
              className="rounded border border-cream-300 px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-cream-200">
              {adding ? 'Cancel' : `+ New ${def?.labelSingular.toLowerCase() ?? 'record'}`}
            </button>
          }
          bodyClassName="p-0"
        >
          {adding && def && (
            <NewEntityForm
              kind={kind}
              label={def.labelSingular}
              busy={busy}
              onCreate={(body) =>
                withBusy(async () => {
                  const r = await entitiesApi.create(body);
                  setItems((prev) => [...prev, r.entity]);
                  setAdding(false);
                  setEditing(r.entity);
                  toast.push({ tone: 'success', message: `${r.entity.nameEn} created — hidden until you switch it on.` });
                }, 'Could not create.')
              }
            />
          )}

          {items.length === 0 ? (
            <div className="p-5"><EmptyState title="Nothing here yet" body="Create the first record to get started." /></div>
          ) : (
            <ul className="divide-y divide-cream-200">
              {items.map((e, i) => (
                <li key={e.slug} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="flex shrink-0 flex-col gap-0.5">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0 || busy} aria-label="Move up"
                      className="h-6 w-6 rounded border border-cream-300 text-xs text-ink transition-colors hover:bg-cream-200 disabled:opacity-30">↑</button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1 || busy} aria-label="Move down"
                      className="h-6 w-6 rounded border border-cream-300 text-xs text-ink transition-colors hover:bg-cream-200 disabled:opacity-30">↓</button>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-sm font-medium ${e.visible ? 'text-ink' : 'text-ink-400'}`}>{e.nameEn}</span>
                      {!e.visible && (
                        <span className="rounded-full border border-cream-300 bg-cream-100 px-2 py-0.5 text-[0.6rem] uppercase tracking-eyebrow text-ink-500">
                          Hidden
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 font-mono text-[0.7rem] text-ink-400">
                      {def?.routeBase}/{e.slug}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button type="button" disabled={busy}
                      onClick={() => patch(e.slug, { visible: !e.visible }, e.visible ? 'Hidden from the site.' : 'Now live on the site.')}
                      className="rounded border border-cream-300 px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-cream-200 disabled:opacity-50">
                      {e.visible ? 'Hide' : 'Show'}
                    </button>
                    <button type="button" onClick={() => setEditing(e)}
                      className="rounded border border-cream-300 px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-cream-200">
                      Edit
                    </button>
                    <button type="button" onClick={() => setConfirmDelete(e)} disabled={busy}
                      className="rounded border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50">
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      <EntityEditor
        entity={editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
        onSave={(slug, body) => patch(slug, body, 'Saved.')}
      />

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}
        title={`Delete ${confirmDelete?.nameEn ?? 'this record'}?`}
        body="Its detail page and all of that page's sections are removed too. This cannot be undone."
        confirmLabel="Delete"
        tone="danger"
        busy={busy}
        onConfirm={() => { if (confirmDelete) void doDelete(confirmDelete); }}
      />
    </div>
  );
}

// ── Create form ──────────────────────────────────────────────────────────────

function NewEntityForm({
  kind, label, busy, onCreate,
}: {
  kind: string;
  label: string;
  busy: boolean;
  onCreate: (body: { kind: string; slug: string; nameEn: string; nameEl?: string }) => void;
}) {
  const [nameEn, setNameEn] = useState('');
  const [nameEl, setNameEl] = useState('');
  const [slug, setSlug] = useState('');
  const auto = nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const effective = slug || auto;
  const cls = 'h-9 w-full rounded border border-cream-300 bg-white px-2.5 text-sm focus:border-ink focus:outline-none';

  return (
    <form
      className="grid gap-3 border-b border-cream-300 bg-cream-100/50 p-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end"
      onSubmit={(e) => { e.preventDefault(); if (effective && nameEn) onCreate({ kind, slug: effective, nameEn, nameEl: nameEl || undefined }); }}
    >
      <label className="block">
        <span className="text-eyebrow uppercase tracking-eyebrow text-ink-500">Name (EN)</span>
        <input required value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder={`e.g. EXPLORA VII`} className={`mt-1 ${cls}`} />
      </label>
      <label className="block">
        <span className="text-eyebrow uppercase tracking-eyebrow text-ink-500">Name (ΕΛ)</span>
        <input value={nameEl} onChange={(e) => setNameEl(e.target.value)} className={`mt-1 ${cls}`} />
      </label>
      <label className="block">
        <span className="text-eyebrow uppercase tracking-eyebrow text-ink-500">Web address</span>
        <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder={auto || 'explora-vii'} className={`mt-1 ${cls}`} />
        <span className="mt-1 block text-[0.65rem] text-ink-400">Can’t be changed later.</span>
      </label>
      <button type="submit" disabled={busy || !nameEn} className="btn-primary h-9 py-0 disabled:opacity-50">
        {busy ? <Spinner className="text-cream" /> : `Create ${label.toLowerCase()}`}
      </button>
    </form>
  );
}

// ── Edit drawer ──────────────────────────────────────────────────────────────

function EntityEditor({
  entity, open, onClose, onSave,
}: {
  entity: AdminEntity | null;
  open: boolean;
  onClose: () => void;
  onSave: (slug: string, body: { nameEn?: string; nameEl?: string; fields?: unknown }) => void;
}) {
  const [nameEn, setNameEn] = useState('');
  const [nameEl, setNameEl] = useState('');
  const [fields, setFields] = useState<Record<string, unknown>>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (entity) {
      setNameEn(entity.nameEn); setNameEl(entity.nameEl);
      setFields(entity.fields ?? {}); setDirty(false);
    }
  }, [entity]);

  const def = entity ? entityTypeDef(entity.kind) : undefined;
  const cls = 'h-9 w-full rounded border border-cream-300 bg-white px-2.5 text-sm focus:border-ink focus:outline-none';

  return (
    <Drawer
      open={open}
      onOpenChange={(o) => { if (!o) onClose(); }}
      title={entity?.nameEn ?? 'Record'}
      subtitle={entity ? <span className="font-mono text-[0.7rem]">{def?.routeBase}/{entity.slug}</span> : undefined}
      description="Edit this record"
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-ink-500">{dirty ? 'Unsaved changes' : 'Saved'}</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose}
              className="rounded border border-cream-300 px-4 py-2 text-xs font-medium text-ink transition-colors hover:bg-cream-200">Close</button>
            <button type="button" disabled={!dirty}
              onClick={() => { if (entity) { onSave(entity.slug, { nameEn, nameEl, fields }); setDirty(false); } }}
              className="btn-primary px-4 py-2 text-[0.7rem] disabled:opacity-40">Save</button>
          </div>
        </div>
      }
    >
      {!entity || !def ? null : (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-eyebrow uppercase tracking-eyebrow text-ink-500">Name (EN)</span>
              <input value={nameEn} onChange={(e) => { setNameEn(e.target.value); setDirty(true); }} className={`mt-1 ${cls}`} />
            </label>
            <label className="block">
              <span className="text-eyebrow uppercase tracking-eyebrow text-ink-500">Name (ΕΛ)</span>
              <input value={nameEl} onChange={(e) => { setNameEl(e.target.value); setDirty(true); }} className={`mt-1 ${cls}`} />
            </label>
          </div>

          {def.fields.map((field) => (
            <FieldControl
              key={field.key}
              field={field}
              value={fields[field.key]}
              onChange={(v) => { setFields((prev) => ({ ...prev, [field.key]: v })); setDirty(true); }}
            />
          ))}
        </div>
      )}
    </Drawer>
  );
}
