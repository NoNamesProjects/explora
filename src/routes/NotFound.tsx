import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="container py-section-y text-center">
      <div className="font-serif text-6xl text-ink-600">404</div>
      <h1 className="mt-4 text-display">{t('errors.notFoundTitle')}</h1>
      <p className="mt-4 text-ink-600 max-w-prose mx-auto">{t('errors.notFoundBody')}</p>
      <div className="mt-8">
        <Link to="/" className="btn-primary">
          {t('common.back')}
        </Link>
      </div>
    </div>
  );
}
