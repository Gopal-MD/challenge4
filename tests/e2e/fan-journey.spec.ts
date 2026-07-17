import { test, expect } from '@playwright/test';

test.describe('Fan PWA Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/fan', { waitUntil: 'networkidle' });
  });

  test('renders fan navigation interface', async ({ page }) => {
    await expect(page.getByText('Hey, Fan 👋')).toBeVisible();
    await expect(page.getByText('Where to next?')).toBeVisible();
  });

  test('user can see start and destination fields', async ({ page }) => {
    await expect(page.locator('input').nth(0)).toHaveValue('Gate B');
    await expect(page.locator('input').nth(1)).toHaveValue('Section 101');
  });

  test('user can enable wheelchair accessibility', async ({ page }) => {
    const wheelchairBtn = page.getByRole('button', { name: 'Wheelchair' });
    await wheelchairBtn.click();
    await expect(wheelchairBtn).toHaveClass(/bg-gradient-brand/);
  });

  test('user can select language', async ({ page }) => {
    const languageSelect = page.locator('select');
    await languageSelect.selectOption('Español');
    await expect(languageSelect).toHaveValue('Español');
  });

  test('user can request a route', async ({ page }) => {
    await page.getByRole('button', { name: /get route/i }).click();
    await expect(page.getByText(/step by step/i)).toBeVisible({ timeout: 15_000 });
  });
});
