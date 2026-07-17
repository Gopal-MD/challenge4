import { test, expect } from '@playwright/test';

test.describe('Ops Dashboard Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/ops', { waitUntil: 'networkidle' });
  });

  test('renders operations dashboard', async ({ page }) => {
    await expect(page.getByText('FIFA 26')).toBeVisible();
    await expect(page.getByText('Live MatchDay Overview')).toBeVisible();
  });

  test('staff can view crowd density', async ({ page }) => {
    await page.getByRole('button', { name: 'Crowd Density' }).click();
    await expect(page.getByText('Density over time')).toBeVisible();
  });

  test('staff can view incidents board', async ({ page }) => {
    await page.getByRole('button', { name: 'Incidents' }).click();
    await expect(page.getByText('New')).toBeVisible();
    await expect(page.getByText('Resolved', { exact: true })).toBeVisible();
  });

  test('staff can open broadcast tab', async ({ page }) => {
    await page.getByRole('button', { name: 'Broadcast' }).click();
    await expect(page.getByText('Broadcast Center')).toBeVisible();
  });

  test('AI Brief button is available', async ({ page }) => {
    await expect(page.getByRole('button', { name: /ai brief/i })).toBeVisible();
  });
});
