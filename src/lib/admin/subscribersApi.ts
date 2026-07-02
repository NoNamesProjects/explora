/**
 * Client API for the Subscribers admin page — newsletter subscriber list,
 * CSV export, and the email-broadcast composer/poller. Same idioms as
 * src/lib/admin/api.ts (adminFetch sends the session cookie; qs drops empties).
 */
import { adminFetch, post, qs } from './api';
import type { RichDoc } from '@/lib/content/types';

export type SubscriberStatus = 'confirmed' | 'pending' | 'unsubscribed';

export interface SubscriberRow {
  email: string;
  status: SubscriberStatus;
  locale: string | null;
  consentAt: string | null;
  unsubscribedAt: string | null;
}

export interface SubscriberCounts {
  confirmed: number;
  pending: number;
  unsubscribed: number;
}

export interface SubscriberListResult {
  ok: true;
  items: SubscriberRow[];
  total: number;
  page: number;
  pageSize: number;
  counts: SubscriberCounts;
}

export interface SubscriberFilters {
  status?: SubscriberStatus | '';
  q?: string;
  page?: number;
  pageSize?: number;
}

export type CampaignStatus = 'running' | 'ok' | 'failed';

export interface Campaign {
  id: number;
  subject: string;
  recipients: number;
  sentCount: number;
  failedCount: number;
  status: CampaignStatus;
  notes: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface BroadcastResult {
  ok: true;
  mode: 'sync' | 'async' | 'test';
  campaignId?: number;
  recipients?: number;
  sent?: number;
  failed?: number;
  to?: string;
}

export interface BroadcastInput {
  subject: string;
  body: RichDoc | string;
  test?: boolean;
}

export const subscribersApi = {
  list: (f: SubscriberFilters = {}) =>
    adminFetch<SubscriberListResult>('/api/admin/subscribers' + qs({ ...f })),
  exportUrl: (f: SubscriberFilters = {}) =>
    '/api/admin/subscribers' + qs({ ...f, format: 'csv' }),
  broadcast: (input: BroadcastInput) => post<BroadcastResult>('/api/admin/broadcast', input),
  latestCampaign: () => adminFetch<{ campaign: Campaign | null }>('/api/admin/broadcast'),
};
