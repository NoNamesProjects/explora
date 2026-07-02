import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  subscribersApi,
  type SubscriberRow,
  type SubscriberStatus,
  type SubscriberCounts,
  type Campaign,
} from '@/lib/admin/subscribersApi';
import type { RichDoc } from '@/lib/content/types';
import { dateShort, dateTime, relativeTime } from '@/lib/admin/format';
import { DataTable, type Column } from '@/components/admin/ui/DataTable';
import { Pagination } from '@/components/admin/ui/Pagination';
import { Toolbar, SearchInput, SelectInput } from '@/components/admin/ui/Toolbar';
import { StatCard } from '@/components/admin/ui/StatCard';
import { Panel } from '@/components/admin/ui/Panel';
import { ConfirmDialog } from '@/components/admin/ui/ConfirmDialog';
import { useToast } from '@/components/admin/ui/Toast';
import { RichTextEditor } from '@/components/content/RichTextEditor';
import { RichText } from '@/components/content/RichText';

const PAGE_SIZE = 25;

// ── Small status pills (StatusBadge only knows booking/ingest kinds) ──────────
const SUB_BADGE: Record<SubscriberStatus, string> = {
  confirmed: 'border-accent-patina/40 bg-accent-patina/10 text-accent-patina',
  pending: 'border-accent-gold/40 bg-accent-gold/10 text-accent-tan',
  unsubscribed: 'border-cream-400/60 bg-cream-300/60 text-ink-500',
};
function SubBadge({ status }: { status: SubscriberStatus }) {
  const { t } = useTranslation();
  const label: Record<SubscriberStatus, string> = {
    confirmed: t('admin.subscribers.statusConfirmed', { defaultValue: 'Confirmed' }),
    pending: t('admin.subscribers.statusPending', { defaultValue: 'Pending' }),
    unsubscribed: t('admin.subscribers.statusUnsubscribed', { defaultValue: 'Unsubscribed' }),
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${SUB_BADGE[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {label[status]}
    </span>
  );
}

const CAMPAIGN_BADGE: Record<Campaign['status'], string> = {
  running: 'border-accent-mist/40 bg-accent-mist/10 text-accent-mist',
  ok: 'border-accent-patina/40 bg-accent-patina/10 text-accent-patina',
  failed: 'border-red-300 bg-red-50 text-red-700',
};
function richIsEmpty(v: RichDoc | string | undefined): boolean {
  if (v == null) return true;
  if (typeof v === 'string') return v.trim().length === 0;
  return !v.spans?.some((s) => (s.text ?? '').trim().length > 0);
}

// ── The status card that polls the running campaign ───────────────────────────
function CampaignCard({ campaign }: { campaign: Campaign }) {
  const { t } = useTranslation();
  const [, force] = useState(0);
  const running = campaign.status === 'running';
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const campaignLabel: Record<Campaign['status'], string> = {
    running: t('admin.subscribers.campaignRunning', { defaultValue: 'Sending' }),
    ok: t('admin.subscribers.campaignOk', { defaultValue: 'Sent' }),
    failed: t('admin.subscribers.campaignFailed', { defaultValue: 'Failed' }),
  };

  const elapsed = running
    ? t('admin.subscribers.elapsed', { defaultValue: '{{seconds}}s elapsed', seconds: Math.round((Date.now() - new Date(campaign.startedAt).getTime()) / 1000) })
    : campaign.finishedAt
      ? `${Math.max(0, Math.round((new Date(campaign.finishedAt).getTime() - new Date(campaign.startedAt).getTime()) / 1000))}s`
      : '—';

  return (
    <div className="rounded-card border border-cream-300 bg-cream-soft p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-ink">{t('admin.subscribers.latestBroadcast', { defaultValue: 'Latest broadcast' })}</h3>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${CAMPAIGN_BADGE[campaign.status]}`}>
          <span className={`h-1.5 w-1.5 rounded-full bg-current ${running ? 'animate-pulse motion-reduce:animate-none' : ''}`} aria-hidden />
          {campaignLabel[campaign.status]}
        </span>
      </div>
      <p className="mt-2 truncate text-sm text-ink-600" title={campaign.subject}>{campaign.subject}</p>
      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
        <div><div className="text-eyebrow uppercase tracking-eyebrow text-ink-500">{t('admin.subscribers.recipients', { defaultValue: 'Recipients' })}</div><div className="mt-0.5 tabular-nums text-ink">{campaign.recipients}</div></div>
        <div><div className="text-eyebrow uppercase tracking-eyebrow text-ink-500">{t('admin.subscribers.sent', { defaultValue: 'Sent' })}</div><div className="mt-0.5 tabular-nums text-ink">{campaign.sentCount}</div></div>
        <div><div className="text-eyebrow uppercase tracking-eyebrow text-ink-500">{t('admin.subscribers.failed', { defaultValue: 'Failed' })}</div><div className={`mt-0.5 tabular-nums ${campaign.failedCount ? 'text-red-600' : 'text-ink'}`}>{campaign.failedCount}</div></div>
        <div><div className="text-eyebrow uppercase tracking-eyebrow text-ink-500">{t('admin.subscribers.duration', { defaultValue: 'Duration' })}</div><div className="mt-0.5 tabular-nums text-ink">{elapsed}</div></div>
      </div>
      {campaign.notes && (
        <p className="mt-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">{campaign.notes}</p>
      )}
      <p className="mt-3 text-[0.7rem] text-ink-400">
        {t('admin.subscribers.started', { defaultValue: 'Started' })} {dateTime(campaign.startedAt)}
        {campaign.finishedAt ? ` · ${t('admin.subscribers.finished', { defaultValue: 'finished' })} ${relativeTime(campaign.finishedAt)}` : ''}
      </p>
    </div>
  );
}

export function Subscribers() {
  const { t } = useTranslation();
  const toast = useToast();

  // ── Subscriber list state ───────────────────────────────────────────────────
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [status, setStatus] = useState<SubscriberStatus | ''>('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<SubscriberRow[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<SubscriberCounts>({ confirmed: 0, pending: 0, unsubscribed: 0 });
  const [loading, setLoading] = useState(true);

  const loadList = useCallback(() => {
    setLoading(true);
    return subscribersApi
      .list({ status: status || undefined, q: debouncedQ || undefined, page, pageSize: PAGE_SIZE })
      .then((r) => { setRows(r.items); setTotal(r.total); setCounts(r.counts); })
      .catch(() => toast.push({ tone: 'error', message: t('admin.subscribers.loadError', { defaultValue: 'Could not load subscribers.' }) }))
      .finally(() => setLoading(false));
  }, [status, debouncedQ, page, toast, t]);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(q); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => { void loadList(); }, [loadList]);

  // ── Compose state ────────────────────────────────────────────────────────────
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState<RichDoc | string | undefined>(undefined);
  const [sendingTest, setSendingTest] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const canSend = subject.trim().length > 0 && !richIsEmpty(body);

  // ── Campaign poll ────────────────────────────────────────────────────────────
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const running = campaign?.status === 'running';

  const stopPoll = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const poll = useCallback(async () => {
    try {
      const { campaign } = await subscribersApi.latestCampaign();
      setCampaign(campaign);
      if (campaign && campaign.status !== 'running') {
        stopPoll();
        void loadList();
        toast.push(
          campaign.status === 'ok'
            ? { tone: 'success', message: t('admin.subscribers.broadcastSentToast', { defaultValue: 'Broadcast sent — {{sent}}/{{recipients}} delivered{{failed}}.', sent: campaign.sentCount, recipients: campaign.recipients, failed: campaign.failedCount ? t('admin.subscribers.failedSuffix', { defaultValue: ', {{count}} failed', count: campaign.failedCount }) : '' }) }
            : { tone: 'error', message: t('admin.subscribers.broadcastFailedToast', { defaultValue: 'Broadcast failed{{notes}}', notes: campaign.notes ? `: ${campaign.notes}` : '.' }) },
        );
      }
    } catch { /* transient — keep polling */ }
  }, [stopPoll, loadList, toast, t]);

  const startPoll = useCallback(() => {
    stopPoll();
    pollRef.current = setInterval(poll, 2500);
  }, [stopPoll, poll]);

  // Initial: fetch the latest campaign; resume polling if one is still running.
  useEffect(() => {
    let alive = true;
    subscribersApi.latestCampaign().then(({ campaign }) => {
      if (!alive) return;
      setCampaign(campaign);
      if (campaign?.status === 'running') startPoll();
    }).catch(() => {});
    return () => { alive = false; stopPoll(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendTest = async () => {
    if (!canSend) return;
    setSendingTest(true);
    try {
      const r = await subscribersApi.broadcast({ subject: subject.trim(), body: body!, test: true });
      toast.push(
        r.sent
          ? { tone: 'success', message: t('admin.subscribers.testSentToast', { defaultValue: 'Test sent to {{to}}.', to: r.to }) }
          : { tone: 'info', message: t('admin.subscribers.testNotSent', { defaultValue: 'Test not sent — email is not configured on this server.' }) },
      );
    } catch {
      toast.push({ tone: 'error', message: t('admin.subscribers.testFailed', { defaultValue: 'Could not send the test.' }) });
    } finally {
      setSendingTest(false);
    }
  };

  const sendBroadcast = async () => {
    setSending(true);
    try {
      const r = await subscribersApi.broadcast({ subject: subject.trim(), body: body! });
      setConfirmOpen(false);
      if (r.mode === 'sync') {
        await poll();
      } else {
        setCampaign({
          id: r.campaignId ?? 0, subject: subject.trim(), recipients: r.recipients ?? 0,
          sentCount: 0, failedCount: 0, status: 'running', notes: null,
          startedAt: new Date().toISOString(), finishedAt: null,
        });
        startPoll();
        toast.push({ tone: 'info', message: t('admin.subscribers.sendingToast', { defaultValue: 'Sending to {{count}} subscribers…', count: r.recipients ?? counts.confirmed }) });
      }
    } catch {
      toast.push({ tone: 'error', message: t('admin.subscribers.startFailed', { defaultValue: 'Could not start the broadcast.' }) });
    } finally {
      setSending(false);
    }
  };

  const columns: Column<SubscriberRow>[] = useMemo(() => [
    { key: 'email', header: t('admin.subscribers.colEmail', { defaultValue: 'Email' }), render: (r) => <span className="font-medium text-ink">{r.email}</span> },
    { key: 'status', header: t('admin.subscribers.colStatus', { defaultValue: 'Status' }), render: (r) => <SubBadge status={r.status} /> },
    { key: 'locale', header: t('admin.subscribers.colLocale', { defaultValue: 'Locale' }), render: (r) => <span className="text-ink-600">{r.locale ? r.locale.toUpperCase() : '—'}</span> },
    { key: 'consentAt', header: t('admin.subscribers.colSubscribed', { defaultValue: 'Subscribed' }), render: (r) => <span className="text-xs text-ink-600">{dateShort(r.consentAt)}</span> },
    { key: 'unsubscribedAt', header: t('admin.subscribers.colUnsubscribed', { defaultValue: 'Unsubscribed' }), align: 'right', render: (r) => <span className="text-xs text-ink-600">{r.unsubscribedAt ? dateShort(r.unsubscribedAt) : '—'}</span> },
  ], [t]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-[1.75rem] leading-tight text-ink">{t('admin.subscribers.title', { defaultValue: 'Subscribers' })}</h1>
        <p className="mt-1 text-sm text-ink-500">{t('admin.subscribers.subtitle', { defaultValue: 'Newsletter list and email broadcasts to confirmed subscribers.' })}</p>
      </div>

      {/* Counts */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t('admin.subscribers.statusConfirmed', { defaultValue: 'Confirmed' })} value={counts.confirmed} tone="good" loading={loading && !rows.length} />
        <StatCard label={t('admin.subscribers.statusPending', { defaultValue: 'Pending' })} value={counts.pending} tone="warn" loading={loading && !rows.length} />
        <StatCard label={t('admin.subscribers.statusUnsubscribed', { defaultValue: 'Unsubscribed' })} value={counts.unsubscribed} loading={loading && !rows.length} />
      </div>

      {/* List */}
      <section>
        <Toolbar
          right={
            <a
              href={subscribersApi.exportUrl({ status: status || undefined, q: debouncedQ || undefined })}
              className="rounded border border-cream-300 px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-cream-200"
            >
              {t('admin.subscribers.exportCsv', { defaultValue: 'Export CSV' })}
            </a>
          }
        >
          <SelectInput
            ariaLabel={t('admin.subscribers.filterByStatus', { defaultValue: 'Filter by status' })}
            value={status}
            onChange={(v) => { setStatus(v as SubscriberStatus | ''); setPage(1); }}
            options={[
              { value: '', label: t('admin.subscribers.allStatuses', { defaultValue: 'All statuses' }) },
              { value: 'confirmed', label: t('admin.subscribers.statusConfirmed', { defaultValue: 'Confirmed' }) },
              { value: 'pending', label: t('admin.subscribers.statusPending', { defaultValue: 'Pending' }) },
              { value: 'unsubscribed', label: t('admin.subscribers.statusUnsubscribed', { defaultValue: 'Unsubscribed' }) },
            ]}
          />
          <SearchInput value={q} onChange={setQ} placeholder={t('admin.subscribers.searchPlaceholder', { defaultValue: 'Search email…' })} />
          <span className="text-xs text-ink-500 tabular-nums">{loading ? '…' : t('admin.subscribers.resultCount', { count: total })}</span>
        </Toolbar>
        <DataTable columns={columns} rows={rows} getRowId={(r) => r.email} loading={loading} empty={t('admin.subscribers.empty', { defaultValue: 'No subscribers match.' })} />
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />
      </section>

      {/* Compose */}
      <Panel title={t('admin.subscribers.composeTitle', { defaultValue: 'Compose broadcast' })}>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label htmlFor="broadcast-subject" className="mb-1.5 block text-eyebrow uppercase tracking-eyebrow text-ink-500">{t('admin.subscribers.subject', { defaultValue: 'Subject' })}</label>
              <input
                id="broadcast-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t('admin.subscribers.subjectPlaceholder', { defaultValue: 'A quiet invitation…' })}
                maxLength={200}
                className="h-10 w-full rounded border border-cream-300 bg-white px-3 text-sm text-ink placeholder:text-ink-400 focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-eyebrow uppercase tracking-eyebrow text-ink-500">{t('admin.subscribers.message', { defaultValue: 'Message' })}</label>
              <RichTextEditor value={body} onChange={(doc) => setBody(doc)} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={sendTest}
                disabled={!canSend || sendingTest}
                className="rounded border border-cream-300 px-4 py-2 text-xs font-medium text-ink transition-colors hover:bg-cream-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {sendingTest ? t('admin.subscribers.sending', { defaultValue: 'Sending…' }) : t('admin.subscribers.sendTest', { defaultValue: 'Send test to me' })}
              </button>
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                disabled={!canSend || running || counts.confirmed === 0}
                className="rounded bg-ink px-4 py-2 text-xs font-medium text-cream transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-40"
              >
                {running ? t('admin.subscribers.sending', { defaultValue: 'Sending…' }) : t('admin.subscribers.sendToConfirmed', { defaultValue: 'Send to {{count}} confirmed subscribers', count: counts.confirmed })}
              </button>
            </div>
            {counts.confirmed === 0 && (
              <p className="text-xs text-ink-500">{t('admin.subscribers.noConfirmed', { defaultValue: 'No confirmed subscribers yet — a broadcast has no recipients.' })}</p>
            )}
          </div>

          {/* Live preview */}
          <div>
            <div className="mb-1.5 text-eyebrow uppercase tracking-eyebrow text-ink-500">{t('admin.subscribers.preview', { defaultValue: 'Preview' })}</div>
            <div className="rounded-card border border-cream-300 bg-white p-6">
              {richIsEmpty(body) ? (
                <p className="text-sm text-ink-400">{t('admin.subscribers.previewPlaceholder', { defaultValue: 'Your message preview will appear here.' })}</p>
              ) : (
                <div className="font-serif leading-relaxed text-ink [&_a]:text-accent-tan [&_a]:underline">
                  <RichText value={body} />
                </div>
              )}
            </div>
          </div>
        </div>
      </Panel>

      {campaign && <CampaignCard campaign={campaign} />}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('admin.subscribers.confirmSendTitle', { defaultValue: 'Send this broadcast?' })}
        body={t('admin.subscribers.confirmSendBody', { defaultValue: 'This will email “{{subject}}” to {{count}} confirmed subscribers. Each email carries a personal unsubscribe link. This cannot be undone.', subject: subject.trim() || t('admin.subscribers.yourMessage', { defaultValue: 'your message' }), count: counts.confirmed })}
        confirmLabel={sending ? t('admin.subscribers.sending', { defaultValue: 'Sending…' }) : t('admin.subscribers.sendNow', { defaultValue: 'Send now' })}
        onConfirm={sendBroadcast}
        busy={sending}
      />
    </div>
  );
}
