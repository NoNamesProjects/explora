import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Footer newsletter box.
 *
 * Deliberately dependency-free. This component is a static import from the
 * public layout's footer, so anything it pulls in lands in the eager entry
 * chunk: it previously dragged zod + react-hook-form (about 80 KB) onto first
 * paint to validate a single email field. The server re-validates with zod
 * anyway (api/newsletter.ts), so this only needs to catch typos before the
 * round trip.
 */

// Deliberately permissive: the authoritative check is server-side, and an
// over-strict client regex rejects valid addresses.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface Props {
  variant?: 'light' | 'dark';
}

export function NewsletterInline({ variant = 'light' }: Props) {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setStatus('submitting');
    setErrorMsg(null);
    try {
      // Real double-opt-in endpoint: records consent + sends a confirmation
      // email. Success = "check your inbox to confirm" (newsletter.success).
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          email: value,
          locale: i18n.language?.startsWith('el') ? 'el' : 'en',
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean } | null;
      if (!res.ok || data?.ok === false) throw new Error('server');
      setStatus('success');
    } catch {
      setStatus('error');
      setErrorMsg(t('newsletter.errors.server'));
    }
  };

  if (status === 'success') {
    return <div className="text-sm">{t('newsletter.success')}</div>;
  }

  const inputCls = variant === 'dark'
    ? 'bg-transparent border-b border-cream/40 text-cream placeholder:text-cream/50 focus:border-cream'
    : 'bg-transparent border-b border-ink/30 text-ink placeholder:text-ink-600 focus:border-ink';

  const btnCls = variant === 'dark'
    ? 'btn-secondary border-cream text-cream hover:bg-cream hover:text-ink'
    : 'btn-primary';

  return (
    <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3">
      <label htmlFor="newsletter-email" className="sr-only">{t('newsletter.emailLabel')}</label>
      <input
        id="newsletter-email"
        type="email"
        autoComplete="email"
        placeholder={t('newsletter.emailPlaceholder')}
        className={`flex-1 px-1 py-2 outline-none transition-colors ${inputCls}`}
        value={email}
        onChange={(e) => { setEmail(e.target.value); if (invalid) setInvalid(false); }}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? 'newsletter-email-error' : undefined}
      />
      <button type="submit" className={btnCls} disabled={status === 'submitting'}>
        {status === 'submitting' ? t('newsletter.submitting') : t('newsletter.submit')}
      </button>
      {invalid && <div id="newsletter-email-error" className="text-xs opacity-70">{t('newsletter.errors.emailInvalid')}</div>}
      {errorMsg && <div className="text-xs opacity-70">{errorMsg}</div>}
    </form>
  );
}
