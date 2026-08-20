import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MediaPicker } from '@/components/admin/media/MediaPicker';
import type {
  CustomPackage, CustomPackagePatch, CustomPackageFare, CustomItineraryDay,
} from '@/lib/admin/customPackagesApi';

/**
 * Editor for one custom package. Fully controlled by the parent drawer: it owns
 * the draft, the parent owns saving. The rate card mirrors the Explora flatfile
 * components (per-person, 3rd/4th adult, child, infant, solo), because the site
 * prices a custom package with the very same engine as a feed sailing.
 */

const label = 'block text-[0.62rem] uppercase tracking-[0.16em] text-ink-500 mb-1.5';
const input =
  'w-full rounded-card border border-cream-300 bg-cream px-3 py-2 text-sm text-ink ' +
  'placeholder:text-ink-400 focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink/15';

function Field({ children, htmlFor, text }: { children: React.ReactNode; htmlFor: string; text: string }) {
  return (
    <div>
      <label className={label} htmlFor={htmlFor}>{text}</label>
      {children}
    </div>
  );
}

export function PackageEditor({
  draft, onChange,
}: {
  draft: CustomPackage;
  onChange: (patch: CustomPackagePatch) => void;
}) {
  const { t } = useTranslation();
  const [picking, setPicking] = useState<null | { kind: 'hero' } | { kind: 'photo' }>(null);

  const set = <K extends keyof CustomPackagePatch>(key: K, value: CustomPackagePatch[K]) =>
    onChange({ [key]: value } as CustomPackagePatch);

  const fares = draft.fares ?? [];
  const setFare = (i: number, patch: Partial<CustomPackageFare>) =>
    set('fares', fares.map((f, n) => (n === i ? { ...f, ...patch } : f)));
  const numOrNull = (v: string) => (v.trim() === '' ? null : Number(v));

  const itinerary = draft.itinerary ?? [];
  const setDay = (i: number, patch: Partial<CustomItineraryDay>) =>
    set('itinerary', itinerary.map((d, n) => (n === i ? { ...d, ...patch } : d)));

  return (
    <div className="space-y-8">
      {/* ── Basics ─────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h3 className="text-eyebrow uppercase tracking-eyebrow text-ink-500">
          {t('admin.packages.sections.basics', { defaultValue: 'Basics' })}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="pk-title-en" text={t('admin.packages.f.titleEn', { defaultValue: 'Title (EN)' })}>
            <input id="pk-title-en" className={input} value={draft.titleEn ?? ''}
              onChange={(e) => set('titleEn', e.target.value)} />
          </Field>
          <Field htmlFor="pk-title-el" text={t('admin.packages.f.titleEl', { defaultValue: 'Title (EL)' })}>
            <input id="pk-title-el" className={input} value={draft.titleEl ?? ''}
              onChange={(e) => set('titleEl', e.target.value)} />
          </Field>
          <Field htmlFor="pk-sum-en" text={t('admin.packages.f.summaryEn', { defaultValue: 'Card summary (EN)' })}>
            <textarea id="pk-sum-en" rows={2} className={`${input} resize-none`} value={draft.summaryEn ?? ''}
              onChange={(e) => set('summaryEn', e.target.value)} />
          </Field>
          <Field htmlFor="pk-sum-el" text={t('admin.packages.f.summaryEl', { defaultValue: 'Card summary (EL)' })}>
            <textarea id="pk-sum-el" rows={2} className={`${input} resize-none`} value={draft.summaryEl ?? ''}
              onChange={(e) => set('summaryEl', e.target.value)} />
          </Field>
          <Field htmlFor="pk-desc-en" text={t('admin.packages.f.descEn', { defaultValue: 'Description (EN)' })}>
            <textarea id="pk-desc-en" rows={4} className={`${input} resize-none`} value={draft.descriptionEn ?? ''}
              onChange={(e) => set('descriptionEn', e.target.value)} />
          </Field>
          <Field htmlFor="pk-desc-el" text={t('admin.packages.f.descEl', { defaultValue: 'Description (EL)' })}>
            <textarea id="pk-desc-el" rows={4} className={`${input} resize-none`} value={draft.descriptionEl ?? ''}
              onChange={(e) => set('descriptionEl', e.target.value)} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field htmlFor="pk-region" text={t('admin.packages.f.region', { defaultValue: 'Region' })}>
            <input id="pk-region" className={input} placeholder="mediterranean" value={draft.region ?? ''}
              onChange={(e) => set('region', e.target.value)} />
          </Field>
          <Field htmlFor="pk-nights" text={t('admin.packages.f.nights', { defaultValue: 'Nights' })}>
            <input id="pk-nights" type="number" min={0} className={input} value={draft.nights ?? 0}
              onChange={(e) => set('nights', Number(e.target.value))} />
          </Field>
          <Field htmlFor="pk-date" text={t('admin.packages.f.sailingDate', { defaultValue: 'Departure date' })}>
            <input id="pk-date" type="date" className={input} value={draft.sailingDate ?? ''}
              onChange={(e) => set('sailingDate', e.target.value || null)} />
          </Field>
          <Field htmlFor="pk-from" text={t('admin.packages.f.fromPort', { defaultValue: 'Departs from' })}>
            <input id="pk-from" className={input} value={draft.sailingPortName ?? ''}
              onChange={(e) => set('sailingPortName', e.target.value)} />
          </Field>
          <Field htmlFor="pk-to" text={t('admin.packages.f.toPort', { defaultValue: 'Arrives at' })}>
            <input id="pk-to" className={input} value={draft.terminationPortName ?? ''}
              onChange={(e) => set('terminationPortName', e.target.value)} />
          </Field>
          <Field htmlFor="pk-dep" text={t('admin.packages.f.depositPct', { defaultValue: 'Deposit % (optional)' })}>
            <input id="pk-dep" type="number" min={0} max={100} className={input}
              placeholder={t('admin.packages.f.depositDefault', { defaultValue: 'Site default' })}
              value={draft.depositPct ?? ''}
              onChange={(e) => set('depositPct', numOrNull(e.target.value))} />
          </Field>
        </div>
      </section>

      {/* ── Photos ─────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h3 className="text-eyebrow uppercase tracking-eyebrow text-ink-500">
          {t('admin.packages.sections.photos', { defaultValue: 'Photos' })}
        </h3>
        <div className="flex items-start gap-4">
          <div className="h-24 w-36 shrink-0 overflow-hidden rounded-card border border-cream-300 bg-cream">
            {draft.heroImage
              ? <img src={draft.heroImage} alt="" className="h-full w-full object-cover" />
              : <span className="flex h-full items-center justify-center text-[0.6rem] text-ink-400">
                  {t('admin.packages.noHero', { defaultValue: 'No hero image' })}
                </span>}
          </div>
          <div className="flex flex-col gap-2">
            <button type="button" onClick={() => setPicking({ kind: 'hero' })}
              className="rounded-card border border-ink px-3 py-1.5 text-xs text-ink hover:bg-ink hover:text-cream">
              {t('admin.packages.chooseHero', { defaultValue: 'Choose hero image' })}
            </button>
            {draft.heroImage && (
              <button type="button" onClick={() => set('heroImage', null)}
                className="text-xs text-ink-500 underline">
                {t('admin.packages.clear', { defaultValue: 'Clear' })}
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(draft.photos ?? []).map((p, i) => (
            <div key={`${p.url}-${i}`} className="relative h-16 w-24 overflow-hidden rounded-card border border-cream-300">
              <img src={p.url} alt={p.altEn ?? ''} className="h-full w-full object-cover" />
              <button type="button"
                onClick={() => set('photos', (draft.photos ?? []).filter((_, n) => n !== i))}
                aria-label={t('admin.packages.removePhoto', { defaultValue: 'Remove photo' })}
                className="absolute right-1 top-1 rounded-full bg-ink/80 px-1.5 text-[0.65rem] leading-4 text-cream">×</button>
            </div>
          ))}
          <button type="button" onClick={() => setPicking({ kind: 'photo' })}
            className="h-16 w-24 rounded-card border border-dashed border-cream-300 text-xs text-ink-500 hover:border-ink hover:text-ink">
            + {t('admin.packages.addPhoto', { defaultValue: 'Add' })}
          </button>
        </div>
      </section>

      {/* ── Itinerary ──────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h3 className="text-eyebrow uppercase tracking-eyebrow text-ink-500">
          {t('admin.packages.sections.itinerary', { defaultValue: 'Itinerary' })}
        </h3>
        <div className="space-y-2">
          {itinerary.map((d, i) => (
            <div key={i} className="grid grid-cols-[3rem_1fr_1fr_5rem_5rem_2rem] items-center gap-2">
              <input type="number" min={1} className={input} value={d.dayNumber ?? i + 1}
                aria-label={t('admin.packages.f.day', { defaultValue: 'Day' })}
                onChange={(e) => setDay(i, { dayNumber: Number(e.target.value) })} />
              <input className={input} placeholder={t('admin.packages.f.port', { defaultValue: 'Port' })}
                value={d.portName ?? ''} onChange={(e) => setDay(i, { portName: e.target.value })} />
              <input className={input} placeholder={t('admin.packages.f.country', { defaultValue: 'Country' })}
                value={d.country ?? ''} onChange={(e) => setDay(i, { country: e.target.value })} />
              <input className={input} placeholder="09:00" value={d.arrivalTime ?? ''}
                aria-label={t('admin.packages.f.arrive', { defaultValue: 'Arrives' })}
                onChange={(e) => setDay(i, { arrivalTime: e.target.value })} />
              <input className={input} placeholder="18:00" value={d.departureTime ?? ''}
                aria-label={t('admin.packages.f.depart', { defaultValue: 'Departs' })}
                onChange={(e) => setDay(i, { departureTime: e.target.value })} />
              <button type="button" onClick={() => set('itinerary', itinerary.filter((_, n) => n !== i))}
                aria-label={t('admin.packages.removeDay', { defaultValue: 'Remove day' })}
                className="text-ink-500 hover:text-red-700">×</button>
            </div>
          ))}
        </div>
        <button type="button"
          onClick={() => set('itinerary', [...itinerary, { dayNumber: itinerary.length + 1 }])}
          className="rounded-card border border-cream-300 px-3 py-1.5 text-xs text-ink hover:border-ink">
          + {t('admin.packages.addDay', { defaultValue: 'Add day' })}
        </button>
      </section>

      {/* ── Inclusions ─────────────────────────────────────────────────────── */}
      <section className="space-y-2">
        <h3 className="text-eyebrow uppercase tracking-eyebrow text-ink-500">
          {t('admin.packages.sections.inclusions', { defaultValue: 'Inclusions' })}
        </h3>
        <textarea rows={3} className={`${input} resize-none`}
          placeholder={t('admin.packages.inclusionsHint', { defaultValue: 'One per line' })}
          value={(draft.inclusions ?? []).join('\n')}
          onChange={(e) => set('inclusions', e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))} />
      </section>

      {/* ── Rate card ──────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h3 className="text-eyebrow uppercase tracking-eyebrow text-ink-500">
          {t('admin.packages.sections.fares', { defaultValue: 'Suites & prices' })}
        </h3>
        <p className="text-xs text-ink-500">
          {t('admin.packages.faresHint', {
            defaultValue: 'Per-person is the price each of the first two adults pays. Leave a rate blank and the booking falls back to the next safest price.',
          })}
        </p>
        {fares.map((f, i) => (
          <div key={i} className="space-y-3 rounded-card border border-cream-300 p-3">
            <div className="grid gap-2 sm:grid-cols-4">
              <input className={input} placeholder={t('admin.packages.f.suiteCode', { defaultValue: 'Suite code (OT1)' })}
                value={f.suiteCategory} onChange={(e) => setFare(i, { suiteCategory: e.target.value })} />
              <input className={input} placeholder={t('admin.packages.f.suiteName', { defaultValue: 'Suite name' })}
                value={f.suiteName ?? ''} onChange={(e) => setFare(i, { suiteName: e.target.value })} />
              <input className={input} placeholder={t('admin.packages.f.fareCode', { defaultValue: 'Fare code' })}
                value={f.fareCode} onChange={(e) => setFare(i, { fareCode: e.target.value })} />
              <input className={input} placeholder={t('admin.packages.f.fareLabel', { defaultValue: 'Fare label' })}
                value={f.fareLabel ?? ''} onChange={(e) => setFare(i, { fareLabel: e.target.value })} />
            </div>
            <div className="grid gap-2 sm:grid-cols-5">
              {([
                ['perPerson', t('admin.packages.f.perPerson', { defaultValue: 'Per person €' })],
                ['thirdFourthAdult', t('admin.packages.f.adult34', { defaultValue: '3rd/4th adult €' })],
                ['thirdFourthChild', t('admin.packages.f.child', { defaultValue: 'Child €' })],
                ['thirdFourthInfant', t('admin.packages.f.infant', { defaultValue: 'Infant €' })],
                ['soloFare', t('admin.packages.f.solo', { defaultValue: 'Solo €' })],
              ] as const).map(([key, text]) => (
                <div key={key}>
                  <span className={label}>{text}</span>
                  <input type="number" min={0} className={input}
                    value={(f[key] as number | null | undefined) ?? ''}
                    onChange={(e) => setFare(i, { [key]: numOrNull(e.target.value) } as Partial<CustomPackageFare>)} />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-ink-600">
                <input type="checkbox" checked={f.nowAvailable ?? true}
                  onChange={(e) => setFare(i, { nowAvailable: e.target.checked })} />
                {t('admin.packages.f.available', { defaultValue: 'Available to book' })}
              </label>
              <button type="button" onClick={() => set('fares', fares.filter((_, n) => n !== i))}
                className="text-xs text-red-700 underline">
                {t('admin.packages.removeFare', { defaultValue: 'Remove suite' })}
              </button>
            </div>
          </div>
        ))}
        <button type="button"
          onClick={() => set('fares', [...fares, { suiteCategory: '', fareCode: 'CUSTOM', perPerson: null, nowAvailable: true }])}
          className="rounded-card border border-cream-300 px-3 py-1.5 text-xs text-ink hover:border-ink">
          + {t('admin.packages.addFare', { defaultValue: 'Add suite' })}
        </button>
      </section>

      <MediaPicker
        open={picking !== null}
        onOpenChange={(o) => !o && setPicking(null)}
        onPick={(asset) => {
          if (picking?.kind === 'hero') set('heroImage', asset.url);
          else set('photos', [...(draft.photos ?? []), { url: asset.url, altEn: asset.alt ?? null }]);
          setPicking(null);
        }}
      />
    </div>
  );
}
