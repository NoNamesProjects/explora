import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageToggle } from './LanguageToggle';

export function UtilityNav() {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-4 text-accent-gold">
      <LanguageToggle />
      <Link
        to="/contact"
        className="hidden md:inline-flex items-center px-4 py-2 text-[0.7rem] uppercase tracking-[0.18em] font-medium border border-accent-gold text-accent-gold hover:bg-accent-gold hover:text-cream transition-colors duration-300"
      >
        {t('nav.contact')}
      </Link>
    </div>
  );
}
