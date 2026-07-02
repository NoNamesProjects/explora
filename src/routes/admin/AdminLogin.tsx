import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { Spinner } from '@/components/admin/ui/Spinner';

interface FormValues { email: string; password: string }

export function AdminLogin() {
  const { t } = useTranslation();
  const { status, login } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/admin';
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormValues>();

  if (status === 'authed') return <Navigate to={from} replace />;

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      await login(values.email.trim(), values.password);
      navigate(from, { replace: true });
    } catch {
      setError(t('admin.login.invalidCredentials', { defaultValue: 'Email or password is incorrect.' }));
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="font-serif text-3xl text-ink">Explora</div>
          <div className="mt-1 text-eyebrow uppercase tracking-eyebrow text-ink-500">{t('admin.login.subtitle', { defaultValue: 'Operations Console' })}</div>
        </div>
        <form
          onSubmit={onSubmit}
          className="rounded-card border border-cream-300 bg-cream-soft p-6 shadow-[0_24px_60px_-44px_rgba(12,35,64,0.5)]"
        >
          {error && (
            <div role="alert" className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <label className="block text-eyebrow uppercase tracking-eyebrow text-ink-500" htmlFor="email">{t('admin.login.email', { defaultValue: 'Email' })}</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            {...register('email', { required: true })}
            className="mt-1.5 mb-4 h-10 w-full rounded border border-cream-300 bg-white px-3 text-sm text-ink focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
          />
          <label className="block text-eyebrow uppercase tracking-eyebrow text-ink-500" htmlFor="password">{t('admin.login.password', { defaultValue: 'Password' })}</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            {...register('password', { required: true })}
            className="mt-1.5 mb-6 h-10 w-full rounded border border-cream-300 bg-white px-3 text-sm text-ink focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
          />
          <button type="submit" disabled={isSubmitting} className="btn-primary w-full disabled:opacity-60">
            {isSubmitting ? <Spinner className="text-cream" /> : t('admin.login.signIn', { defaultValue: 'Sign in' })}
          </button>
        </form>
      </div>
    </div>
  );
}
