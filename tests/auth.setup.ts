import { test, Page, Locator } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { config } from '../src/config';

function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}

async function firstVisible(locators: Locator[]): Promise<Locator | null> {
  for (const locator of locators) {
    const count = await locator.count().catch(() => 0);
    if (!count) continue;

    const first = locator.first();
    const visible = await first.isVisible().catch(() => false);
    if (visible) return first;
  }
  return null;
}

async function getVisibleTexts(locator: Locator, limit = 50): Promise<string[]> {
  const results: string[] = [];
  const count = await locator.count().catch(() => 0);

  for (let i = 0; i < Math.min(count, limit); i++) {
    const item = locator.nth(i);
    const visible = await item.isVisible().catch(() => false);
    if (!visible) continue;

    const text = (await item.innerText().catch(() => '')).trim();
    if (text) results.push(text.replace(/\s+/g, ' '));
  }

  return results;
}

async function getVisibleInputDetails(page: Page, limit = 50): Promise<string[]> {
  const inputs = page.locator('input');
  const results: string[] = [];
  const count = await inputs.count().catch(() => 0);

  for (let i = 0; i < Math.min(count, limit); i++) {
    const input = inputs.nth(i);
    const visible = await input.isVisible().catch(() => false);
    if (!visible) continue;

    const type = (await input.getAttribute('type').catch(() => '')) || '';
    const name = (await input.getAttribute('name').catch(() => '')) || '';
    const placeholder = (await input.getAttribute('placeholder').catch(() => '')) || '';
    const autocomplete = (await input.getAttribute('autocomplete').catch(() => '')) || '';

    results.push(
      `type="${type}" name="${name}" placeholder="${placeholder}" autocomplete="${autocomplete}"`
    );
  }

  return results;
}

async function dumpDebug(page: Page, name: string) {
  ensureDir('output/debug');

  await page.screenshot({
    path: `output/debug/${name}.png`,
    fullPage: true,
  }).catch(() => null);

  const html = await page.content().catch(() => '');
  fs.writeFileSync(`output/debug/${name}.html`, html, 'utf-8');

  const bodyText = await page.locator('body').innerText().catch(() => '');
  fs.writeFileSync(`output/debug/${name}.txt`, bodyText, 'utf-8');

  const visibleButtons = await getVisibleTexts(page.getByRole('button'));
  const visibleLinks = await getVisibleTexts(page.getByRole('link'));
  const visibleInputs = await getVisibleInputDetails(page);

  const report = [
    `URL: ${page.url()}`,
    '',
    '=== VISIBLE BUTTONS ===',
    ...(visibleButtons.length ? visibleButtons : ['(none found)']),
    '',
    '=== VISIBLE LINKS ===',
    ...(visibleLinks.length ? visibleLinks : ['(none found)']),
    '',
    '=== VISIBLE INPUTS ===',
    ...(visibleInputs.length ? visibleInputs : ['(none found)']),
    '',
    '=== PAGE TEXT PREVIEW ===',
    bodyText.slice(0, 5000) || '(no body text found)',
  ].join('\n');

  fs.writeFileSync(`output/debug/${name}-report.txt`, report, 'utf-8');
  console.log(report);
}

test('login and save session', async ({ page, context }) => {
  ensureDir(path.dirname(config.authFile));

  await page.goto(config.baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => null);
  await page.waitForTimeout(3000);

  const signInWithEmailButton = await firstVisible([
    page.getByRole('button', { name: /sign in with an email/i }),
    page.getByRole('link', { name: /sign in with an email/i }),
    page.getByText(/sign in with an email/i),
  ]);

  if (!signInWithEmailButton) {
    await dumpDebug(page, 'auth-sign-in-with-email-not-found');
    throw new Error(
      `Could not find "Sign in with an email" button. Current URL: ${page.url()}`
    );
  }

  await signInWithEmailButton.click();
  await page.waitForLoadState('networkidle').catch(() => null);
  await page.waitForTimeout(2000);

  const emailInput = await firstVisible([
    page.locator('input[type="email"]'),
    page.locator('input[name="email"]'),
    page.locator('input[autocomplete="email"]'),
    page.getByLabel(/email/i),
    page.getByPlaceholder(/email/i),
    page.getByRole('textbox', { name: /email/i }),
  ]);

  if (!emailInput) {
    await dumpDebug(page, 'auth-email-not-found');
    throw new Error(`Could not find email input. Current URL: ${page.url()}`);
  }

  await emailInput.fill(config.email);

  const continueAfterEmail = await firstVisible([
    page.getByRole('button', { name: /continue|next|sign in|log in/i }),
    page.getByRole('link', { name: /continue|next|sign in|log in/i }),
  ]);

  if (continueAfterEmail) {
    await continueAfterEmail.click().catch(() => null);
    await page.waitForLoadState('networkidle').catch(() => null);
    await page.waitForTimeout(2000);
  }

  const passwordInput = await firstVisible([
    page.locator('input[type="password"]'),
    page.locator('input[name="password"]'),
    page.locator('input[autocomplete="current-password"]'),
    page.getByLabel(/password/i),
    page.getByPlaceholder(/password/i),
  ]);

  if (!passwordInput) {
    await dumpDebug(page, 'auth-password-not-found');
    throw new Error(`Could not find password input. Current URL: ${page.url()}`);
  }

  await passwordInput.fill(config.password);

  const submitButton = await firstVisible([
    page.getByRole('button', { name: /sign in|log in|continue|submit/i }),
    page.getByRole('link', { name: /sign in|log in|continue|submit/i }),
  ]);

  if (!submitButton) {
    await dumpDebug(page, 'auth-submit-not-found');
    throw new Error(`Could not find submit button on password step. Current URL: ${page.url()}`);
  }

  await submitButton.click().catch(() => null);
  await page.waitForLoadState('networkidle').catch(() => null);
  await page.waitForTimeout(5000);

  const loggedInSignal = await firstVisible([
    page.getByText(/home/i),
    page.getByText(/courses/i),
    page.getByText(/events/i),
    page.getByText(/members/i),
    page.getByText(/open resource library/i),
    page.getByText(/microlesson library/i),
  ]);

  if (!loggedInSignal) {
    await dumpDebug(page, 'auth-login-failed');
    throw new Error(`Login did not appear to complete. Current URL: ${page.url()}`);
  }

  await context.storageState({ path: config.authFile });
});
