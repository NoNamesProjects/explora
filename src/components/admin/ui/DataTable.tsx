import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export interface Column<Row> {
  key: string;
  header: ReactNode;
  align?: 'left' | 'right';
  width?: string;
  render?: (row: Row) => ReactNode;
}

export function DataTable<Row>({
  columns, rows, getRowId, onRowClick, loading = false, empty,
}: {
  columns: Column<Row>[];
  rows: Row[];
  getRowId: (row: Row) => string | number;
  onRowClick?: (row: Row) => void;
  loading?: boolean;
  empty?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="overflow-x-auto rounded-card border border-cream-300">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-cream-300 bg-cream-100/60 text-left">
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                style={c.width ? { width: c.width } : undefined}
                className={`px-3 py-2.5 text-eyebrow uppercase tracking-eyebrow text-ink-500 ${c.align === 'right' ? 'text-right' : ''}`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-cream-200">
                  {columns.map((c) => (
                    <td key={c.key} className="px-3 py-3">
                      <div className="h-3.5 w-full max-w-[8rem] animate-pulse rounded bg-cream-300" />
                    </td>
                  ))}
                </tr>
              ))
            : rows.length === 0
              ? (
                <tr>
                  <td colSpan={columns.length} className="px-3 py-10 text-center text-sm text-ink-500">
                    {empty ?? t('admin.common.noData', { defaultValue: 'Nothing here yet.' })}
                  </td>
                </tr>
              )
              : rows.map((row) => (
                  <tr
                    key={getRowId(row)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    // Clickable rows must also open from the keyboard.
                    onKeyDown={
                      onRowClick
                        ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onRowClick(row);
                            }
                          }
                        : undefined
                    }
                    tabIndex={onRowClick ? 0 : undefined}
                    role={onRowClick ? 'button' : undefined}
                    className={`border-b border-cream-200 last:border-0 ${
                      onRowClick
                        ? 'cursor-pointer transition-colors hover:bg-cream-100 focus:outline-none focus-visible:bg-cream-100 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ink'
                        : ''
                    }`}
                  >
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={`px-3 py-2.5 text-ink ${c.align === 'right' ? 'text-right tabular-nums' : ''}`}
                      >
                        {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
        </tbody>
      </table>
    </div>
  );
}
