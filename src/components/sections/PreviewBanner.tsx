/**
 * The "you are looking at unpublished content" bar, shown on a real public route
 * whenever ?cms_preview=1 is present.
 *
 * `active=false` means the URL asked for drafts but the server refused (no admin
 * session) and served published content instead — worth saying out loud, because
 * silently showing the live page to someone who thinks they're previewing a
 * draft is the exact failure a preview feature must not have.
 */
import { useLocation, useNavigate } from 'react-router-dom';
import { PREVIEW_PARAM } from '@/lib/content/useSections';

export function PreviewBanner({ active }: { active: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();

  const exit = () => {
    const params = new URLSearchParams(location.search);
    params.delete(PREVIEW_PARAM);
    const qs = params.toString();
    navigate({ pathname: location.pathname, search: qs ? `?${qs}` : '' }, { replace: true });
  };

  return (
    <div
      role="status"
      className={`sticky top-0 z-[60] flex flex-wrap items-center justify-center gap-3 px-4 py-2 text-center text-xs font-medium ${
        active ? 'bg-accent-gold text-ink' : 'bg-red-600 text-white'
      }`}
    >
      <span>
        {active
          ? 'Preview — showing unpublished draft content. Visitors still see the live page.'
          : 'Preview unavailable — you are not signed in to the admin, so this is the LIVE page.'}
      </span>
      <button
        type="button"
        onClick={exit}
        className="rounded border border-current/40 px-2.5 py-0.5 uppercase tracking-[0.12em] transition-opacity hover:opacity-70"
      >
        Exit preview
      </button>
    </div>
  );
}
