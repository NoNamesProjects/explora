import * as NavigationMenu from '@radix-ui/react-navigation-menu';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { megaMenu } from '@/data/megaMenu';
import { ComingSoonTag } from '@/components/ui/ComingSoon';
import { imageUrl } from '@/lib/image';

interface MegaMenuProps {
  /** Filter which top-level triggers render. Defaults to all panels. */
  triggerKeys?: string[];
}

export function MegaMenu({ triggerKeys }: MegaMenuProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const panels = triggerKeys
    ? megaMenu.filter((p) => triggerKeys.includes(p.triggerKey))
    : megaMenu;

  return (
    <NavigationMenu.Root delayDuration={120} className="relative">
      <NavigationMenu.List className="flex items-center gap-9">
        {panels.map((panel) => (
          <NavigationMenu.Item key={panel.triggerKey} className="relative">
            <NavigationMenu.Trigger
              className="text-[0.72rem] uppercase tracking-[0.18em] font-medium text-accent-gold hover:text-ink data-[state=open]:text-ink transition-colors duration-300"
              aria-label={t('aria.openMegaMenu', { section: t(panel.triggerKey) })}
              onClick={() => {
                if (panel.triggerHref) navigate(panel.triggerHref);
              }}
            >
              {t(panel.triggerKey)}
            </NavigationMenu.Trigger>
            <NavigationMenu.Content className="absolute left-0 top-full mt-3 z-50 w-[min(92vw,24rem)] bg-cream text-ink shadow-xl border border-cream-300/60 rounded-card data-[state=open]:animate-[fadeUp_200ms_ease-out]">
              <div className="px-7 py-6">
                <div
                  className="grid gap-10"
                  style={{
                    gridTemplateColumns: `repeat(${
                      panel.columns.length + (panel.featured?.length ?? 0)
                    }, minmax(0, 1fr))`,
                  }}
                >
                  {panel.columns.map((col, ci) => (
                    <div key={ci}>
                      {col.headingKey ? (
                        <div className="eyebrow mb-5">{t(col.headingKey)}</div>
                      ) : null}
                      <ul className="space-y-3">
                        {col.links.map((l) => (
                          <li key={l.href + l.labelKey}>
                            {l.comingSoon ? (
                              <span
                                title="Coming soon"
                                className="text-[0.95rem] text-ink-600 opacity-60 cursor-not-allowed inline-flex items-baseline gap-2"
                              >
                                <span>{t(l.labelKey)}</span>
                                <ComingSoonTag />
                              </span>
                            ) : (
                              <Link
                                to={l.href}
                                className="text-[0.95rem] text-ink hover:text-accent-patina transition-colors inline-flex items-baseline gap-2"
                              >
                                <span>{t(l.labelKey)}</span>
                                {l.badge && (
                                  <span className="text-[0.55rem] uppercase tracking-[0.18em] px-2 py-0.5 border border-ink/30 text-ink-600 rounded-full">
                                    {t(l.badge)}
                                  </span>
                                )}
                              </Link>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}

                  {panel.featured?.map((card, fi) => (
                    <Link key={fi} to={card.href} className="group block">
                      <div className="aspect-[4/5] w-full overflow-hidden bg-cream-200">
                        <img
                          src={imageUrl(card.image, { w: 480, h: 600, fit: 'cover' })}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out-soft group-hover:scale-105"
                          loading="lazy"
                        />
                      </div>
                      <div className="mt-4">
                        {card.eyebrowKey ? (
                          <div className="eyebrow mb-1.5">{t(card.eyebrowKey)}</div>
                        ) : null}
                        <div className="font-serif text-[1.35rem] leading-tight">
                          {t(card.titleKey)}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </NavigationMenu.Content>
          </NavigationMenu.Item>
        ))}
      </NavigationMenu.List>
    </NavigationMenu.Root>
  );
}
