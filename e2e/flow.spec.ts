import { expect, test, type Page } from '@playwright/test';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import pg from 'pg';
import 'dotenv/config';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local' });

// End-to-end acceptance flow. Requires: dev/prod server running, database
// migrated + seeded, EMAIL_PROVIDER=console (dev outbox) for the email link.

const stamp = Date.now();
const author = { email: `author-${stamp}@example.test`, password: 'correct horse battery 42' };
const admin = { email: `admin-${stamp}@example.test`, password: 'correct horse battery 43' };
const REVIEW_TEXT = `E2E test review ${stamp}. The appointment started roughly on time and the staff explained the document checklist clearly. The waiting room was busy around midday.`;

async function latestLink(to: string, pathPart: string): Promise<string> {
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const r = await db.query('SELECT body FROM private.email_outbox WHERE to_address = $1 ORDER BY id DESC LIMIT 1', [to]);
  await db.end();
  const link = (r.rows[0]?.body as string | undefined)?.match(/https?:\/\/\S+/)?.[0];
  if (!link || !link.includes(pathPart)) throw new Error('verification email not found');
  return new URL(link).pathname + new URL(link).search;
}

// Test runs create several accounts from one IP; reset the (working) rate limiter first.
test.beforeAll(async () => {
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  await db.query('DELETE FROM private.rate_limits');
  await db.end();
});

async function signUp(page: Page, user: { email: string; password: string }) {
  await page.goto('/en/auth/sign-up');
  await page.getByLabel('Email address').fill(user.email);
  await page.getByLabel(/^Password/).fill(user.password);
  await page.getByLabel('Confirm password').fill(user.password);
  await page.getByLabel(/I agree to the Terms/).check();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/en\/account/);
  await page.goto(await latestLink(user.email, 'verify-email'));
  await expect(page.getByText('Your email address is confirmed.').first()).toBeVisible();
}

test('language routing, search and directory', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Know Before You Go.');

  // switching language keeps the current page
  await page.goto('/en/offices/busan-immigration-office');
  await page.getByRole('link', { name: 'Español' }).first().click();
  await expect(page).toHaveURL(/\/es\/oficinas\/busan-immigration-office/);
  await page.getByRole('link', { name: '한국어' }).first().click();
  await expect(page).toHaveURL(/\/ko\/offices\/busan-immigration-office/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko');

  // Korean query in the hero combobox
  await page.goto('/ko');
  const box = page.getByRole('combobox');
  await box.fill('부산');
  await expect(page.getByRole('option').first()).toContainText('출입국');
  await box.press('ArrowDown');
  await box.press('Enter');
  await expect(page).toHaveURL(/\/ko\/offices\/(busan|gimhae)/);

  // directory filter
  await page.goto('/en/offices?region=jeju');
  await expect(page.getByRole('heading', { name: 'Jeju Immigration Office' })).toBeVisible();
});

test('full review lifecycle: submit → verify → moderate → publish → report → appeal', async ({ page, browser }) => {
  await signUp(page, author);

  // --- write a review (7 steps)
  await page.goto('/en/write-review?office=daegu-immigration-office');
  await expect(page.getByRole('radio', { name: /Daegu Immigration Office/ })).toBeChecked();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByText('Residence extension', { exact: true }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Approximate month of visit').selectOption({ index: 2 });
  await page.getByRole('radiogroup').first();
  await page.locator('label', { hasText: /^Yes$/ }).first().click();
  await page.locator('fieldset').nth(1).locator('label', { hasText: /^Yes$/ }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  for (const group of await page.getByRole('radiogroup').all()) await group.locator('label').nth(3).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Short title').fill('E2E: clear explanations');
  await page.getByLabel('Your experience').fill(REVIEW_TEXT);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByText('Yes, I will verify my visit after submitting').click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel(/I confirm this describes my own experience/).check();
  await page.getByRole('button', { name: 'Submit review' }).click();
  await expect(page.getByText('Thank you — your review was submitted')).toBeVisible();

  // --- private verification upload (image is re-encoded + encrypted server-side)
  await page.getByRole('link', { name: 'Verify my visit now' }).click();
  const img = path.join(os.tmpdir(), `irk-e2e-${stamp}.png`);
  fs.writeFileSync(img, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'));
  await page.getByLabel('Evidence image').setInputFiles(img);
  await page.getByRole('button', { name: 'Submit for verification' }).click();
  await expect(page.getByText(/Submitted\. A verification reviewer/)).toBeVisible();

  // not public yet
  await page.goto('/en/offices/daegu-immigration-office');
  await expect(page.getByText(REVIEW_TEXT)).toHaveCount(0);

  // --- admin approves
  const adminCtx = await browser.newContext();
  const ap = await adminCtx.newPage();
  await signUp(ap, admin);
  execSync(`npx tsx scripts/grant-admin.ts ${admin.email} super_admin`, { stdio: 'ignore' });

  await ap.goto('/admin/verifications');
  await ap.getByRole('link', { name: 'View' }).last().click();
  await ap.getByText(/View evidence/).click();
  const evidence = ap.getByRole('img', { name: 'Evidence' });
  await expect(evidence).toBeVisible();
  await ap.getByRole('button', { name: 'Mark as verified' }).click();
  await expect(ap.getByRole('heading', { name: 'Decision' }).locator('..')).toContainText('Verified');

  await ap.goto('/admin/reviews');
  await expect(ap.locator('tr', { hasText: 'Daegu Immigration Office' }).first()).toBeVisible();
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const reviewId = (await db.query(
    'SELECT r.id FROM public.reviews r JOIN private.users u ON u.id = r.user_id WHERE u.email = $1', [author.email])).rows[0].id;
  await db.end();
  await ap.goto(`/admin/reviews/${reviewId}`);
  // the long numeric stamp is (correctly) flagged as a possible reference number and highlighted
  await expect(ap.locator('mark', { hasText: String(stamp) })).toBeVisible();
  await expect(ap.getByText(/explained the document checklist clearly/)).toBeVisible();
  await ap.getByRole('button', { name: 'Submit' }).click(); // default decision: approve
  await expect(ap.getByText('Review is now approved.')).toBeVisible();

  // --- public + verified
  await page.goto('/en/offices/daegu-immigration-office');
  const card = page.locator('article', { hasText: REVIEW_TEXT });
  await expect(card).toBeVisible();
  await expect(card.getByText('Verified visit')).toBeVisible();

  // --- anyone can report; report does not remove the review
  const anon = await browser.newContext();
  const an = await anon.newPage();
  await an.goto('/en/offices/daegu-immigration-office');
  const anonCard = an.locator('article', { hasText: REVIEW_TEXT });
  await anonCard.getByRole('button', { name: 'Report' }).click();
  const dialog = an.getByRole('dialog', { name: 'Report this review' });
  await dialog.getByLabel(/^Reason/).selectOption('misleading');
  await dialog.getByRole('button', { name: 'Send report' }).click();
  await expect(an.getByText(/Report received/)).toBeVisible();
  await an.reload();
  await expect(an.locator('article', { hasText: REVIEW_TEXT })).toBeVisible();

  // --- admin hides it; author appeals
  await ap.reload();
  await ap.getByLabel('Decision').selectOption('hide');
  await ap.locator('textarea[name="reason"]').fill('E2E: temporary hide');
  await ap.getByRole('button', { name: 'Submit' }).click();
  await expect(ap.getByText('Review is now hidden.')).toBeVisible();

  await page.goto('/en/account');
  await expect(page.getByText('Temporarily hidden')).toBeVisible();
  await page.getByRole('link', { name: 'Appeal decision' }).click();
  await page.getByLabel('Why should the decision be reconsidered?').fill(`This review only describes my own visit and contains no personal data. (${stamp})`);
  await page.getByRole('button', { name: 'Submit appeal' }).click();
  await expect(page.getByText('Appeal received.')).toBeVisible();

  await ap.goto('/admin/reports?tab=appeals');
  await expect(ap.getByText(`contains no personal data. (${stamp})`)).toBeVisible();

  await adminCtx.close();
  await anon.close();
});

test('admin area is not reachable by regular users', async ({ page }) => {
  const res = await page.goto('/admin');
  await expect(page).toHaveURL(/auth\/sign-in/);
  expect(res?.status()).toBeLessThan(500);
  const evidence = await page.request.get('/api/admin/evidence/00000000-0000-0000-0000-000000000000');
  expect(evidence.status()).toBe(404);
});
