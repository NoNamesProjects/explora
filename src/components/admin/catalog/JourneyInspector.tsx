import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/lib/admin/api';
import { pricingApi, type FareOverride } from '@/lib/admin/pricingApi';
import type { CatalogJourneyRow, CatalogFareRow } from '@/lib/admin/types';
import { Drawer } from '@/components/admin/ui/Drawer';
import { Spinner } from '@/components/admin/ui/Spinner';
import { ConfirmDialog } from '@/components/admin/ui/ConfirmDialog';
import { useToast } from '@/components/admin/ui/Toast';
import { dateShort, money } from '@/lib/admin/format';

function priceCell(prices: Record<string, unknown>): string {
  // The UI fare key is '2A' (per-person, two adults). Fall back to the first numeric value.
  const v = (prices?.['2A'] ?? Object.values(prices ?? {}).find((x) => typeof x === 'number')) as number | undefined;
  return v != null ? money(Number(v)) : '—';
}

/** Lowest EUR per-person (2A) across the journey's fares — the feed "from" price. */
function feedFromPrice(fares: CatalogFareRow[]): number | null {
  const vals = fares
    .filter((f) => f.currency === 'EUR')
    .map((f) => Number((f.prices as Record<string, unknown>)?.['2A']))
    .filter((n) => Number.isFinite(n) && n > 0);
  return vals.length ? Math.min(...vals) : null;
}

export function JourneyInspector({
  journey, open, onClose,
}: {
  journey: CatalogJourneyRow | null;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const [fares, setFares] = useState<CatalogFareRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [faresError, setFaresError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Price override state (whole-journey "from" price: suiteCategory '', EUR).
  const [override, setOverride] = useState<FareOverride | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmRevert, setConfirmRevert] = useState(false);

  useEffect(() => {
    if (!open || !journey) return;
    const jid = journey.journeyId;
    setLoading(true);
    setFaresError(false);
    setFares([]);
    setOverride(null);
    setPriceInput('');
    setNoteInput('');
    Promise.all([
      adminApi.catalog.fares(jid).then((r) => setFares(r.items)).catch(() => setFaresError(true)),
      pricingApi.list(jid)
        .then((r) => {
          const ov = r.overrides.find((o) => o.suiteCategory === '' && o.currency === 'EUR') ?? null;
          setOverride(ov);
          if (ov?.price != null) setPriceInput(String(ov.price));
          setNoteInput(ov?.note ?? '');
        })
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [open, journey, reloadKey]);

  const feedFrom = useMemo(() => feedFromPrice(fares), [fares]);
  const active = !!override?.enabled;

  async function saveOverride() {
    if (!journey) return;
    const price = Number(priceInput);
    if (!Number.isFinite(price) || price < 0) {
      toast.push({ tone: 'error', message: t('admin.catalog.inspector.invalidPrice', { defaultValue: 'Enter a valid price (0 or more).' }) });
      return;
    }
    setSaving(true);
    try {
      const r = await pricingApi.set(journey.journeyId, { price, note: noteInput.trim() || undefined });
      setOverride(r.override);
      toast.push({ tone: 'success', message: t('admin.catalog.inspector.overrideSetToast', { defaultValue: 'Override set to {{price}}.', price: money(price) }) });
    } catch {
      toast.push({ tone: 'error', message: t('admin.catalog.inspector.overrideSaveError', { defaultValue: 'Could not save the price override.' }) });
    } finally {
      setSaving(false);
    }
  }

  async function revertOverride() {
    if (!journey) return;
    setSaving(true);
    try {
      await pricingApi.revert(journey.journeyId);
      setOverride(null);
      setPriceInput('');
      setNoteInput('');
      toast.push({ tone: 'success', message: t('admin.catalog.inspector.reverted', { defaultValue: 'Reverted to the feed price.' }) });
    } catch {
      toast.push({ tone: 'error', message: t('admin.catalog.inspector.revertError', { defaultValue: 'Could not revert the override.' }) });
    } finally {
      setSaving(false);
      setConfirmRevert(false);
    }
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(o) => { if (!o) onClose(); }}
      title={journey?.itinDesc || journey?.journeyId || t('admin.catalog.inspector.title', { defaultValue: 'Journey' })}
      subtitle={journey ? `${journey.shipName ?? journey.shipCd} · ${dateShort(journey.sailingDate)} · ${t('admin.catalog.inspector.nightsCount', { defaultValue: '{{count}} nights', count: journey.nights })}` : undefined}
    >
      {!journey ? null : (
        <div className="space-y-6">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            <div><dt className="text-eyebrow uppercase tracking-eyebrow text-ink-500">{t('admin.catalog.inspector.fields.journeyId', { defaultValue: 'Journey id' })}</dt><dd className="text-ink">{journey.journeyId}</dd></div>
            <div><dt className="text-eyebrow uppercase tracking-eyebrow text-ink-500">{t('admin.catalog.inspector.fields.region', { defaultValue: 'Region' })}</dt><dd className="text-ink">{journey.region ?? '—'}</dd></div>
            <div><dt className="text-eyebrow uppercase tracking-eyebrow text-ink-500">{t('admin.catalog.inspector.fields.fromTo', { defaultValue: 'From → to' })}</dt><dd className="text-ink">{journey.sailingPort ?? '?'} → {journey.terminationPort ?? '?'}</dd></div>
            <div><dt className="text-eyebrow uppercase tracking-eyebrow text-ink-500">{t('admin.catalog.inspector.fields.available', { defaultValue: 'Available' })}</dt><dd className="text-ink">{journey.isAvailable ? t('admin.catalog.inspector.yes', { defaultValue: 'Yes' }) : t('admin.catalog.inspector.noMissing', { defaultValue: 'No (missing {{count}}×)', count: journey.consecutiveMissing })}</dd></div>
          </dl>

          {/* Manual "from" price override — survives the nightly flatfile ingest. */}
          <section className="rounded-card border border-cream-300 bg-cream-100/40 p-4">
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-eyebrow uppercase tracking-eyebrow text-ink-500">{t('admin.catalog.inspector.priceOverride', { defaultValue: 'Price override' })}</h3>
              {active && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-gold/40 bg-accent-gold/10 px-2.5 py-0.5 text-xs font-medium text-accent-tan">
                  <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden /> {t('admin.catalog.inspector.overridden', { defaultValue: 'Overridden' })}
                </span>
              )}
            </div>
            <p className="mb-3 text-xs text-ink-500">
              {t('admin.catalog.inspector.feedFromPrice', { defaultValue: 'Feed “from” price:' })}{' '}
              <span className="tabular-nums text-ink">{feedFrom != null ? money(feedFrom) : '—'}</span>
              {active && override?.price != null && (
                <> · {t('admin.catalog.inspector.shownAs', { defaultValue: 'shown as' })} <span className="tabular-nums text-ink">{money(override.price)}</span></>
              )}
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <label className="block">
                <span className="mb-1 block text-eyebrow uppercase tracking-eyebrow text-ink-500">{t('admin.catalog.inspector.overrideFromLabel', { defaultValue: 'Override “from” (EUR)' })}</span>
                <input
                  type="number"
                  min={0}
                  step="1"
                  inputMode="decimal"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  placeholder={feedFrom != null ? String(feedFrom) : '0'}
                  className="w-36 rounded border border-cream-300 bg-white px-3 py-2 text-sm tabular-nums text-ink focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
                />
              </label>
              <label className="block min-w-[10rem] flex-1">
                <span className="mb-1 block text-eyebrow uppercase tracking-eyebrow text-ink-500">{t('admin.catalog.inspector.noteLabel', { defaultValue: 'Note (optional)' })}</span>
                <input
                  type="text"
                  maxLength={500}
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder={t('admin.catalog.inspector.notePlaceholder', { defaultValue: 'e.g. negotiated / promo rate' })}
                  className="w-full rounded border border-cream-300 bg-white px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
                />
              </label>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={saveOverride}
                disabled={saving || !priceInput.trim()}
                className="btn-primary px-4 py-2 text-[0.7rem] disabled:opacity-50"
              >
                {saving ? <Spinner className="text-cream" /> : override ? t('admin.catalog.inspector.updateOverride', { defaultValue: 'Update override' }) : t('admin.catalog.inspector.setOverride', { defaultValue: 'Set override' })}
              </button>
              {override && (
                <button
                  type="button"
                  onClick={() => setConfirmRevert(true)}
                  disabled={saving}
                  className="rounded border border-cream-300 px-4 py-2 text-[0.7rem] font-medium text-ink transition-colors hover:bg-cream-200 disabled:opacity-50"
                >
                  {t('admin.catalog.inspector.revertToFeed', { defaultValue: 'Revert to feed' })}
                </button>
              )}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-eyebrow uppercase tracking-eyebrow text-ink-500">{t('admin.catalog.inspector.faresCount', { defaultValue: 'Fares ({{count}})', count: fares.length })}</h3>
            {loading ? (
              <div className="flex items-center gap-2 py-6 text-sm text-ink-500"><Spinner /> {t('admin.catalog.inspector.loadingFares', { defaultValue: 'Loading fares…' })}</div>
            ) : faresError ? (
              <div className="flex flex-wrap items-center gap-3 rounded-card border border-dashed border-red-300 bg-red-50/40 px-3 py-4 text-sm text-ink">
                <span>{t('admin.catalog.inspector.faresLoadError', { defaultValue: 'Could not load fares.' })}</span>
                <button
                  type="button"
                  onClick={() => setReloadKey((k) => k + 1)}
                  className="rounded border border-ink px-3 py-1 text-xs font-medium uppercase tracking-ui text-ink transition-colors hover:bg-ink hover:text-cream-soft"
                >
                  {t('admin.catalog.inspector.tryAgain', { defaultValue: 'Try again' })}
                </button>
              </div>
            ) : fares.length === 0 ? (
              <p className="text-sm text-ink-500">{t('admin.catalog.inspector.noFares', { defaultValue: 'No fares recorded for this journey.' })}</p>
            ) : (
              <div className="overflow-x-auto rounded-card border border-cream-300">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-cream-300 bg-cream-100/60 text-left text-eyebrow uppercase tracking-eyebrow text-ink-500">
                      <th className="px-3 py-2">{t('admin.catalog.inspector.table.suite', { defaultValue: 'Suite' })}</th><th className="px-3 py-2">{t('admin.catalog.inspector.table.fare', { defaultValue: 'Fare' })}</th>
                      <th className="px-3 py-2">{t('admin.catalog.inspector.table.cur', { defaultValue: 'Cur' })}</th><th className="px-3 py-2 text-right">{t('admin.catalog.inspector.table.perPerson', { defaultValue: 'Per person (2A)' })}</th>
                      <th className="px-3 py-2">{t('admin.catalog.inspector.table.live', { defaultValue: 'Live' })}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fares.map((f, i) => (
                      <tr key={i} className="border-b border-cream-200 last:border-0">
                        <td className="px-3 py-2 text-ink">{f.suiteCategory ?? '—'}</td>
                        <td className="px-3 py-2 text-ink-600">{f.fareCode}</td>
                        <td className="px-3 py-2 text-ink-600">{f.currency}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-ink">{priceCell(f.prices)}</td>
                        <td className="px-3 py-2">{f.nowAvailable ? '✓' : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      <ConfirmDialog
        open={confirmRevert}
        onOpenChange={setConfirmRevert}
        title={t('admin.catalog.inspector.revertDialog.title', { defaultValue: 'Revert to feed price?' })}
        body={t('admin.catalog.inspector.revertDialog.body', { defaultValue: 'This removes the manual override. The cards and detail page show the price computed from the daily flatfile feed again.' })}
        confirmLabel={t('admin.catalog.inspector.revertDialog.confirmLabel', { defaultValue: 'Revert' })}
        tone="danger"
        busy={saving}
        onConfirm={() => void revertOverride()}
      />
    </Drawer>
  );
}
