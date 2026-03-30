import { test, expect, Page, Locator } from '@playwright/test';
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

async function dumpDebug(page: Page, name: string) {
  ensureDir('output/debug');

  await page.screenshot({
    path: `output/debug/${name}.png`,
    fullPage: true,
  }).catch(() => null);

  const html = await page.content().catch(() => '');
  fs.writeFileSync(`output/debug/${name}.html`, html, 'utf-8');

  const text = await page.locator('body').innerText().catch(() => '');
  fs.writeFileSync(`output/debug/${name}.txt`, text, 'utf-8');
}

test('login and save session', async ({ page, context }) => {
  ensureDir(path.dirname(config.authFile));

  await page.goto(config.baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => null);
  await page.waitForTimeout(2000);

  // Step 1: click "Sign in with an email"
  const signInWithEmailButton = await firstVisible([
    page.getByRole('button', { name: /sign in with an email/i }),
    page.getByRole('link', { name: /sign in with an email/i }),
    page.getByText(/sign in with an email/i),
  ]);

  if (!signInWithEmailButton) {
    await dumpDebug(page, 'auth-sign-in-with-email-not-found');
    throw new Error(`Could not find "Sign in with an email" button. Current URL: ${page.url()}`);
  }

  await signInWithEmailButton.click();
  await page.waitForLoadState('networkidle').catch(() => null);
  await page.waitForTimeout(2000);

  // Step 2: fill email
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

  // Step 3: continue after email
  const continueAfterEmail = await firstVisible([
    page.getByRole('button', { name: /continue|next|sign in|log in/i }),
    page.getByRole('link', { name: /continue|next|sign in|log in/i }),
  ]);

  if (continueAfterEmail) {
    await continueAfterEmail.click().catch(() => null);
    await page.waitForLoadState('networkidle').catch(() => null);
    await page.waitForTimeout(2000);
  }

  // Step 4: fill password
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

  // Step 5: submit password
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

  // Step 6: check for successful login
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
