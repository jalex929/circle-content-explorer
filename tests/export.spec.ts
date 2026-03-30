import path from 'path';
import { test, expect } from '@playwright/test';
import { config } from '../src/config';
import { ensureDir, writeJson } from '../src/utils/file';
import { writeCsv } from '../src/utils/csv';
import {
  findObjectArrays,
  isJsonContentType,
  looksLikeUsefulContentRecord,
} from '../src/utils/network';
import { normalizeRecord, type ExportRecord } from '../src/utils/normalize';
import { TARGET_SECTIONS, openSection, scrollPageToLoadContent } from '../src/utils/navigation';

test('export', async ({ page }) => {
  ensureDir(config.exportDir);

  const records: ExportRecord[] = [];
  const seen = new Set<string>();
  let currentSection = 'initial';

  page.on('response', async (response) => {
    try {
      const contentType = response.headers()['content-type'] || '';
      if (!isJsonContentType(contentType)) return;

      const body = await response.json().catch(() => null);
      if (body == null) return;

      const arrays = findObjectArrays(body);

      for (const arr of arrays) {
        for (const item of arr) {
          if (!looksLikeUsefulContentRecord(item)) continue;

          const normalized = normalizeRecord(item, response.url(), currentSection);

          const stableId =
            normalized.id ||
            normalized.url ||
            normalized.slug ||
            `${normalized.section}-${normalized.title}-${normalized.created_at}`;

          if (!stableId || seen.has(stableId)) continue;

          seen.add(stableId);
          records.push(normalized);
        }
      }
    } catch {
      // ignore parse failures
    }
  });

  await page.goto(config.baseUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  for (const section of TARGET_SECTIONS) {
    currentSection = section.key;

    await openSection(page, section.label);
    await scrollPageToLoadContent(page, 8);
  }

  writeJson(path.join(config.exportDir, 'resources.json'), records);
  writeCsv(path.join(config.exportDir, 'resources.csv'), records);

  const bySection = TARGET_SECTIONS.map((section) => ({
    section: section.key,
    count: records.filter((r) => r.section === section.key).length,
  }));

  writeJson(path.join(config.exportDir, 'counts-by-section.json'), bySection);

  expect(records.length).toBeGreaterThan(0);
});
