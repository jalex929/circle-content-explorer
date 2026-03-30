import { test, expect } from '@playwright/test';
import path from 'path';
import { config } from '../src/config';
import { ensureDir, writeJson, writeText } from '../src/utils/file';
import {
  collectKeys,
  isJsonContentType,
  type CapturedJsonResponse,
} from '../src/utils/network';

test('discovery', async ({ page }) => {
  ensureDir(config.discoveryDir);

  const captured: CapturedJsonResponse[] = [];

  page.on('response', async (response) => {
    try {
      const contentType = response.headers()['content-type'] || '';
      if (!isJsonContentType(contentType)) return;

      const body = await response.json().catch(() => null);
      if (body == null) return;

      captured.push({
        url: response.url(),
        status: response.status(),
        contentType,
        body,
      });
    } catch {
      // ignore parse failures
    }
  });

  const candidatePaths = [
    '/',
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

    const bodyText = await page.locator('body').innerText().catch(() => '');
    writeText(
      path.join(config.discoveryDir, `${candidate.replace(/[\/]/g, '_') || 'root'}.txt`),
      bodyText
    );
  }

  writeJson(path.join(config.discoveryDir, 'captured-json.json'), captured);

  const discovered = new Set<string>();
  for (const item of captured) {
    collectKeys(item.body, discovered);
  }

  writeJson(
    path.join(config.discoveryDir, 'discovered-fields.json'),
    Array.from(discovered).sort()
  );

  expect(captured.length).toBeGreaterThan(0);
});
