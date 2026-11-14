import { expect, test } from '@playwright/test';

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
]) {
  test(`the selected photograph fills the hero at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');

    const hero = page.locator('.photographic-hero');
    const photo = hero.locator('img[src="/images/compasso-hero-mehdi-pezhvak.webp"]');
    await expect(photo).toBeVisible();
    await expect(photo).toHaveJSProperty('naturalWidth', 1400);

    const heroBox = await hero.boundingBox();
    const photoBox = await photo.boundingBox();
    expect(heroBox).not.toBeNull();
    expect(photoBox).not.toBeNull();
    expect(Math.abs(photoBox!.x - heroBox!.x)).toBeLessThan(2);
    expect(Math.abs(photoBox!.y - heroBox!.y)).toBeLessThan(2);
    expect(Math.abs(photoBox!.width - heroBox!.width)).toBeLessThan(2);
    expect(Math.abs(photoBox!.height - heroBox!.height)).toBeLessThan(2);
    expect(await photo.evaluate((image) => getComputedStyle(image).objectFit)).toBe('cover');
  });
}

test.describe('mobile hero while scrolling', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('keeps the photograph size when scrolling changes only the visible height', async ({ page }) => {
    await page.goto('/');
    const photo = page.locator('.hero-photograph');
    await expect(photo).toHaveJSProperty('naturalWidth', 1400);
    const initial = await photo.boundingBox();
    expect(initial).not.toBeNull();

    await page.evaluate(() => window.scrollTo({ top: 180, behavior: 'instant' }));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

    // Reproduce the mobile address bar changing the viewport height after scrolling.
    for (const height of [744, 844, 924, 844]) {
      await page.setViewportSize({ width: 390, height });
      await expect.poll(async () => (await photo.boundingBox())!.height).toBeCloseTo(initial!.height, 0);
      expect((await photo.boundingBox())!.width).toBeCloseTo(initial!.width, 0);
    }

    // A real width/orientation change must still update the responsive layout.
    await page.setViewportSize({ width: 430, height: 932 });
    await expect.poll(async () => (await photo.boundingBox())!.height).toBeGreaterThan(initial!.height);
    expect((await photo.boundingBox())!.width).toBeCloseTo(430, 0);
  });
});
