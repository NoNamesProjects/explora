import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Panel } from '@/components/admin/ui/Panel';
import { DataTable, type Column } from '@/components/admin/ui/DataTable';
import { Drawer } from '@/components/admin/ui/Drawer';
import { Toolbar } from '@/components/admin/ui/Toolbar';
import { EmptyState } from '@/components/admin/ui/EmptyState';
import { ErrorState } from '@/components/admin/ui/ErrorState';
import { ConfirmDialog } from '@/components/admin/ui/ConfirmDialog';
import { useToast } from '@/components/admin/ui/Toast';
import { PackageEditor } from '@/components/admin/packages/PackageEditor';
import {
  customPackagesApi, type CustomPackage, type CustomPackagePatch,
} from '@/lib/admin/customPackagesApi';

/**
 * CUSTOM PACKAGES — the owner's own offers, outside the Explora flatfile.
 *
 * These rows live in their own tables, so the nightly catalog refresh can never
 * delete them. A published package appears in Find-a-Journey next to the Explora
 * sailings and books through the same wizard, priced by the same engine.
 */
export function Packages() {
  const { t } = useTranslation();
  const toast = useToast();

  const [items, setItems] = useState<CustomPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const [draft, setDraft] = useState<CustomPackage | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await customPackagesApi.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleCreate() {
    const title = newTitle.trim();
    if (!title) return;
    setCreating(true);
    try {
      const created = await customPackagesApi.create({ titleEn: title });
      setNewTitle('');
      await load();
      setDraft(created);
      toast.push({ tone: 'success', message: t('admin.packages.created', { defaultValue: 'Package created — it stays hidden until you publish it.' }) });
    } catch (e) {
      const msg = e instanceof Error && e.message === 'slug-taken'
        ? t('admin.packages.slugTaken', { defaultValue: 'A package with that name already exists.' })
        : t('admin.packages.createFailed', { defaultValue: 'Could not create the package.' });
      toast.push({ tone: 'error', message: msg });
    } finally {
      setCreating(false);
    }
  }

  async function handleSave(nextVisible?: boolean) {
    if (!draft) return;
    setSaving(true);
    try {
      const patch: CustomPackagePatch = {
        titleEn: draft.titleEn, titleEl: draft.titleEl,
        summaryEn: draft.summaryEn, summaryEl: draft.summaryEl,
        descriptionEn: draft.descriptionEn, descriptionEl: draft.descriptionEl,
        region: draft.region, nights: draft.nights, sailingDate: draft.sailingDate,
        sailingPortName: draft.sailingPortName, terminationPortName: draft.terminationPortName,
        heroImage: draft.heroImage, photos: draft.photos, itinerary: draft.itinerary,
        inclusions: draft.inclusions, depositPct: draft.depositPct,
        fares: draft.fares,
        ...(nextVisible !== undefined ? { visible: nextVisible } : {}),
      };
      const saved = await customPackagesApi.update(draft.id, patch);
      setDraft(saved);
      await load();
      toast.push({
        tone: 'success',
        message: nextVisible === true
          ? t('admin.packages.published', { defaultValue: 'Published — it is live on the site.' })
          : nextVisible === false
            ? t('admin.packages.unpublished', { defaultValue: 'Hidden from the site.' })
            : t('admin.packages.saved', { defaultValue: 'Saved.' }),
      });
    } catch (e) {
      const code = e instanceof Error ? e.message : '';
      const msg = code === 'needs-sailing-date'
        ? t('admin.packages.needsDate', { defaultValue: 'Add a departure date before publishing.' })
        : code === 'needs-fare'
          ? t('admin.packages.needsFare', { defaultValue: 'Add at least one bookable suite price before publishing.' })
          : t('admin.packages.saveFailed', { defaultValue: 'Could not save.' });
      toast.push({ tone: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!draft) return;
    try {
      await customPackagesApi.remove(draft.id);
      setConfirmDelete(false);
      setDraft(null);
      await load();
      toast.push({ tone: 'success', message: t('admin.packages.deleted', { defaultValue: 'Package deleted.' }) });
    } catch {
      toast.push({ tone: 'error', message: t('admin.packages.deleteFailed', { defaultValue: 'Could not delete.' }) });
    }
  }

  const fmtEUR = (n: number | null | undefined) =>
    n != null ? `€${Math.round(n).toLocaleString('en')}` : '—';
  const fromPrice = (p: CustomPackage) => {
    const vals = (p.fares ?? [])
      .filter((f) => (f.nowAvailable ?? true) && typeof f.perPerson === 'number' && f.perPerson > 0)
      .map((f) => f.perPerson as number);
    return vals.length ? Math.min(...vals) : null;
  };

  const columns: Column<CustomPackage>[] = [
    { key: 'title', header: t('admin.packages.col.title', { defaultValue: 'Package' }),
      render: (r) => (
        <span>
          <span className="text-ink">{r.titleEn}</span>
          <span className="block text-[0.65rem] text-ink-400">{r.publicId}</span>
        </span>
      ) },
    { key: 'region', header: t('admin.packages.col.region', { defaultValue: 'Region' }), render: (r) => r.region ?? '—' },
    { key: 'date', header: t('admin.packages.col.date', { defaultValue: 'Departs' }), render: (r) => r.sailingDate ?? '—' },
    { key: 'nights', header: t('admin.packages.col.nights', { defaultValue: 'Nights' }), align: 'right', render: (r) => r.nights || '—' },
    { key: 'suites', header: t('admin.packages.col.suites', { defaultValue: 'Suites' }), align: 'right', render: (r) => (r.fares ?? []).length },
    { key: 'from', header: t('admin.packages.col.from', { defaultValue: 'From' }), align: 'right', render: (r) => fmtEUR(fromPrice(r)) },
    { key: 'status', header: t('admin.packages.col.status', { defaultValue: 'Status' }),
      render: (r) => (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
          r.visible
            ? 'border-accent-patina/40 bg-accent-patina/10 text-ink'
            : 'border-cream-400/60 bg-cream-300/60 text-ink-500'
        }`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
          {r.visible
            ? t('admin.packages.live', { defaultValue: 'Live' })
            : t('admin.packages.hidden', { defaultValue: 'Hidden' })}
        </span>
      ) },
  ];

  return (
    <div>
      <header className="mb-5">
        <h1 className="font-serif text-2xl text-ink">
          {t('admin.packages.title', { defaultValue: 'Custom packages' })}
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          {t('admin.packages.intro', {
            defaultValue: 'Your own offers, priced and written by you. They sit alongside the Explora sailings on the site and are never touched by the nightly catalog refresh.',
          })}
        </p>
      </header>

      <Toolbar
        right={
          <>
            <input
              className="rounded-card border border-cream-300 bg-cream px-3 py-1.5 text-sm text-ink placeholder:text-ink-400 focus:border-ink focus:outline-none"
              placeholder={t('admin.packages.newPlaceholder', { defaultValue: 'New package title' })}
              aria-label={t('admin.packages.newPlaceholder', { defaultValue: 'New package title' })}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleCreate(); }}
            />
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={creating || !newTitle.trim()}
              className="rounded-card bg-ink px-3 py-1.5 text-sm text-cream disabled:opacity-40"
            >
              {t('admin.packages.create', { defaultValue: 'Create' })}
            </button>
          </>
        }
      >
        <span className="text-xs text-ink-500">
          {t('admin.packages.count', { count: items.length, defaultValue: '{{count}} packages' })}
        </span>
      </Toolbar>

      <Panel>
        {error ? (
          <ErrorState message={error} onRetry={() => void load()} />
        ) : (
          <DataTable
            columns={columns}
            rows={items}
            getRowId={(r) => r.id}
            loading={loading}
            onRowClick={(r) => setDraft(r)}
            empty={
              <EmptyState
                title={t('admin.packages.emptyTitle', { defaultValue: 'No custom packages yet' })}
                body={t('admin.packages.emptyBody', { defaultValue: 'Create one above to offer a journey that is not in the Explora catalog.' })}
              />
            }
          />
        )}
      </Panel>

      <Drawer
        open={draft !== null}
        onOpenChange={(o) => { if (!o) setDraft(null); }}
        title={draft?.titleEn ?? ''}
        subtitle={draft?.publicId}
        footer={
          draft && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button type="button" onClick={() => setConfirmDelete(true)}
                className="text-xs text-red-700 underline">
                {t('admin.packages.delete', { defaultValue: 'Delete package' })}
              </button>
              <div className="flex items-center gap-2">
                <button type="button" disabled={saving} onClick={() => void handleSave()}
                  className="rounded-card border border-ink px-4 py-2 text-sm text-ink disabled:opacity-40">
                  {saving
                    ? t('admin.packages.saving', { defaultValue: 'Saving…' })
                    : t('admin.packages.save', { defaultValue: 'Save' })}
                </button>
                <button type="button" disabled={saving} onClick={() => void handleSave(!draft.visible)}
                  className="rounded-card bg-ink px-4 py-2 text-sm text-cream disabled:opacity-40">
                  {draft.visible
                    ? t('admin.packages.unpublish', { defaultValue: 'Hide from site' })
                    : t('admin.packages.publish', { defaultValue: 'Save & publish' })}
                </button>
              </div>
            </div>
          )
        }
      >
        {draft && (
          <PackageEditor
            draft={draft}
            onChange={(patch) => setDraft((d) => (d ? { ...d, ...patch } as CustomPackage : d))}
          />
        )}
      </Drawer>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        tone="danger"
        title={t('admin.packages.confirmDeleteTitle', { defaultValue: 'Delete this package?' })}
        body={t('admin.packages.confirmDeleteBody', {
          defaultValue: 'It disappears from the site immediately. Bookings already taken keep their records.',
        })}
        confirmLabel={t('admin.packages.delete', { defaultValue: 'Delete package' })}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
