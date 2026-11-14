import { expect, test } from '@playwright/test';

for (const viewport of [
  { width: 390, height: 844 },
  { width: 700, height: 900 },
  { width: 1440, height: 900 },
]) {
  test(`keeps the next section below the first viewport at ${viewport.width}x${viewport.height}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'O seu negócio, ao seu ritmo.' })).toBeVisible();
    const product = await page.locator('#produto').boundingBox();
    expect(product).not.toBeNull();
    expect(product!.y).toBeGreaterThanOrEqual(viewport.height - 1);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);
    await page.screenshot({
      path: testInfo.outputPath(`home-${viewport.width}.png`),
      fullPage: true,
    });
  });
}
