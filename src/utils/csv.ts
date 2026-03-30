import fs from 'fs';
import path from 'path';

function escapeCsv(value: unknown): string {
  const str = value == null ? '' : String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function writeCsv(filePath: string, rows: Record<string, unknown>[]) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  if (!rows.length) {
    fs.writeFileSync(filePath, '', 'utf-8');
    return;
  }

  const headerSet = new Set<string>();
  for (const row of rows) {
    Object.keys(row).forEach((key) => headerSet.add(key));
  }

  const headers = Array.from(headerSet);
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escapeCsv(row[h])).join(',')),
  ];

  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
}
