import { test, expect, type ConsoleMessage, type Page } from '@playwright/test';

async function assertHomepageSmoke(page: Page) {
  const pageErrors: Error[] = [];
  const consoleErrors: string[] = [];

  page.on('pageerror', (err) => {
    pageErrors.push(err);
  });

  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (/favicon|net::ERR_ABORTED.*(analytics|hotjar|beacon)/i.test(text)) return;
      consoleErrors.push(text);
    }
  });

  const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
  expect(response, 'main document response').not.toBeNull();
  expect(response!.status(), 'main document HTTP status').toBe(200);

  const main = page.locator('main').first();
  await expect(main).toBeVisible();
  await expect(page.locator('header').first()).toBeVisible();
  await expect(page.locator('footer').first()).toBeVisible();
  await expect(main.getByRole('heading', { level: 1, name: /Global Field Guide/i })).toBeVisible();
  expect(await main.locator('a').count()).toBeGreaterThan(0);

  const visibleText = (await main.innerText()).replace(/\s+/g, ' ');
  expect(visibleText, 'visible main content should not contain object serialization').not.toContain('[object Object]');
  expect(visibleText, 'visible main content should not contain promise serialization').not.toContain('[object Promise]');

  expect(pageErrors, 'uncaught page errors on home page').toEqual([]);
  expect(consoleErrors, 'browser console errors on home page').toEqual([]);
}

test.describe('global-field-guide home page smoke', () => {
  test('home page renders intentional copy and produces no fatal browser errors', async ({ page }) => {
    await assertHomepageSmoke(page);
  });
});
