import { expect, test } from '@playwright/test';

/**
 * Page builder e2e coverage.
 *
 * Two test groups:
 *   1. Auth-gate edge cases that work without admin credentials.
 *   2. Authenticated happy path — gated on PLAYWRIGHT_ADMIN_EMAIL +
 *      PLAYWRIGHT_ADMIN_PASSWORD env vars; skipped when missing.
 */

const adminEmail = process.env.PLAYWRIGHT_ADMIN_EMAIL;
const adminPassword = process.env.PLAYWRIGHT_ADMIN_PASSWORD;

test.describe('page builder auth gate', () => {
  test('home redirects unauthenticated user to login', async ({ page }) => {
    const response = await page.goto('/admin/page-builder');
    expect(response, 'navigation response should exist').not.toBeNull();
    // Either an explicit 302/303 to /admin/login, or the auth middleware
    // returns 200 with the login page rendered. Both are acceptable.
    await expect(page).toHaveURL(/\/admin\/login(?:\?|$)/);
  });

  test('rollouts list redirects unauthenticated user to login', async ({
    page
  }) => {
    await page.goto('/admin/page-builder/rollouts');
    await expect(page).toHaveURL(/\/admin\/login(?:\?|$)/);
  });
});

test.describe('page builder happy path', () => {
  test.skip(
    !adminEmail || !adminPassword,
    'Set PLAYWRIGHT_ADMIN_EMAIL + PLAYWRIGHT_ADMIN_PASSWORD to run.'
  );

  test('add widget then publish', async ({ page }) => {
    // 1. Login.
    await page.goto('/admin/login');
    await page.fill('input[name="email"]', adminEmail!);
    await page.fill('input[name="password"]', adminPassword!);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.endsWith('/admin/login'), {
      timeout: 15_000
    });

    // 2. Open the page builder home.
    await page.goto('/admin/page-builder');
    await expect(page.getByRole('heading', { name: 'Page builder' })).toBeVisible();

    // 3. Pick the first editable route.
    const firstRoute = page.locator('a[href*="/admin/page-builder/edit/"]').first();
    await expect(firstRoute).toBeVisible();
    await firstRoute.click();

    // 4. Editor renders with topbar + palette + iframe.
    await expect(page.getByRole('button', { name: /^publish/i })).toBeVisible();
    await expect(page.locator('iframe[title="Page builder canvas"]')).toBeVisible();

    // 5. Add a widget from the palette. Use the first one — content should be
    //    something universal like "Text block" since `cms` always registers it.
    const paletteButton = page.locator('aside button').first();
    await expect(paletteButton).toBeVisible();
    await paletteButton.click();

    // 6. Iframe should re-load (we only assert the canvas didn't break by
    //    waiting briefly for any fetch settling).
    await page.waitForTimeout(800);

    // 7. Publish.
    await page.getByRole('button', { name: /^publish/i }).click();

    // 8. Back at the picker.
    await page.waitForURL(/\/admin\/page-builder(?:\?|$)/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Page builder' })).toBeVisible();
  });
});
