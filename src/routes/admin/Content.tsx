import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { registryByPage, type EditableField } from '@/content/registry';
import { isRichDoc, type RichDoc } from '@/lib/content/types';
import { contentApi, localesFor, type ContentValues } from '@/lib/admin/contentApi';
import { RichTextEditor } from '@/components/content/RichTextEditor';
import { MediaPicker } from '@/components/admin/media/MediaPicker';
import { Panel } from '@/components/admin/ui/Panel';
import { Toolbar } from '@/components/admin/ui/Toolbar';
import { Spinner } from '@/components/admin/ui/Spinner';
import { ConfirmDialog } from '@/components/admin/ui/ConfirmDialog';
import { useToast } from '@/components/admin/ui/Toast';

// ── Buffer <-> stored-value conversions ────────────────────────────────────────
// The editor holds each value in a convenient "editing form"; the server
// re-sanitizes on write, so these only need to be reasonable, not exhaustive.

interface ImageBuf { src: string; alt?: string }

const bkey = (key: string, locale: string) => `${key}|${locale}`;
const localeLabel = (locale: string) => (locale === 'en' ? 'EN' : locale === 'el' ? 'ΕΛ' : '');

function toBuf(field: EditableField, value: unknown): unknown {
  switch (field.type) {
    case 'rich':
      return isRichDoc(value) ? value : typeof value === 'string' ? value : undefined;
    case 'list':
      return Array.isArray(value) ? value.join('\n') : typeof value === 'string' ? value : '';
    case 'number':
      return value == null || value === '' ? '' : String(value);
    case 'image': {
      if (value && typeof value === 'object') {
        const v = value as { src?: unknown; alt?: unknown };
        return { src: typeof v.src === 'string' ? v.src : '', alt: typeof v.alt === 'string' ? v.alt : undefined } as ImageBuf;
      }
      return { src: typeof value === 'string' ? value : '' } as ImageBuf;
    }
    default: // plain
      return typeof value === 'string' ? value : value == null ? '' : String(value);
  }
}

function fromBuf(field: EditableField, buf: unknown): unknown {
  switch (field.type) {
    case 'rich':
      return isRichDoc(buf) ? buf : { type: 'rich', spans: [] };
    case 'list':
      return String(buf ?? '')
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s !== '');
    case 'number':
      return buf === '' || buf == null ? null : Number(buf);
    case 'image': {
      const b = (buf && typeof buf === 'object' ? buf : { src: '' }) as ImageBuf;
      return { src: b.src ?? '', alt: b.alt };
    }
    default: // plain
      return String(buf ?? '');
  }
}

function seedBuffers(fields: EditableField[], values: ContentValues): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    for (const loc of localesFor(f)) {
      const rec = values[f.key]?.[loc];
      const stored = rec?.draft ?? rec?.published ?? undefined;
      out[bkey(f.key, loc)] = toBuf(f, stored);
    }
  }
  return out;
}

// ── Component ──────────────────────────────────────────────────────────────────

const areaCls =
  'w-full rounded border border-cream-300 bg-white px-2.5 py-2 text-sm text-ink placeholder:text-ink-400 focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink';
const inputCls =
  'h-9 w-full rounded border border-cream-300 bg-white px-2.5 text-sm text-ink placeholder:text-ink-400 focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink';

export function Content() {
  const { t } = useTranslation();
  const toast = useToast();
  const byPage = useMemo(() => registryByPage(), []);
  const pages = useMemo(() => Object.keys(byPage), [byPage]);

  const [, setFields] = useState<EditableField[]>([]);
  const [server, setServer] = useState<ContentValues>({});
  const [buf, setBufState] = useState<Record<string, unknown>>({});
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState<string>(pages[0] ?? '');
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [publishingAll, setPublishingAll] = useState(false);
  const [mediaTarget, setMediaTarget] = useState<{ field: EditableField; locale: string } | null>(null);
  const [confirmRevert, setConfirmRevert] = useState<EditableField | null>(null);

  useEffect(() => {
    setLoading(true);
    contentApi
      .get()
      .then((r) => {
        setFields(r.fields);
        setServer(r.values);
        setBufState(seedBuffers(r.fields, r.values));
        setDirty({});
        if (!activePage) setActivePage([...new Set(r.fields.map((f) => f.page))][0] ?? '');
      })
      .catch(() => toast.push({ tone: 'error', message: t('admin.content.loadError', { defaultValue: 'Could not load the content registry.' }) }))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setBuf = (key: string, locale: string, val: unknown) => {
    const k = bkey(key, locale);
    setBufState((prev) => ({ ...prev, [k]: val }));
    setDirty((prev) => ({ ...prev, [k]: true }));
  };

  const fieldDirty = (f: EditableField) => localesFor(f).some((loc) => dirty[bkey(f.key, loc)]);
  const localeHasDraft = (key: string, loc: string) => server[key]?.[loc]?.draft != null;
  const fieldHasDraft = (f: EditableField) => localesFor(f).some((loc) => localeHasDraft(f.key, loc));
  const fieldHasOverride = (f: EditableField) =>
    localesFor(f).some((loc) => server[f.key]?.[loc]?.draft != null || server[f.key]?.[loc]?.published != null);

  const pendingCount = useMemo(() => {
    let n = 0;
    for (const byLoc of Object.values(server)) for (const v of Object.values(byLoc)) if (v.draft != null) n++;
    return n;
  }, [server]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  async function saveField(field: EditableField) {
    setSavingKey(field.key);
    try {
      const saved: Record<string, unknown> = {};
      for (const loc of localesFor(field)) {
        const val = fromBuf(field, buf[bkey(field.key, loc)]);
        await contentApi.saveDraft(field.key, loc, val);
        saved[loc] = val;
      }
      setServer((prev) => {
        const next = { ...prev };
        const rec = { ...(next[field.key] ?? {}) };
        for (const loc of localesFor(field)) rec[loc] = { draft: saved[loc], published: rec[loc]?.published ?? null };
        next[field.key] = rec;
        return next;
      });
      setDirty((prev) => {
        const next = { ...prev };
        for (const loc of localesFor(field)) delete next[bkey(field.key, loc)];
        return next;
      });
      toast.push({ tone: 'success', message: t('admin.content.draftSaved', { defaultValue: 'Draft saved.' }) });
    } catch {
      toast.push({ tone: 'error', message: t('admin.content.saveFieldFailed', { defaultValue: 'Could not save this field.' }) });
    } finally {
      setSavingKey(null);
    }
  }

  async function publishField(field: EditableField) {
    try {
      await contentApi.publish([field.key]);
      setServer((prev) => {
        const next = { ...prev };
        const rec = { ...(next[field.key] ?? {}) };
        for (const loc of Object.keys(rec)) if (rec[loc].draft != null) rec[loc] = { draft: null, published: rec[loc].draft };
        next[field.key] = rec;
        return next;
      });
      toast.push({ tone: 'success', message: t('admin.content.publishedLive', { defaultValue: 'Published live.' }) });
    } catch {
      toast.push({ tone: 'error', message: t('admin.content.publishFieldFailed', { defaultValue: 'Could not publish this field.' }) });
    }
  }

  async function publishAll() {
    setPublishingAll(true);
    try {
      const r = await contentApi.publish();
      setServer((prev) => {
        const next: ContentValues = {};
        for (const [k, byLoc] of Object.entries(prev)) {
          next[k] = {};
          for (const [loc, v] of Object.entries(byLoc)) next[k][loc] = v.draft != null ? { draft: null, published: v.draft } : v;
        }
        return next;
      });
      toast.push({ tone: 'success', message: t('admin.content.publishedCountToast', { defaultValue: 'Published {{count}} changes.', count: r.published }) });
    } catch {
      toast.push({ tone: 'error', message: t('admin.content.publishFailed', { defaultValue: 'Could not publish.' }) });
    } finally {
      setPublishingAll(false);
    }
  }

  async function discardLocale(field: EditableField, locale: string) {
    const published = server[field.key]?.[locale]?.published ?? undefined;
    try {
      await contentApi.discardDraft(field.key, locale);
      setServer((prev) => {
        const next = { ...prev };
        const rec = { ...(next[field.key] ?? {}) };
        if (rec[locale]) rec[locale] = { draft: null, published: rec[locale].published };
        next[field.key] = rec;
        return next;
      });
      setBufState((prev) => ({ ...prev, [bkey(field.key, locale)]: toBuf(field, published) }));
      setDirty((prev) => {
        const next = { ...prev };
        delete next[bkey(field.key, locale)];
        return next;
      });
      toast.push({ tone: 'success', message: t('admin.content.draftDiscarded', { defaultValue: 'Draft discarded.' }) });
    } catch {
      toast.push({ tone: 'error', message: t('admin.content.discardFailed', { defaultValue: 'Could not discard the draft.' }) });
    }
  }

  async function revertToDefault(field: EditableField) {
    try {
      for (const loc of localesFor(field)) await contentApi.clearOverride(field.key, loc);
      setServer((prev) => {
        const next = { ...prev };
        delete next[field.key];
        return next;
      });
      setBufState((prev) => {
        const next = { ...prev };
        for (const loc of localesFor(field)) next[bkey(field.key, loc)] = toBuf(field, undefined);
        return next;
      });
      setDirty((prev) => {
        const next = { ...prev };
        for (const loc of localesFor(field)) delete next[bkey(field.key, loc)];
        return next;
      });
      toast.push({ tone: 'success', message: t('admin.content.reverted', { defaultValue: 'Reverted to the code default.' }) });
    } catch {
      toast.push({ tone: 'error', message: t('admin.content.revertFailed', { defaultValue: 'Could not revert this field.' }) });
    }
  }

  // ── One editable control for a (field, locale) ──────────────────────────────
  function control(field: EditableField, locale: string) {
    const v = buf[bkey(field.key, locale)];
    // Accessible name for each control — the visible label is a sibling <span>.
    const name = locale ? `${field.label} (${locale.toUpperCase()})` : field.label;
    switch (field.type) {
      case 'rich':
        return <RichTextEditor value={v as RichDoc | string | undefined} onChange={(doc) => setBuf(field.key, locale, doc)} />;
      case 'list':
        return (
          <textarea
            value={String(v ?? '')}
            onChange={(e) => setBuf(field.key, locale, e.target.value)}
            rows={4}
            placeholder={t('admin.content.listPlaceholder', { defaultValue: 'One item per line…' })}
            aria-label={name}
            className={areaCls}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={v == null || v === '' ? '' : String(v)}
            onChange={(e) => setBuf(field.key, locale, e.target.value)}
            aria-label={name}
            className={inputCls}
          />
        );
      case 'image': {
        const img = (v && typeof v === 'object' ? v : { src: typeof v === 'string' ? v : '' }) as ImageBuf;
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={img.src}
                onChange={(e) => setBuf(field.key, locale, { ...img, src: e.target.value })}
                placeholder={t('admin.content.srcPlaceholder', { defaultValue: '/photos/… or https://…' })}
                aria-label={`${name} — image URL`}
                className={inputCls}
              />
              <button
                type="button"
                onClick={() => setMediaTarget({ field, locale })}
                className="h-9 shrink-0 rounded border border-cream-300 bg-white px-3 text-xs font-medium text-ink transition-colors hover:bg-cream-200"
              >
                {t('admin.content.chooseImage', { defaultValue: 'Choose image' })}
              </button>
            </div>
            <input
              type="text"
              value={img.alt ?? ''}
              onChange={(e) => setBuf(field.key, locale, { ...img, alt: e.target.value || undefined })}
              placeholder={t('admin.content.altPlaceholder', { defaultValue: 'Alt text (optional)' })}
              aria-label={`${name} — alt text`}
              className={inputCls}
            />
            {img.src && (
              <img
                src={img.src}
                alt={img.alt ?? ''}
                className="h-20 w-auto rounded border border-cream-300 object-cover"
              />
            )}
          </div>
        );
      }
      default: // plain
        return (
          <textarea
            value={String(v ?? '')}
            onChange={(e) => setBuf(field.key, locale, e.target.value)}
            rows={2}
            placeholder={t('admin.content.plainPlaceholder', { defaultValue: 'Using the code default…' })}
            aria-label={name}
            className={areaCls}
          />
        );
    }
  }

  function fieldRow(field: EditableField) {
    const locales = localesFor(field);
    const saving = savingKey === field.key;
    return (
      <div key={field.key} className="border-b border-cream-300 py-4 last:border-0">
        <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-ink">{field.label}</span>
              {fieldHasDraft(field) && (
                <span className="rounded-full bg-accent-gold/15 px-2 py-0.5 text-[0.65rem] uppercase tracking-eyebrow text-accent-tan">
                  {t('admin.content.draftBadge', { defaultValue: 'Draft' })}
                </span>
              )}
              <span className="text-[0.65rem] uppercase tracking-eyebrow text-ink-400">{field.type}</span>
            </div>
            <p className="mt-0.5 font-mono text-[0.7rem] text-ink-400">{field.key}</p>
            {field.help && <p className="mt-0.5 text-xs text-ink-500">{field.help}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button aria-label="Save"
              type="button"
              onClick={() => saveField(field)}
              disabled={saving || !fieldDirty(field)}
              className="btn-primary px-3 py-1.5 text-[0.7rem] disabled:opacity-40"
            >
              {saving ? <Spinner className="text-cream" /> : t('admin.content.save', { defaultValue: 'Save' })}
            </button>
            <button
              type="button"
              onClick={() => publishField(field)}
              disabled={!fieldHasDraft(field)}
              className="rounded border border-accent-patina/50 px-3 py-1.5 text-[0.7rem] font-medium text-accent-patina transition-colors hover:bg-accent-patina/10 disabled:opacity-40"
            >
              {t('admin.content.publish', { defaultValue: 'Publish' })}
            </button>
            <button
              type="button"
              onClick={() => setConfirmRevert(field)}
              disabled={!fieldHasOverride(field)}
              className="rounded border border-cream-300 px-3 py-1.5 text-[0.7rem] font-medium text-ink-500 transition-colors hover:bg-cream-200 disabled:opacity-40"
            >
              {t('admin.content.revertToDefault', { defaultValue: 'Revert to default' })}
            </button>
          </div>
        </div>

        <div className={locales.length > 1 ? 'grid gap-3 lg:grid-cols-2' : ''}>
          {locales.map((loc) => (
            <div key={loc || 'agnostic'}>
              {localeLabel(loc) && (
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-eyebrow uppercase tracking-eyebrow text-ink-500">{localeLabel(loc)}</span>
                  {localeHasDraft(field.key, loc) && (
                    <button
                      type="button"
                      onClick={() => discardLocale(field, loc)}
                      className="text-[0.65rem] uppercase tracking-eyebrow text-ink-400 hover:text-ink"
                    >
                      {t('admin.content.discardDraft', { defaultValue: 'Discard draft' })}
                    </button>
                  )}
                </div>
              )}
              {control(field, loc)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const sections = byPage[activePage] ?? {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-[1.75rem] leading-tight text-ink">{t('admin.content.title', { defaultValue: 'Content' })}</h1>
        <p className="mt-1 text-sm text-ink-500">
          {t('admin.content.subtitle', { defaultValue: "Edit the site's copy, imagery and structured text. Changes are saved as drafts, then go live when you publish." })}
        </p>
      </div>

      <Toolbar
        right={
          <div className="flex items-center gap-3">
            <span className="text-xs text-ink-500">
              {pendingCount === 0 ? t('admin.content.noPendingDrafts', { defaultValue: 'No pending drafts' }) : t('admin.content.pendingDraftCount', { defaultValue: '{{count}} pending drafts', count: pendingCount })}
            </span>
            <button aria-label="Publish all"
              type="button"
              onClick={publishAll}
              disabled={publishingAll || pendingCount === 0}
              className="btn-primary px-4 py-1.5 text-xs disabled:opacity-40"
            >
              {publishingAll ? <Spinner className="text-cream" /> : t('admin.content.publishAll', { defaultValue: 'Publish all' })}
            </button>
          </div>
        }
      >
        {pages.map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => setActivePage(page)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              activePage === page ? 'border-ink bg-ink text-cream' : 'border-cream-300 text-ink-500 hover:bg-cream-200'
            }`}
          >
            {page}
          </button>
        ))}
      </Toolbar>

      {loading ? (
        <div className="flex items-center gap-2 py-16 text-sm text-ink-500">
          <Spinner /> {t('admin.content.loading', { defaultValue: 'Loading…' })}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(sections).map(([section, sectionFields]) => (
            <Panel key={section} title={section}>
              <div className="-my-2">{sectionFields.map(fieldRow)}</div>
            </Panel>
          ))}
        </div>
      )}

      <MediaPicker
        open={mediaTarget !== null}
        onOpenChange={(o) => {
          if (!o) setMediaTarget(null);
        }}
        onPick={(asset: { url: string; alt?: string }) => {
          if (mediaTarget) setBuf(mediaTarget.field.key, mediaTarget.locale, { src: asset.url, alt: asset.alt });
          setMediaTarget(null);
        }}
      />

      <ConfirmDialog
        open={confirmRevert !== null}
        onOpenChange={(o) => {
          if (!o) setConfirmRevert(null);
        }}
        title={t('admin.content.revertConfirmTitle', { defaultValue: 'Revert to the code default?' })}
        body={t('admin.content.revertConfirmBody', { defaultValue: 'This removes the saved override (draft and published) for this field, so the site falls back to the value shipped in code. This cannot be undone here.' })}
        confirmLabel={t('admin.content.revert', { defaultValue: 'Revert' })}
        tone="danger"
        onConfirm={() => {
          const f = confirmRevert;
          setConfirmRevert(null);
          if (f) void revertToDefault(f);
        }}
      />
    </div>
  );
}
