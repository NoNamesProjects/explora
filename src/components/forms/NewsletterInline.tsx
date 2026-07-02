import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  consent: z.literal(true).optional().default(true),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  variant?: 'light' | 'dark';
}

export function NewsletterInline({ variant = 'light' }: Props) {
  const { t, i18n } = useTranslation();
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { consent: true },
  });

  const onSubmit = handleSubmit(async (values) => {
    setStatus('submitting');
    setErrorMsg(null);
    try {
      // Real double-opt-in endpoint: records consent + sends a confirmation
      // email. Success = "check your inbox to confirm" (newsletter.success).
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          email: values.email,
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
  });

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
        {...register('email')}
      />
      <button type="submit" className={btnCls} disabled={status === 'submitting'}>
        {status === 'submitting' ? t('newsletter.submitting') : t('newsletter.submit')}
      </button>
      {errors.email && <div className="text-xs opacity-70">{t('newsletter.errors.emailInvalid')}</div>}
      {errorMsg && <div className="text-xs opacity-70">{errorMsg}</div>}
    </form>
  );
}
