/** Minimal RFC-4180 CSV builder. CRLF rows, UTF-8 BOM (so Excel renders Greek). */

export interface CsvColumn {
  key: string;
  header: string;
}

function cell(value: unknown): string {
  if (value == null) return '';
  let s = String(value);
  // Neutralise spreadsheet formula triggers (=, +, -, @, tab, CR at cell start):
  // exported values come from public forms, so `=HYPERLINK(...)` etc. must not
  // execute when the operator opens the file in Excel/Sheets.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Array<Record<string, unknown>>, columns: CsvColumn[]): string {
  const head = columns.map((c) => cell(c.header)).join(',');
  const body = rows.map((r) => columns.map((c) => cell(r[c.key])).join(',')).join('\r\n');
  return '﻿' + head + '\r\n' + body + (body ? '\r\n' : '');
}

/** Send a CSV download response on a raw ServerResponse. */
import type { ServerResponse } from 'node:http';
export function sendCsv(res: ServerResponse, filename: string, csv: string): void {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.end(csv);
}
