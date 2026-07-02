/**
 * A fully-controlled, segment-based rich-text editor. NOT contentEditable — the
 * value is a flat list of styled SPANS plus a block alignment, i.e. a RichDoc.
 * Every edit emits a fresh, clean RichDoc via onChange; a live preview reuses
 * the very same <RichText/> the public site renders with.
 */
import type { RichDoc, RichSpan } from '@/lib/content/types';
import { isRichDoc } from '@/lib/content/types';
import { RichText } from '@/components/content/RichText';

interface Props {
  value: RichDoc | string | undefined;
  onChange: (doc: RichDoc) => void;
}

/** Normalize whatever we're given into an editable RichDoc with ≥1 span. */
function toDoc(value: RichDoc | string | undefined): RichDoc {
  if (isRichDoc(value)) {
    return { type: 'rich', align: value.align, spans: value.spans.length ? value.spans : [{ text: '' }] };
  }
  if (typeof value === 'string') return { type: 'rich', spans: [{ text: value }] };
  return { type: 'rich', spans: [{ text: '' }] };
}

const inputBase =
  'rounded border border-cream-300 bg-white text-sm text-ink focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink';

function MarkButton({
  active, label, onClick, className = '',
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-8 w-8 shrink-0 rounded border text-sm transition-colors ${
        active ? 'border-ink bg-ink text-cream' : 'border-cream-300 bg-white text-ink hover:bg-cream-200'
      } ${className}`}
    >
      {label}
    </button>
  );
}

export function RichTextEditor({ value, onChange }: Props) {
  const doc = toDoc(value);
  const spans = doc.spans;

  const emit = (next: Partial<RichDoc> & { spans?: RichSpan[] }) =>
    onChange({ type: 'rich', align: doc.align, spans, ...next });

  const patchSpan = (i: number, patch: Partial<RichSpan>) => {
    const nextSpans = spans.map((s, idx) => {
      if (idx !== i) return s;
      const merged = { ...s, ...patch };
      // Drop keys that were explicitly cleared (undefined) so the doc stays lean.
      (Object.keys(patch) as (keyof RichSpan)[]).forEach((k) => {
        if (patch[k] === undefined) delete merged[k];
      });
      return merged;
    });
    emit({ spans: nextSpans });
  };

  const toggleMark = (i: number, mark: 'b' | 'i' | 'u') =>
    patchSpan(i, { [mark]: spans[i][mark] ? undefined : true });

  const addSpan = () => emit({ spans: [...spans, { text: '' }] });

  const removeSpan = (i: number) => {
    const next = spans.filter((_, idx) => idx !== i);
    emit({ spans: next.length ? next : [{ text: '' }] });
  };

  const moveSpan = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= spans.length) return;
    const next = spans.slice();
    [next[i], next[j]] = [next[j], next[i]];
    emit({ spans: next });
  };

  const setAlign = (align: 'left' | 'center' | 'right') =>
    onChange({ type: 'rich', align, spans });

  return (
    <div className="rounded-card border border-cream-300 bg-cream-soft p-3">
      {/* Block alignment */}
      <div className="mb-3 flex items-center gap-2">
        <span className="text-eyebrow uppercase tracking-eyebrow text-ink-500">Align</span>
        <div className="flex gap-1">
          {(['left', 'center', 'right'] as const).map((a) => (
            <MarkButton
              key={a}
              active={(doc.align ?? 'left') === a}
              label={a === 'left' ? '⇤' : a === 'center' ? '↔' : '⇥'}
              onClick={() => setAlign(a)}
            />
          ))}
        </div>
      </div>

      {/* Segments */}
      <div className="space-y-2">
        {spans.map((span, i) => (
          <div key={i} className="rounded border border-cream-300 bg-white p-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <input
                type="text"
                value={span.text}
                onChange={(e) => patchSpan(i, { text: e.target.value })}
                placeholder="Segment text…"
                className={`${inputBase} h-8 min-w-0 flex-1 px-2`}
              />
              <MarkButton active={!!span.b} label="B" onClick={() => toggleMark(i, 'b')} className="font-bold" />
              <MarkButton active={!!span.i} label="I" onClick={() => toggleMark(i, 'i')} className="italic" />
              <MarkButton active={!!span.u} label="U" onClick={() => toggleMark(i, 'u')} className="underline" />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
              {/* Colour */}
              <label className="flex items-center gap-1 text-xs text-ink-500">
                <span>Colour</span>
                <input
                  type="color"
                  value={typeof span.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(span.color) ? span.color : '#2b211b'}
                  onChange={(e) => patchSpan(i, { color: e.target.value })}
                  className="h-8 w-9 cursor-pointer rounded border border-cream-300 bg-white p-0.5"
                  aria-label="Segment colour"
                />
                {span.color && (
                  <button
                    type="button"
                    onClick={() => patchSpan(i, { color: undefined })}
                    className="text-ink-400 hover:text-ink"
                    aria-label="Clear colour"
                  >
                    ✕
                  </button>
                )}
              </label>

              {/* Size */}
              <label className="flex items-center gap-1 text-xs text-ink-500">
                <span>Size</span>
                <input
                  type="number"
                  min={10}
                  max={72}
                  value={span.size ?? ''}
                  onChange={(e) => {
                    const n = e.target.value === '' ? undefined : Number(e.target.value);
                    patchSpan(i, { size: n === undefined || !Number.isFinite(n) ? undefined : n });
                  }}
                  placeholder="—"
                  className={`${inputBase} h-8 w-16 px-2`}
                />
              </label>

              {/* Font */}
              <label className="flex items-center gap-1 text-xs text-ink-500">
                <span>Font</span>
                <select
                  value={span.font ?? ''}
                  onChange={(e) => patchSpan(i, { font: (e.target.value || undefined) as RichSpan['font'] })}
                  className={`${inputBase} h-8 px-1.5`}
                >
                  <option value="">Default</option>
                  <option value="serif">Serif</option>
                  <option value="sans">Sans</option>
                </select>
              </label>

              {/* Link */}
              <label className="flex min-w-[9rem] flex-1 items-center gap-1 text-xs text-ink-500">
                <span>Link</span>
                <input
                  type="text"
                  value={span.href ?? ''}
                  onChange={(e) => patchSpan(i, { href: e.target.value || undefined })}
                  placeholder="https:// or /path"
                  className={`${inputBase} h-8 min-w-0 flex-1 px-2`}
                />
              </label>

              {/* Row controls */}
              <div className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveSpan(i, -1)}
                  disabled={i === 0}
                  className="h-8 w-8 rounded border border-cream-300 bg-white text-ink transition-colors hover:bg-cream-200 disabled:opacity-40"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveSpan(i, 1)}
                  disabled={i === spans.length - 1}
                  className="h-8 w-8 rounded border border-cream-300 bg-white text-ink transition-colors hover:bg-cream-200 disabled:opacity-40"
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeSpan(i)}
                  className="h-8 w-8 rounded border border-red-300 bg-white text-red-600 transition-colors hover:bg-red-50"
                  aria-label="Remove segment"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addSpan}
        className="mt-2 rounded border border-cream-300 bg-white px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-cream-200"
      >
        + Add segment
      </button>

      {/* Live preview — the exact renderer the public site uses. */}
      <div className="mt-3 border-t border-cream-300 pt-3">
        <span className="text-eyebrow uppercase tracking-eyebrow text-ink-500">Preview</span>
        <div className="mt-1.5 rounded border border-dashed border-cream-300 bg-white px-3 py-2 text-ink">
          <RichText value={doc} />
        </div>
      </div>
    </div>
  );
}
