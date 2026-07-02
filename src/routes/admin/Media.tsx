import { useEffect, useRef, useState } from 'react';
import { ApiError } from '@/lib/api';
import {
  listMedia, uploadMedia, updateMedia, removeMedia,
  MEDIA_CATEGORIES, MAX_UPLOAD_BYTES, ACCEPT_ATTR, type MediaAsset,
} from '@/lib/admin/mediaApi';
import { Toolbar, SearchInput, SelectInput } from '@/components/admin/ui/Toolbar';
import { Pagination } from '@/components/admin/ui/Pagination';
import { ConfirmDialog } from '@/components/admin/ui/ConfirmDialog';
import { EmptyState } from '@/components/admin/ui/EmptyState';
import { Spinner } from '@/components/admin/ui/Spinner';
import { useToast } from '@/components/admin/ui/Toast';
import { dateShort } from '@/lib/admin/format';

const PAGE_SIZE = 24;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const CATEGORY_FILTER = [
  { value: '', label: 'All categories' },
  ...MEDIA_CATEGORIES.map((c) => ({ value: c, label: cap(c) })),
];

function formatBytes(n: number | null): string {
  if (!n) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

type Toast = ReturnType<typeof useToast>;

export function Media() {
  const toast = useToast();
  const [category, setCategory] = useState('');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(q); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    listMedia({ category: category || undefined, q: debouncedQ || undefined, page, pageSize: PAGE_SIZE })
      .then((r) => { if (alive) { setItems(r.items); setTotal(r.total); } })
      .catch(() => { if (alive) toast.push({ tone: 'error', message: 'Could not load media.' }); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [category, debouncedQ, page, reloadKey, toast]);

  const reload = () => setReloadKey((k) => k + 1);

  const onFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.push({ tone: 'error', message: 'Please choose an image file.' }); return; }
    if (file.size > MAX_UPLOAD_BYTES) { toast.push({ tone: 'error', message: 'That image is larger than 8 MB.' }); return; }
    setUploading(true);
    try {
      await uploadMedia(file, { category: category || undefined });
      toast.push({ tone: 'success', message: `Uploaded ${file.name}.` });
      setPage(1);
      reload();
    } catch (e) {
      toast.push({
        tone: 'error',
        message: e instanceof ApiError && e.message === 'uploads-need-disk-host'
          ? 'Uploads are disabled on this host (no persistent disk).'
          : 'Upload failed. Please try again.',
      });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const doDelete = async () => {
    if (confirmId == null) return;
    setDeleting(true);
    try {
      await removeMedia(confirmId);
      toast.push({ tone: 'success', message: 'Image deleted.' });
      setConfirmId(null);
      reload();
    } catch {
      toast.push({ tone: 'error', message: 'Delete failed.' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-medium text-ink">Media</h1>
        <p className="mt-1 text-sm text-ink-500">
          The image library. Upload photos, tag them, and edit their alt text — then attach them to content anywhere on the site.
        </p>
      </div>

      <Toolbar
        right={
          <>
            <input ref={inputRef} type="file" accept={ACCEPT_ATTR} className="hidden" onChange={(e) => void onFiles(e.target.files)} />
            <button aria-label="Upload image"
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="btn-primary h-9 py-0 disabled:opacity-60"
            >
              {uploading ? <Spinner className="text-cream" /> : 'Upload image'}
            </button>
          </>
        }
      >
        <SelectInput ariaLabel="Filter by category" value={category} onChange={(v) => { setCategory(v); setPage(1); }} options={CATEGORY_FILTER} />
        <SearchInput value={q} onChange={setQ} placeholder="Search alt text, name…" />
        <span className="text-xs text-ink-500 tabular-nums">{loading ? '…' : `${total} image${total === 1 ? '' : 's'}`}</span>
      </Toolbar>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-card border border-cream-300 bg-cream-soft">
              <div className="aspect-[4/3] w-full animate-pulse bg-cream-200" />
              <div className="space-y-2 p-3">
                <div className="h-3 w-2/3 animate-pulse rounded bg-cream-200" />
                <div className="h-7 w-full animate-pulse rounded bg-cream-200" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No images yet"
          body="Upload your first image to start the library. JPG, PNG, WebP or GIF up to 8 MB."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((a) => (
            <MediaCard key={a.id} asset={a} toast={toast} onDeleteRequest={() => setConfirmId(a.id)} />
          ))}
        </div>
      )}

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />

      <ConfirmDialog
        open={confirmId != null}
        onOpenChange={(o) => { if (!o) setConfirmId(null); }}
        title="Delete this image?"
        body="This removes the file from disk and the library. Any content still pointing at its URL will show a broken image."
        confirmLabel="Delete"
        tone="danger"
        busy={deleting}
        onConfirm={doDelete}
      />
    </div>
  );
}

// ── One library card: thumbnail + inline alt (EN/ΕΛ) + category + delete ──────

function MediaCard({ asset, toast, onDeleteRequest }: { asset: MediaAsset; toast: Toast; onDeleteRequest: () => void }) {
  const [altEn, setAltEn] = useState(asset.altEn ?? '');
  const [altEl, setAltEl] = useState(asset.altEl ?? '');
  const [category, setCategory] = useState(asset.category ?? '');
  const [saving, setSaving] = useState(false);
  const saved = useRef({ altEn: asset.altEn ?? '', altEl: asset.altEl ?? '', category: asset.category ?? '' });

  const persist = async (field: 'altEn' | 'altEl' | 'category', value: string) => {
    if (saved.current[field] === value) return; // nothing changed
    setSaving(true);
    try {
      // Send only the changed field (JSON.stringify drops the `undefined` keys).
      await updateMedia(asset.id, {
        altEn: field === 'altEn' ? value || null : undefined,
        altEl: field === 'altEl' ? value || null : undefined,
        category: field === 'category' ? value || null : undefined,
      });
      saved.current = { ...saved.current, [field]: value };
      toast.push({ tone: 'success', message: 'Saved.' });
    } catch {
      toast.push({ tone: 'error', message: 'Could not save.' });
      if (field === 'altEn') setAltEn(saved.current.altEn);
      if (field === 'altEl') setAltEl(saved.current.altEl);
      if (field === 'category') setCategory(saved.current.category);
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'mt-1 h-8 w-full rounded border border-cream-300 bg-white px-2 text-xs text-ink placeholder:text-ink-400 focus:border-ink focus:outline-none';

  return (
    <div className="flex flex-col overflow-hidden rounded-card border border-cream-300 bg-cream-soft">
      <a href={asset.url} target="_blank" rel="noreferrer" className="block aspect-[4/3] w-full overflow-hidden bg-cream-100" title="Open full size">
        <img src={asset.url} alt={asset.altEn ?? ''} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.03]" />
      </a>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <span className="truncate text-xs font-medium text-ink" title={asset.originalName ?? asset.filename}>
            {asset.originalName ?? asset.filename}
          </span>
          {saving && <Spinner className="text-ink-400" />}
        </div>
        <div className="text-[0.65rem] text-ink-400 tabular-nums">{formatBytes(asset.bytes)} · {dateShort(asset.createdAt)}</div>

        <label className="block">
          <span className="text-eyebrow uppercase tracking-eyebrow text-ink-500">Alt (EN)</span>
          <input value={altEn} onChange={(e) => setAltEn(e.target.value)} onBlur={() => void persist('altEn', altEn)} placeholder="Describe the image" className={inputCls} />
        </label>
        <label className="block">
          <span className="text-eyebrow uppercase tracking-eyebrow text-ink-500">Alt (ΕΛ)</span>
          <input value={altEl} onChange={(e) => setAltEl(e.target.value)} onBlur={() => void persist('altEl', altEl)} placeholder="Περιγραφή εικόνας" className={inputCls} />
        </label>

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <select
            aria-label="Category"
            value={category}
            onChange={(e) => { setCategory(e.target.value); void persist('category', e.target.value); }}
            className="h-8 rounded border border-cream-300 bg-white px-1.5 text-xs text-ink focus:border-ink focus:outline-none"
          >
            <option value="">uncategorized</option>
            {MEDIA_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            type="button"
            onClick={onDeleteRequest}
            className="rounded border border-red-300 px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
