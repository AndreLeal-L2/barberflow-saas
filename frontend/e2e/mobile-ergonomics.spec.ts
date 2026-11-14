import { expect, test } from '@playwright/test';

for (const width of [320, 390]) {
  test(`keeps account navigation touchable and the login form within a ${width}px mobile viewport`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 740 });
    for (const route of ['/login', '/register', '/forgot-password']) {
      await page.goto(route);
      await expect(page.locator('main')).toBeVisible();
      const header = await page.locator('.auth-header, .action-header').boundingBox();
      expect
        .soft(header!.height, `${route} header should leave space for the form`)
        .toBeLessThanOrEqual(88);
      for (const selector of [
        '.language-switcher button',
        '.auth-header-actions a',
        '.auth-panel input',
        '.action-panel input',
        '.input-action',
      ]) {
        const controls = page.locator(selector);
        for (const control of await controls.all()) {
          if (!(await control.isVisible())) continue;
          const box = await control.boundingBox();
          expect.soft(box!.height, `${route}: ${selector} touch height`).toBeGreaterThanOrEqual(44);
          expect.soft(box!.x, `${route}: ${selector} left edge`).toBeGreaterThanOrEqual(0);
          expect
            .soft(box!.x + box!.width, `${route}: ${selector} right edge`)
            .toBeLessThanOrEqual(width);
        }
      }
      for (const input of await page.locator('input').all()) {
        expect
          .soft(
            await input.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
            `${route}: readable input without iOS focus zoom`,
          )
          .toBeGreaterThanOrEqual(16);
      }
      if (route === '/login') {
        const submit = await page
          .getByRole('button', { name: 'Entrar', exact: true })
          .boundingBox();
        expect
          .soft(submit!.y + submit!.height, 'login should be available before scrolling')
          .toBeLessThanOrEqual(724);
      }
      expect
        .soft(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
        .toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`${route.slice(1)}-${width}.png`),
        fullPage: true,
      });
    }
  });
}
