import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { api, ApiError } from '@/lib/api';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { useDocumentMeta } from '@/lib/useDocumentMeta';

const schema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  phone: z.string().max(40).optional().or(z.literal('')),
  message: z.string().min(1).max(4000),
});
type FormValues = z.infer<typeof schema>;

/**
 * Contact page — a journey-enquiry form that posts to /api/contact
 * (persists to contact_messages + emails the agency via Resend). No payment;
 * this is the soft-enquiry path for guests who want to speak to a specialist.
 */
export default function Contact() {

  const { t } = useTranslation();
  useDocumentMeta({
    title: t('meta.contact.title', { defaultValue: 'Contact us' }),
    description: t('meta.contact.description', { defaultValue: 'Speak to our team about an Explora Journeys sailing, a private charter or a tailored itinerary.' }),
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = handleSubmit(async (values) => {
    setStatus('submitting');
    try {
      await api.contact.submit({
        name: values.name,
        email: values.email,
        phone: values.phone || undefined,
        message: values.message,
      });
      setStatus('success');
    } catch (err) {
      setStatus('error');
      if (!(err instanceof ApiError)) console.error(err);
    }
  });

  const fieldCls =
    'w-full bg-transparent border-b border-ink/25 text-ink placeholder:text-ink-600/70 ' +
    'px-1 py-2.5 outline-none transition-colors focus:border-accent-gold';

  return (
    <div className="bg-cream">
      {/* Intro band */}
      <section className="border-b border-cream-300/60 bg-cream-soft">
        <div className="container py-section-y max-w-editorial">
          <SectionHeading
            eyebrow={t('contact.page.eyebrow')}
            titleLead={t('contact.page.titleLead')}
            highlight={t('contact.page.titleHighlight')}
            align="center"
            className="mb-5"
          />
          <p className="text-ink-600 text-center max-w-prose mx-auto">
            {t('contact.page.intro')}
          </p>
        </div>
      </section>

      <div className="container py-section-y grid gap-14 lg:grid-cols-[1.1fr_0.9fr] max-w-wide">
        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          {status === 'success' ? (
            <div className="border border-cream-300 bg-cream-soft p-10 text-center">
              <div className="font-serif text-2xl text-ink mb-3">
                {t('contact.page.successTitle')}
              </div>
              <p className="text-ink-600">{t('contact.page.successBody')}</p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-7" noValidate>
              <div>
                <label htmlFor="c-name" className="text-eyebrow uppercase tracking-eyebrow text-ink-600">
                  {t('contact.page.nameLabel')}
                </label>
                <input id="c-name" type="text" autoComplete="name" className={fieldCls} {...register('name')} />
                {errors.name && <p className="mt-1 text-xs text-accent-tan">{t('contact.page.required')}</p>}
              </div>

              <div className="grid gap-7 sm:grid-cols-2">
                <div>
                  <label htmlFor="c-email" className="text-eyebrow uppercase tracking-eyebrow text-ink-600">
                    {t('contact.page.emailLabel')}
                  </label>
                  <input id="c-email" type="email" autoComplete="email" className={fieldCls} {...register('email')} />
                  {errors.email && <p className="mt-1 text-xs text-accent-tan">{t('contact.page.emailInvalid')}</p>}
                </div>
                <div>
                  <label htmlFor="c-phone" className="text-eyebrow uppercase tracking-eyebrow text-ink-600">
                    {t('contact.page.phoneLabel')}
                  </label>
                  <input id="c-phone" type="tel" autoComplete="tel" className={fieldCls} {...register('phone')} />
                </div>
              </div>

              <div>
                <label htmlFor="c-message" className="text-eyebrow uppercase tracking-eyebrow text-ink-600">
                  {t('contact.page.messageLabel')}
                </label>
                <textarea
                  id="c-message"
                  rows={5}
                  placeholder={t('contact.page.messagePlaceholder')}
                  className={`${fieldCls} resize-y`}
                  {...register('message')}
                />
                {errors.message && <p className="mt-1 text-xs text-accent-tan">{t('contact.page.required')}</p>}
              </div>

              {status === 'error' && (
                <p className="text-sm text-accent-tan">{t('contact.page.errorBody')}</p>
              )}

              <button type="submit" className="btn-primary" disabled={status === 'submitting'}>
                {status === 'submitting' ? t('contact.page.sending') : t('contact.page.submit')}
              </button>
              <p className="text-xs text-ink-600/80">{t('contact.page.consent')}</p>
            </form>
          )}
        </motion.div>

        {/* Aside — ways to reach us (text only, email-first) */}
        <aside className="lg:pl-10 lg:border-l border-cream-300/70">
          <div className="text-eyebrow uppercase tracking-eyebrow text-ink-600 mb-6">
            {t('contact.page.asideHeading')}
          </div>
          <dl className="space-y-7">
            <div>
              <dt className="font-serif text-xl text-ink">{t('contact.page.emailUs')}</dt>
              <dd className="mt-1 text-ink-600">
                <a href="mailto:cruises2greece@outlook.com" className="link-underline">
                  cruises2greece@outlook.com
                </a>
              </dd>
            </div>
            <div>
              <dt className="font-serif text-xl text-ink">{t('contact.page.hoursLabel')}</dt>
              <dd className="mt-1 text-ink-600">{t('contact.page.hoursValue')}</dd>
            </div>
            <div>
              <dt className="font-serif text-xl text-ink">{t('contact.page.specialistLabel')}</dt>
              <dd className="mt-1 text-ink-600">{t('contact.page.specialistValue')}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
