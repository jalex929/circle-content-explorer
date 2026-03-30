import dotenv from 'dotenv';

dotenv.config();

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const config = {
  baseUrl: getRequiredEnv('CIRCLE_BASE_URL').replace(/\/$/, ''),
  email: getRequiredEnv('CIRCLE_EMAIL'),
  password: getRequiredEnv('CIRCLE_PASSWORD'),
  headless: process.env.CIRCLE_HEADLESS === 'true' || process.env.CI === 'true',
  authFile: 'playwright/.auth/user.json',
  discoveryDir: 'output/discovery',
  exportDir: 'output/exports',
};
