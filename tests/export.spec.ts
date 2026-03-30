import path from 'path';
import { test, expect } from '@playwright/test';
import { config } from '../src/config';
import { ensureDir, writeJson } from '../src/utils/file';
import { writeCsv } from '../src/utils/csv';
import { findObjectArrays, isJsonContentType } from '../src/utils/network';
import { normalizeRecord, type ExportRecord } from '../src/utils/normalize';

test('export', async ({ page }) => {
  ensureDir(config.exportDir);

  const records: ExportRecord[] = [];
  const seen = new Set<string>();

  page.on('response', async (response) => {
    try {
      const contentType = response.headers()['content-type'] || '';
      if (!isJsonContentType(contentType)) return;

      const body = await response.json().catch(() => null);
      if (body == null) return;

      const arrays = findObjectArrays(body);

      for (const arr of arrays) {
        for (const item of arr) {
          const normalized = normalizeRecord(item, response.url());

          const stableId =
            normalized.id ||
            normalized.url ||
            normalized.slug ||
            `${normalized.title}-${normalized.created_at}`;

          if (!stableId || seen.has(stableId)) continue;

          seen.add(stableId);
          records.push(normalized);
        }
      }
    } catch {
      // ignore parse failures
    }
  });

  const candidatePaths = [
    '/admin',
    '/admin/spaces',
    '/admin/posts',
    '/admin/content',
    '/admin/courses',
  ];

  for (const candidate of candidatePaths) {
    const url = `${config.baseUrl}${candidate}`;
    await page.goto(url, { waitUntil: 'networkidle' }).catch(() => null);
    await page.waitForTimeout(2500);

    for (let i = 0; i < 4; i++) {
      await page.mouse.wheel(0, 2500);
      await page.waitForTimeout(1000);
    }
  }

  writeJson(path.join(config.exportDir, 'resources.json'), records);
  writeCsv(path.join(config.exportDir, 'resources.csv'), records);

  expect(records.length).toBeGreaterThan(0);
});
