import { useCallback, useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ApiError } from '@/lib/api';
import {
  listMedia, uploadMedia, MEDIA_CATEGORIES, MAX_UPLOAD_BYTES, ACCEPT_ATTR, type MediaAsset,
} from '@/lib/admin/mediaApi';
import { Spinner } from '@/components/admin/ui/Spinner';
import { EmptyState } from '@/components/admin/ui/EmptyState';
import { SearchInput, SelectInput } from '@/components/admin/ui/Toolbar';

const PICK_PAGE_SIZE = 48;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const CATEGORY_OPTIONS = [
  { value: '', label: 'All categories' },
  ...MEDIA_CATEGORIES.map((c) => ({ value: c, label: cap(c) })),
];

/**
 * Reusable image picker. Other CMS modules import this to attach an image to a
 * content field. Signature is load-bearing — do not change it.
 */
export function MediaPicker({
  open, onOpenChange, onPick,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onPick: (asset: { url: string; alt?: string }) => void;
}): JSX.Element {
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState('');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await listMedia({ category: category || undefined, q: debouncedQ || undefined, page: 1, pageSize: PICK_PAGE_SIZE });
      setItems(r.items);
    } catch {
      setError('Could not load the media library.');
    } finally {
      setLoading(false);
    }
  }, [category, debouncedQ]);

  // (Re)fetch whenever the picker is open and the filters change.
  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  // Reset transient UI each time it opens.
  useEffect(() => {
    if (open) { setError(null); setDragOver(false); }
  }, [open]);

  const pick = (a: MediaAsset) => {
    onPick({ url: a.url, alt: a.altEn ?? a.altEl ?? undefined });
    onOpenChange(false);
  };

  const doUpload = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please choose an image file.'); return; }
    if (file.size > MAX_UPLOAD_BYTES) { setError('That image is larger than 8 MB.'); return; }
    setUploading(true);
    setError(null);
    try {
      const asset = await uploadMedia(file, { category: category || undefined });
      void load(); // refresh the grid so it's there if the picker is reopened
      pick(asset); // auto-select the freshly uploaded image
    } catch (e) {
      setError(
        e instanceof ApiError && e.message === 'uploads-need-disk-host'
          ? 'Uploads are disabled on this host (no persistent disk).'
          : 'Upload failed. Please try again.',
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[55] bg-ink/40 backdrop-blur-[1px] motion-safe:animate-[fade_140ms_ease-out]" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[55] flex max-h-[85vh] w-[min(56rem,94vw)] -translate-x-1/2 -translate-y-1/2
                     flex-col rounded-card border border-cream-300 bg-cream shadow-2xl focus:outline-none"
        >
          <header className="flex items-start justify-between gap-4 border-b border-cream-300 px-6 py-4">
            <div>
              <Dialog.Title className="text-base font-medium text-ink">Choose an image</Dialog.Title>
              <Dialog.Description className="mt-0.5 text-xs text-ink-500">
                Pick one from the library, or drop / upload a new image.
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="rounded p-1.5 text-ink-500 transition-colors hover:bg-cream-200 hover:text-ink
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </Dialog.Close>
          </header>

          <div className="flex flex-wrap items-center gap-2 border-b border-cream-300 px-6 py-3">
            <SelectInput ariaLabel="Filter by category" value={category} onChange={setCategory} options={CATEGORY_OPTIONS} />
            <SearchInput value={q} onChange={setQ} placeholder="Search alt text, name…" />
            <div className="ml-auto">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="btn-primary h-9 py-0 disabled:opacity-60"
              >
                {uploading ? <Spinner className="text-cream" /> : 'Upload'}
              </button>
            </div>
          </div>

          {error && (
            <div className="border-b border-red-200 bg-red-50 px-6 py-2 text-xs text-red-700">{error}</div>
          )}

          <div
            className="relative min-h-0 flex-1 overflow-y-auto px-6 py-5"
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); void doUpload(e.dataTransfer.files?.[0]); }}
          >
            {dragOver && (
              <div className="pointer-events-none absolute inset-3 z-10 flex items-center justify-center rounded-card border-2 border-dashed border-ink/40 bg-cream/80 text-sm font-medium text-ink">
                Drop to upload
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-16 text-ink-400"><Spinner /></div>
            ) : items.length === 0 ? (
              <EmptyState
                title="No images yet"
                body="Upload your first image, or clear the filters to see everything."
              />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {items.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => pick(a)}
                    title={a.altEn ?? a.originalName ?? a.filename}
                    className="group overflow-hidden rounded-card border border-cream-300 bg-white text-left transition-colors
                               hover:border-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden bg-cream-100">
                      <img
                        src={a.url}
                        alt={a.altEn ?? ''}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    </div>
                    <div className="truncate px-2 py-1.5 text-[0.7rem] text-ink-500">{a.category ?? 'uncategorized'}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_ATTR}
            className="hidden"
            onChange={(e) => void doUpload(e.target.files?.[0])}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
