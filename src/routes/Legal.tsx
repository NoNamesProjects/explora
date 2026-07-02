import { useParams, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

type Doc = 'privacy' | 'terms' | 'code-of-conduct';
const DOCS: Doc[] = ['privacy', 'terms', 'code-of-conduct'];
const KEY: Record<Doc, string> = {
  privacy: 'legal.privacy',
  terms: 'legal.terms',
  'code-of-conduct': 'legal.code',
};

/**
 * Legal pages (/legal/privacy · /legal/terms · /legal/code-of-conduct).
 * Placeholder, partner-replaceable copy — the agency drops in its approved
 * legal text. One param route renders all three from the locale files.
 */
export default function Legal() {
  const { t } = useTranslation();
  const { doc } = useParams<{ doc: string }>();
  if (!doc || !DOCS.includes(doc as Doc)) return <Navigate to="/legal/privacy" replace />;
  const base = KEY[doc as Doc];
  const paras = (t(`${base}.body`, { returnObjects: true }) as string[]) ?? [];

  return (
    <div className="bg-cream">
      <div className="container py-section-y max-w-prose">
        <div className="text-eyebrow uppercase tracking-eyebrow text-ink-600 mb-3">{t('legal.eyebrow')}</div>
        <h1 className="text-display text-ink">{t(`${base}.title`)}</h1>
        <p className="mt-4 text-xs uppercase tracking-[0.14em] text-ink-600/70">{t('legal.placeholder')}</p>
        <div className="mt-10 space-y-6">
          {paras.map((p, i) => (
            <p key={i} className="text-ink-600 leading-relaxed">{p}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
