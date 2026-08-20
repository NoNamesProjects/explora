import * as Dialog from '@radix-ui/react-dialog';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
// Async: loads the Greek bundle on demand before switching (src/i18n.ts).
import { changeLanguage } from '@/i18n';

const LANGUAGES = [
  { code: 'en', labelKey: 'footer.switcher.languages.en' },
  { code: 'el', labelKey: 'footer.switcher.languages.el' },
] as const;

export function CountryLanguageSwitcher() {
  const { t } = useTranslation();
  const current = i18n.language.toUpperCase();

  return (
    <Dialog.Root>
      <Dialog.Trigger
        aria-label={t('footer.switcher.title')}
        className="inline-flex items-center gap-1.5 text-sm uppercase tracking-ui hover:opacity-70 transition-opacity"
      >
        <span aria-hidden>🌐</span>
        <span>{current}</span>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-ink/40 backdrop-blur-sm animate-fade-up" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 bg-cream p-8 shadow-2xl">
          <Dialog.Title className="font-serif text-2xl text-ink">
            {t('footer.switcher.title')}
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-ink-600">
            {t('footer.switcher.regions')}
          </Dialog.Description>

          <div className="mt-6">
            <div className="eyebrow mb-3">Language</div>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  className={`pill ${i18n.language === lang.code ? 'bg-ink text-cream border-ink' : ''}`}
                  onClick={() => {
                    void changeLanguage(lang.code);
                  }}
                >
                  {t(lang.labelKey)}
                </button>
              ))}
            </div>
          </div>

          <Dialog.Close
            aria-label={t('aria.closeDialog')}
            className="absolute right-4 top-4 text-2xl leading-none hover:opacity-70"
          >
            ×
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
