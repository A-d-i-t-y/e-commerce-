import { expect, test } from '@playwright/test';
import path from 'path';

/**
 * Visual verification of the page builder. Logs in as admin, navigates to
 * `/admin/page-builder` (which redirects into the editor), and captures
 * screenshots of:
 *   - the topbar + left rail + iframe canvas
 *   - the iframe contents (storefront with `?changeset=<token>`)
 *
 * Requires PLAYWRIGHT_ADMIN_EMAIL / PLAYWRIGHT_ADMIN_PASSWORD env vars.
 * Skips otherwise.
 */
const adminEmail = process.env.PLAYWRIGHT_ADMIN_EMAIL;
const adminPassword = process.env.PLAYWRIGHT_ADMIN_PASSWORD;

const OUT = path.join(process.cwd(), 'test-results', 'visual-verify');

test.describe('page builder visual verify', () => {
  test.skip(
    !adminEmail || !adminPassword,
    'Set PLAYWRIGHT_ADMIN_EMAIL + PLAYWRIGHT_ADMIN_PASSWORD'
  );

  test('login then land directly in the editor', async ({ page }) => {
    test.setTimeout(60_000);

    // 1. Login via the form.
    await page.goto('/admin/login');
    await page.fill('input[name="email"]', adminEmail!);
    await page.fill('input[name="password"]', adminPassword!);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.endsWith('/admin/login'), {
      timeout: 15_000
    });

    // 2. Navigate to the page builder. The /admin/page-builder route
    //    should server-redirect to /admin/page-builder/edit/<routeId>
    //    for the first editable route (homepage by default).
    await page.goto('/admin/page-builder');
    // DOM is enough — iframe network may stay busy with images.
    await page.waitForLoadState('domcontentloaded');

    const finalUrl = page.url();
    console.log('Final URL after navigating to /admin/page-builder:', finalUrl);
    expect(finalUrl).toMatch(/\/admin\/page-builder\/edit\//);

    // 3. Capture the editor.
    await page.waitForSelector('iframe[title="Page builder canvas"]', {
      timeout: 10_000
    });
    await page.waitForTimeout(1500); // give iframe a moment to render
    await page.screenshot({
      path: path.join(OUT, '01-editor-landing.png'),
      fullPage: false
    });

    // 4. Capture iframe content separately if it loaded.
    try {
      const frame = page.frameLocator('iframe[title="Page builder canvas"]');
      await frame.locator('body').waitFor({ state: 'visible', timeout: 5_000 });
      const iframeHandle = await page
        .locator('iframe[title="Page builder canvas"]')
        .elementHandle();
      if (iframeHandle) {
        await iframeHandle.screenshot({
          path: path.join(OUT, '02-iframe-canvas.png')
        });
      }
    } catch {
      // best-effort — iframe screenshot isn't critical for visual verify.
    }

    // 5. Check that the topbar elements are visible.
    await expect(
      page.getByRole('button', { name: /^publish/i })
    ).toBeVisible();
    await expect(
      page.locator('iframe[title="Page builder canvas"]')
    ).toBeVisible();
    await expect(page.getByText(/widgets/i).first()).toBeVisible();

    // 6. Open Pages tab to confirm the editable list is curated.
    await page.getByRole('button', { name: /pages/i }).first().click();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(OUT, '03-pages-tab.png'),
      fullPage: false
    });

    // 7. Open Layers tab.
    await page.getByRole('button', { name: /layers/i }).first().click();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(OUT, '04-layers-tab.png'),
      fullPage: false
    });

    // 8. Switch back to Widgets, verify "Columns" is in the palette
    //    (V3 container widget registered in cms/bootstrap.ts).
    await page.getByRole('button', { name: /widgets/i }).first().click();
    await page.waitForTimeout(300);
    const palette = page.locator('aside ul li button');
    const count = await palette.count();
    console.log(`Palette has ${count} widget types`);
    const labels = await palette.allTextContents();
    console.log('Palette widgets:', labels.map((s) => s.trim().slice(0, 40)));

    expect(labels.some((t) => /columns/i.test(t))).toBe(true);

    await page.screenshot({
      path: path.join(OUT, '05-widget-palette.png'),
      fullPage: false
    });
  });
});
