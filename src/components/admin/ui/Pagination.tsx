export function Pagination({
  page, pageSize, total, onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const btn =
    'inline-flex h-8 min-w-8 items-center justify-center rounded border border-cream-300 px-2 text-xs text-ink ' +
    'transition-colors hover:bg-cream-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent';
  return (
    <div className="flex items-center justify-between gap-4 pt-3 text-xs text-ink-500">
      <span className="tabular-nums">{from}–{to} of {total}</span>
      <div className="flex items-center gap-1.5">
        <button type="button" className={btn} disabled={page <= 1} onClick={() => onPage(page - 1)}>Prev</button>
        <span className="px-1 tabular-nums">Page {page} / {pages}</span>
        <button type="button" className={btn} disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}
