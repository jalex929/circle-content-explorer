import { Page, Locator, expect } from '@playwright/test';

export type TargetSection = {
  key: string;
  label: string;
};

export const TARGET_SECTIONS: TargetSection[] = [
  { key: 'open-resource-library', label: 'Open Resource Library' },
  { key: 'microlesson-library', label: 'Microlesson Library' },
  { key: 'family-caregiver-kickstart-course', label: 'Family Caregiver Kickstart Course' },
  { key: 'behavior-translation-course', label: 'Behavior Translation Course' },
];

async function clickBestMatch(page: Page, label: string): Promise<boolean> {
  const candidates: Locator[] = [
    page.getByRole('link', { name: label, exact: true }),
    page.getByRole('button', { name: label, exact: true }),
    page.getByText(label, { exact: true }),
    page.locator(`text="${label}"`),
  ];

  for (const locator of candidates) {
    const count = await locator.count().catch(() => 0);
    if (!count) continue;

    const first = locator.first();
    const visible = await first.isVisible().catch(() => false);
    if (!visible) continue;

    await first.scrollIntoViewIfNeeded().catch(() => null);
    await first.click().catch(() => null);
    return true;
  }

  return false;
}

export async function openSection(page: Page, label: string) {
  const clicked = await clickBestMatch(page, label);

  if (!clicked) {
    throw new Error(`Could not find navigation item: ${label}`);
  }

  await page.waitForLoadState('networkidle').catch(() => null);
  await page.waitForTimeout(2500);

  await expect(page.locator('body')).toContainText(label, { timeout: 15000 });
}

export async function scrollPageToLoadContent(page: Page, passes = 6) {
  for (let i = 0; i < passes; i++) {
    await page.mouse.wheel(0, 2500);
    await page.waitForTimeout(1200);
  }
}
