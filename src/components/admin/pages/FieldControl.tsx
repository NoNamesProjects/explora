/**
 * One editor control per declared field type — the admin-side mirror of
 * lib/content-sanitize.ts's sanitizeLeaf. The section-type registry describes a
 * field; this renders the right input for it, so adding a field to a section
 * type needs NO new admin UI code.
 *
 * Bilingual fields render EN and ΕΛ side by side and store `{ en, el }`;
 * everything else stores its value bare. That split lives in fieldIsBilingual()
 * so the client and the server sanitizer agree on the shape.
 */
import { useState } from 'react';
import { RichTextEditor } from '@/components/content/RichTextEditor';
import { MediaPicker } from '@/components/admin/media/MediaPicker';
import { fieldIsBilingual, type SectionField, type ButtonValue } from '@/content/sectionTypes';
import type { RichDoc } from '@/lib/content/types';

const inputCls =
  'h-9 w-full rounded border border-cream-300 bg-white px-2.5 text-sm text-ink placeholder:text-ink-400 focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink';
const areaCls =
  'w-full rounded border border-cream-300 bg-white px-2.5 py-2 text-sm text-ink placeholder:text-ink-400 focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink';

interface ImageValue { src: string; alt?: string }

/** Aspect mismatch beyond this reads as "will be visibly cropped". */
const ASPECT_TOLERANCE = 0.08;

// ── Image control (with the declared-slot aspect hint) ───────────────────────

function ImageControl({
  field, value, onChange,
}: { field: SectionField; value: unknown; onChange: (v: unknown) => void }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const img = (value && typeof value === 'object' ? value : { src: typeof value === 'string' ? value : '' }) as ImageValue;
  const slot = field.imageSlot;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={img.src ?? ''}
          onChange={(e) => onChange({ ...img, src: e.target.value })}
          placeholder="/photos/… or /uploads/… or https://…"
          aria-label={`${field.label} — image URL`}
          className={inputCls}
        />
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="h-9 shrink-0 rounded border border-cream-300 bg-white px-3 text-xs font-medium text-ink transition-colors hover:bg-cream-200"
        >
          Choose image
        </button>
      </div>
      <input
        type="text"
        value={img.alt ?? ''}
        onChange={(e) => onChange({ ...img, alt: e.target.value || undefined })}
        placeholder="Alt text (describe the image for screen readers)"
        aria-label={`${field.label} — alt text`}
        className={inputCls}
      />
      {slot && (
        <p className="text-[0.7rem] text-ink-400">
          Displays at {slot.w}×{slot.h}{slot.note ? ` · ${slot.note}` : ''}. Other shapes are
          centre-cropped to fit.
        </p>
      )}
      {img.src && (
        <div
          className="overflow-hidden rounded border border-cream-300 bg-cream-100"
          style={slot ? { aspectRatio: `${slot.w} / ${slot.h}`, maxWidth: 260 } : { maxWidth: 260 }}
        >
          {/* Previewed in the slot's real aspect so "how will it display" is
              answered here, not after publishing. */}
          <img src={img.src} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      <MediaPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={(asset) => {
          const picked = asset as { url: string; alt?: string; width?: number | null; height?: number | null };
          onChange({ src: picked.url, alt: picked.alt ?? img.alt });
          if (slot && picked.width && picked.height) {
            const want = slot.w / slot.h;
            const got = picked.width / picked.height;
            if (Math.abs(got - want) / want > ASPECT_TOLERANCE) {
              console.info(
                `[cms] picked image is ${picked.width}×${picked.height}; this slot displays ${slot.w}×${slot.h} — it will be cropped.`,
              );
            }
          }
          setPickerOpen(false);
        }}
      />
    </div>
  );
}

// ── Button control ───────────────────────────────────────────────────────────

function ButtonControl({ value, onChange }: { value: unknown; onChange: (v: unknown) => void }) {
  const b = (value && typeof value === 'object' ? value : {}) as ButtonValue;
  const set = (patch: Partial<ButtonValue>) => onChange({ ...b, ...patch });
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="block">
        <span className="text-[0.65rem] uppercase tracking-eyebrow text-ink-500">Label (EN)</span>
        <input type="text" value={b.labelEn ?? ''} onChange={(e) => set({ labelEn: e.target.value })} className={`mt-1 ${inputCls}`} />
      </label>
      <label className="block">
        <span className="text-[0.65rem] uppercase tracking-eyebrow text-ink-500">Label (ΕΛ)</span>
        <input type="text" value={b.labelEl ?? ''} onChange={(e) => set({ labelEl: e.target.value })} className={`mt-1 ${inputCls}`} />
      </label>
      <label className="block">
        <span className="text-[0.65rem] uppercase tracking-eyebrow text-ink-500">Link</span>
        <input type="text" value={b.href ?? ''} onChange={(e) => set({ href: e.target.value })} placeholder="/find-your-journey" className={`mt-1 ${inputCls}`} />
      </label>
      <label className="block">
        <span className="text-[0.65rem] uppercase tracking-eyebrow text-ink-500">Style</span>
        <select value={b.style ?? 'primary'} onChange={(e) => set({ style: e.target.value })} className={`mt-1 ${inputCls}`}>
          <option value="primary">Filled</option>
          <option value="secondary">Outlined</option>
          <option value="ghost">Text link</option>
        </select>
      </label>
      <p className="sm:col-span-2 text-[0.7rem] text-ink-400">A button only shows when it has both a label and a link.</p>
    </div>
  );
}

// ── Cards (repeating group) ──────────────────────────────────────────────────

function CardsControl({
  field, value, onChange,
}: { field: SectionField; value: unknown; onChange: (v: unknown) => void }) {
  const items = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
  const itemFields = field.itemFields ?? [];
  const max = field.maxItems ?? 24;

  const write = (next: Record<string, unknown>[]) => onChange(next);
  const patch = (i: number, key: string, v: unknown) =>
    write(items.map((it, idx) => (idx === i ? { ...it, [key]: v } : it)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = items.slice();
    [next[i], next[j]] = [next[j], next[i]];
    write(next);
  };

  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <p className="rounded border border-dashed border-cream-300 px-3 py-6 text-center text-xs text-ink-500">
          No cards yet — add the first one below.
        </p>
      )}

      {items.map((item, i) => (
        <div key={i} className="rounded-card border border-cream-300 bg-white p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[0.65rem] uppercase tracking-eyebrow text-ink-500">Card {i + 1}</span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move card up"
                className="h-7 w-7 rounded border border-cream-300 text-ink transition-colors hover:bg-cream-200 disabled:opacity-40">↑</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move card down"
                className="h-7 w-7 rounded border border-cream-300 text-ink transition-colors hover:bg-cream-200 disabled:opacity-40">↓</button>
              <button type="button" onClick={() => write(items.filter((_, idx) => idx !== i))} aria-label="Remove card"
                className="h-7 w-7 rounded border border-red-300 text-red-600 transition-colors hover:bg-red-50">✕</button>
            </div>
          </div>
          <div className="space-y-3">
            {itemFields.map((f) => (
              <FieldControl
                key={f.key}
                field={f}
                value={item[f.key]}
                onChange={(v) => patch(i, f.key, v)}
                compact
              />
            ))}
          </div>
        </div>
      ))}

      <button
        type="button"
        disabled={items.length >= max}
        onClick={() => write([...items, {}])}
        className="rounded border border-cream-300 bg-white px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-cream-200 disabled:opacity-40"
      >
        + Add card
      </button>
    </div>
  );
}

// ── One leaf control (no bilingual wrapper) ──────────────────────────────────

function LeafControl({
  field, value, onChange, ariaLabel,
}: { field: SectionField; value: unknown; onChange: (v: unknown) => void; ariaLabel: string }) {
  switch (field.type) {
    case 'rich':
      return <RichTextEditor value={value as RichDoc | string | undefined} onChange={(doc) => onChange(doc)} />;
    case 'list':
      return (
        <textarea
          rows={5}
          value={Array.isArray(value) ? (value as string[]).join('\n') : ''}
          onChange={(e) => onChange(e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))}
          placeholder="One item per line…"
          aria-label={ariaLabel}
          className={areaCls}
        />
      );
    case 'number':
      return (
        <input type="number" value={value == null ? '' : String(value)}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          aria-label={ariaLabel} className={inputCls} />
      );
    case 'link':
      return (
        <input type="text" value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)} placeholder="/a-page or https://…"
          aria-label={ariaLabel} className={inputCls} />
      );
    case 'plain':
    default:
      return (
        <textarea rows={2} value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)} aria-label={ariaLabel} className={areaCls} />
      );
  }
}

// ── The dispatcher ───────────────────────────────────────────────────────────

export function FieldControl({
  field, value, onChange, compact = false,
}: {
  field: SectionField;
  value: unknown;
  onChange: (v: unknown) => void;
  compact?: boolean;
}) {
  const label = (
    <div className="mb-1.5">
      <span className={`${compact ? 'text-[0.65rem]' : 'text-eyebrow'} uppercase tracking-eyebrow text-ink-500`}>
        {field.label}
      </span>
      {field.help && <p className="mt-0.5 text-[0.7rem] text-ink-400">{field.help}</p>}
    </div>
  );

  // Non-bilingual types own their whole value.
  if (field.type === 'image') {
    return <div>{label}<ImageControl field={field} value={value} onChange={onChange} /></div>;
  }
  if (field.type === 'button') {
    return <div>{label}<ButtonControl value={value} onChange={onChange} /></div>;
  }
  if (field.type === 'cards') {
    return <div>{label}<CardsControl field={field} value={value} onChange={onChange} /></div>;
  }
  if (field.type === 'toggle') {
    return (
      <label className="flex items-center gap-2.5 text-sm text-ink">
        <input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} className="accent-[#0C2340]" />
        <span>{field.label}</span>
        {field.help && <span className="text-[0.7rem] text-ink-400">— {field.help}</span>}
      </label>
    );
  }
  if (field.type === 'select') {
    return (
      <div>
        {label}
        <select
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value || null)}
          aria-label={field.label}
          className={inputCls}
        >
          <option value="">— default —</option>
          {(field.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    );
  }

  // Bilingual leaf → two controls sharing one { en, el } value.
  if (fieldIsBilingual(field)) {
    const byLocale = (value && typeof value === 'object' && !Array.isArray(value) ? value : {}) as Record<string, unknown>;
    const setLocale = (loc: 'en' | 'el', v: unknown) => onChange({ ...byLocale, [loc]: v });
    return (
      <div>
        {label}
        <div className="grid gap-3 lg:grid-cols-2">
          {(['en', 'el'] as const).map((loc) => (
            <div key={loc}>
              <div className="mb-1 text-[0.65rem] uppercase tracking-eyebrow text-ink-400">
                {loc === 'en' ? 'EN' : 'ΕΛ'}
              </div>
              <LeafControl
                field={field}
                value={byLocale[loc]}
                onChange={(v) => setLocale(loc, v)}
                ariaLabel={`${field.label} (${loc.toUpperCase()})`}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <div>{label}<LeafControl field={field} value={value} onChange={onChange} ariaLabel={field.label} /></div>;
}
