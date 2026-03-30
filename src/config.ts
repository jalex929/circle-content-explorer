import dotenv from 'dotenv';

dotenv.config();

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

const email = process.env.CIRCLE_EMAIL || process.env.SCRAPER_EMAIL;
const password = process.env.CIRCLE_PASSWORD || process.env.SCRAPER_PASSWORD;

if (!email) {
  throw new Error('Missing required env var: CIRCLE_EMAIL or SCRAPER_EMAIL');
}

if (!password) {
  throw new Error('Missing required env var: CIRCLE_PASSWORD or SCRAPER_PASSWORD');
}

export const config = {
  baseUrl: getRequiredEnv('CIRCLE_BASE_URL').replace(/\/$/, ''),
  email,
  password,
  headless: process.env.CIRCLE_HEADLESS === 'true' || process.env.CI === 'true',
  authFile: 'playwright/.auth/user.json',
  discoveryDir: 'output/discovery',
  exportDir: 'output/exports',
};
