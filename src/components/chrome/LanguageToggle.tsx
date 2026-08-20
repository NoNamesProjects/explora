import { useTranslation } from 'react-i18next';
// Async: loads the Greek bundle on demand before switching (src/i18n.ts).
import { changeLanguage } from '@/i18n';

/**
 * Segmented EN | ΕΛ language toggle. Two pills; the active locale is filled
 * gold, the inactive one muted. Clicking a pill switches the whole site via
 * i18next (`changeLanguage` persists to localStorage and syncs <html lang>).
 * Lives in the header chrome, to the left of the Contact link.
 */
const LOCALES = [
  { code: 'en', label: 'EN' },
  { code: 'el', label: 'ΕΛ' },
] as const;

export function LanguageToggle({ className = '' }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const active = i18n.language?.startsWith('el') ? 'el' : 'en';

  return (
    <div
      role="group"
      aria-label={t('aria.language', { defaultValue: 'Change language' })}
      className={[
        'inline-flex items-center rounded-full border border-accent-gold/60 p-0.5',
        className,
      ].join(' ')}
    >
      {LOCALES.map((l) => {
        const isActive = active === l.code;
        return (
          <button
            key={l.code}
            type="button"
            aria-pressed={isActive}
            onClick={() => {
              if (!isActive) void changeLanguage(l.code);
            }}
            className={[
              'min-w-[2.25rem] rounded-full px-2.5 py-1 text-[0.7rem] font-medium uppercase tracking-[0.16em] transition-colors duration-300',
              isActive
                ? 'bg-accent-gold text-cream'
                : 'text-accent-gold hover:text-ink',
            ].join(' ')}
          >
            {l.label}
          </button>
        );
      })}
    </div>
  );
}
