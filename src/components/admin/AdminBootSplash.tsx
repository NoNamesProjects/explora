import { useTranslation } from 'react-i18next';

/** Calm full-screen splash while the /me probe resolves (prevents a login flash). */
export function AdminBootSplash() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream">
      <div className="flex flex-col items-center gap-4">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-ink/20 border-t-ink motion-reduce:animate-none" />
        <p className="text-eyebrow uppercase tracking-eyebrow text-ink-500">Aesthisis · {t('admin.chrome.operations', { defaultValue: 'Operations' })}</p>
      </div>
    </div>
  );
}
