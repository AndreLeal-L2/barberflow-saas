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

test('keeps language and theme preferences across public pages and reloads', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tema escuro', exact: true }).click();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  const html = page.locator('html');
  await expect(html).toHaveAttribute('lang', 'en-GB');
  await expect(html).toHaveAttribute('data-theme', 'dark');

  await page.goto('/pricing');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('free beta');
  await page.getByRole('link', { name: 'Privacy', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Privacy policy', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Terms', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Terms of use', exact: true })).toBeVisible();
  await page.reload();
  await expect(html).toHaveAttribute('lang', 'en-GB');
  await expect(html).toHaveAttribute('data-theme', 'dark');
});
