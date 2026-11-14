import { expect, test } from '@playwright/test';

for (const width of [320, 390, 700, 1280, 1440, 1920]) {
  test(`keeps the public signup action and real agenda preview usable at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const action = page.locator('.hero-actions').getByRole('link', { name: 'Começar grátis' });
    await expect(action).toBeVisible();
    const bounds = await action.boundingBox();
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(900);
    await action.focus();
    const focus = await action.evaluate((element) => {
      const style = getComputedStyle(element);
      return { width: parseFloat(style.outlineWidth), style: style.outlineStyle };
    });
    expect(focus.width).toBeGreaterThanOrEqual(2);
    expect(focus.style).toBe('solid');
    const preview = page.locator('.agenda-demo img');
    await preview.scrollIntoViewIfNeeded();
    await expect
      .poll(() => preview.evaluate((image: HTMLImageElement) => image.naturalWidth))
      .toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
    await action.click();
    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByLabel('O seu nome', { exact: true })).toBeVisible();
    expect(
      await page
        .getByLabel('E-mail', { exact: true })
        .evaluate((element) => getComputedStyle(element).fontSize),
    ).toBe('16px');
  });
}

for (const width of [390, 1440]) {
  test(`keeps the opening hero focused on the message and signup without a demo at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const hero = page.locator('.photographic-hero');
    await expect(hero.getByRole('heading', { name: 'O seu negócio, ao seu ritmo.' })).toBeVisible();
    await expect(hero.locator('.hero-product, picture, figcaption')).toHaveCount(0);
    await expect(hero.locator('img[src*="agenda"]')).toHaveCount(0);
    await expect(hero.getByRole('link', { name: 'Começar grátis', exact: true })).toBeVisible();
    await expect(
      hero.getByRole('link', { name: 'Conhecer o produto', exact: true }),
    ).toHaveAttribute('href', '#produto');
    await expect(page.locator('#produto .agenda-demo img')).toBeAttached();
    await page.screenshot({ path: testInfo.outputPath(`hero-clean-${width}.png`) });
  });
}

test('preserves public navigation, language selection and dark mode across pages', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Your business, at your own pace.',
  );
  await page.getByRole('button', { name: 'Dark theme', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('link', { name: 'Pricing', exact: true }).click();
  await expect(page).toHaveURL(/\/pricing$/);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('.beta-plan-price')).toContainText('0 €');
  await page.screenshot({ path: testInfo.outputPath('pricing-mobile-dark.png'), fullPage: true });
  await page.locator('.beta-plan-summary').getByRole('link').click();
  await expect(page).toHaveURL(/\/register$/);
  await page.screenshot({ path: testInfo.outputPath('register-mobile-dark.png'), fullPage: true });
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-GB');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test.describe('public header with touch targets', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('contains its language and theme controls above the hero on touch screens', async ({
    page,
  }) => {
    await page.goto('/');
    const header = await page.locator('.public-header').boundingBox();
    expect(header).not.toBeNull();
    for (const control of await page.locator('.appearance-controls button').all()) {
      const bounds = await control.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.height).toBeGreaterThanOrEqual(44);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(header!.y + header!.height);
    }
    const hero = await page.locator('.photographic-hero').boundingBox();
    expect(hero!.y).toBeGreaterThanOrEqual(header!.y + header!.height);
  });
});

test('keeps keyboard focus at accessible contrast on coral and dark brand surfaces', async ({
  page,
}) => {
  await page.goto('/');
  for (const selector of ['.landing-closing .button', '.landing-footer nav a']) {
    const control = page.locator(selector).first();
    await control.focus();
    const contrast = await control.evaluate((element) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const context = canvas.getContext('2d')!;
      const luminance = (color: string) => {
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
        const rgb = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3).map((value) => {
          const channel = value / 255;
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
      };
      let background = element.parentElement!;
      while (getComputedStyle(background).backgroundColor === 'rgba(0, 0, 0, 0)') {
        background = background.parentElement!;
      }
      const ring = luminance(getComputedStyle(element).outlineColor);
      const surface = luminance(getComputedStyle(background).backgroundColor);
      return (Math.max(ring, surface) + 0.05) / (Math.min(ring, surface) + 0.05);
    });
    expect(contrast, selector).toBeGreaterThanOrEqual(3);
  }
});
