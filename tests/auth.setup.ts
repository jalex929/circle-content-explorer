import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { config } from '../src/config';

test('login and save session', async ({ page, context }) => {
  fs.mkdirSync(path.dirname(config.authFile), { recursive: true });

  await page.goto(config.baseUrl, { waitUntil: 'domcontentloaded' });

  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  await expect(emailInput).toBeVisible({ timeout: 20000 });
  await emailInput.fill(config.email);

  const emailStepButton = page
    .getByRole('button', { name: /continue|next|sign in|log in|email/i })
    .first();

  if (await emailStepButton.isVisible().catch(() => false)) {
    await emailStepButton.click();
  }

  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
  await expect(passwordInput).toBeVisible({ timeout: 20000 });
  await passwordInput.fill(config.password);

  const passwordStepButton = page
    .getByRole('button', { name: /sign in|log in|continue|submit/i })
    .last();

  await passwordStepButton.click();

  await page.waitForLoadState('networkidle').catch(() => null);
  await page.waitForTimeout(3000);

  await expect(page.locator('body')).toBeVisible();

  await context.storageState({ path: config.authFile });
});
