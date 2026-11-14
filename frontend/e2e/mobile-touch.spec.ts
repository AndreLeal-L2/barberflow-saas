import { expect, test } from '@playwright/test';

test.use({ hasTouch: true, isMobile: true });
for (const width of [320, 390]) {
  test(`keeps public mobile header controls inside a ${width}px touch viewport`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 740 });
    await page.goto('/');
    const header = await page.locator('.public-header').boundingBox();
    for (const control of await page
      .locator('.public-header button, .public-header .button, .public-nav a')
      .all()) {
      const box = await control.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      expect(box!.y + box!.height).toBeLessThanOrEqual(header!.y + header!.height);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    await page.screenshot({ path: testInfo.outputPath(`touch-home-${width}.png`), fullPage: true });
  });
}
