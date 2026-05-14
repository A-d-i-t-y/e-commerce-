import { expect, test } from '@playwright/test';

/**
 * Phase 0 smoke test.
 *
 * Verifies that:
 *  - The dev server starts (Playwright's webServer block waits for /).
 *  - The admin login page is reachable and responds with 200.
 *
 * Intentionally minimal — does not assert on copy or markup since those
 * change. The point is to confirm Playwright + EverShop dev mode are
 * wired correctly. Real e2e coverage arrives in later phases.
 */
test('admin login page responds 200', async ({ page }) => {
  const response = await page.goto('/admin/login');
  expect(response, 'navigation response should exist').not.toBeNull();
  expect(response!.status(), 'admin login should respond 200').toBe(200);
});
