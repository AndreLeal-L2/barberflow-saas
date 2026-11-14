import { expect, test } from '@playwright/test';
import { account, fillRegistration, futureDate } from './helpers';

test('registers, configures, publishes, accepts a customer booking, cancels and pauses', async ({
  page,
  browser,
}, testInfo) => {
  const owner = account();
  await page.goto('/register');
  await fillRegistration(page, owner);
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'A sua agenda', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Configurar página', exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'A sua agenda' })).toBeVisible();
  const me = await page.request.get('/api/auth/me');
  expect(me.status()).toBe(200);
  const user = await me.json();

  await page.goto('/dashboard/profile');
  await expect(page.getByRole('button', { name: 'Publicar página', exact: true })).toBeDisabled();
  await expect(page.getByRole('link', { name: 'Gerir serviços', exact: true })).toBeVisible();
  await page.goto('/dashboard/services');
  await page.getByLabel('Nome', { exact: true }).fill('Corte completo E2E');
  await page.getByLabel('Duração', { exact: true }).fill('30');
  await page.getByLabel('Preço', { exact: true }).fill('15');
  await page.getByRole('button', { name: 'Adicionar serviço', exact: true }).click();
  await expect(page.locator('.service-list')).toContainText('Corte completo E2E');

  await page.goto('/dashboard/availability');
  await expect(page.getByRole('button', { name: 'Guardar horário', exact: true })).toBeEnabled();
  const days = page.locator('.schedule-row input[type="checkbox"]');
  await expect(days).toHaveCount(7);
  const toggles = page.locator('.schedule-row .day-toggle');
  for (let index = 0; index < 7; index++) {
    await toggles.nth(index).click();
    await expect(days.nth(index)).toBeChecked();
  }
  await page.getByRole('button', { name: 'Guardar horário', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Horário semanal guardado.');

  await page.goto('/dashboard/profile');
  await page.getByRole('button', { name: 'Personalização', exact: true }).click();
  const imageFixtures = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 360;
    const context = canvas.getContext('2d')!;
    const pixels = context.createImageData(canvas.width, canvas.height);
    let seed = 42;
    for (let index = 0; index < pixels.data.length; index += 4) {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
      const noise = (seed >>> 24) & 15;
      pixels.data[index] = 37 + noise;
      pixels.data[index + 1] = 61 + noise;
      pixels.data[index + 2] = 46 + noise;
      pixels.data[index + 3] = 255;
    }
    context.putImageData(pixels, 0, 0);
    const cover = canvas.toDataURL('image/png').split(',')[1];
    canvas.width = 128;
    canvas.height = 128;
    context.fillStyle = '#344e41';
    context.fillRect(0, 0, 128, 128);
    context.fillStyle = '#e5edcd';
    context.font = 'bold 68px sans-serif';
    context.fillText('ST', 14, 88);
    return { cover, logo: canvas.toDataURL('image/png').split(',')[1] };
  });
  expect(Buffer.from(imageFixtures.cover, 'base64').length).toBeGreaterThan(64_000);
  await page.getByLabel('Escolher imagem de fundo', { exact: true }).setInputFiles({
    name: 'cover.png',
    mimeType: 'image/png',
    buffer: Buffer.from(imageFixtures.cover, 'base64'),
  });
  await expect(page.locator('img[data-image-preview="cover"]')).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Imagem atualizada.');
  await page.getByLabel('Escolher logo', { exact: true }).setInputFiles({
    name: 'logo.png',
    mimeType: 'image/png',
    buffer: Buffer.from(imageFixtures.logo, 'base64'),
  });
  await expect(page.locator('.dashboard-shop-logo')).toBeVisible();
  await expect(page.locator('.dashboard-shop-logo')).toHaveJSProperty('naturalWidth', 128);
  const originalLogo = await page.locator('.dashboard-shop-logo').getAttribute('src');
  await page.getByRole('button', { name: 'Remover logo', exact: true }).click();
  await expect(page.locator('.dashboard-shop-logo')).toHaveCount(0);
  await page.getByLabel('Escolher logo', { exact: true }).setInputFiles({
    name: 'replacement.png',
    mimeType: 'image/png',
    buffer: Buffer.from(imageFixtures.logo, 'base64'),
  });
  await expect(page.locator('.dashboard-shop-logo')).toBeVisible();
  await expect(page.locator('.dashboard-shop-logo')).not.toHaveAttribute('src', originalLogo!);
  await page.reload();
  await expect(page.locator('.dashboard-shop-logo')).toHaveJSProperty('naturalWidth', 128);
  await page.getByRole('button', { name: 'Personalização', exact: true }).click();
  await expect(page.locator('img[data-image-preview="cover"]')).toHaveJSProperty(
    'naturalWidth',
    720,
  );
  const logoPreview = page.locator('img[data-image-preview="logo"]');
  const logoFrame = page.locator('.logo-upload-preview');
  await expect(logoPreview).toHaveJSProperty('naturalWidth', 128);
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(logoPreview).toBeVisible();
    await expect(logoFrame).toBeVisible();
    const imageBounds = await logoPreview.boundingBox();
    const frameBounds = await logoFrame.boundingBox();
    expect(imageBounds).not.toBeNull();
    expect(frameBounds).not.toBeNull();
    expect(imageBounds!.y).toBeGreaterThanOrEqual(frameBounds!.y);
    expect(imageBounds!.y + imageBounds!.height).toBeLessThanOrEqual(
      frameBounds!.y + frameBounds!.height,
    );
    expect(imageBounds!.height).toBeLessThan(frameBounds!.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
  }
  await page.screenshot({ path: testInfo.outputPath('personalization.png'), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 844 });
  await page.getByRole('button', { name: 'Publicação', exact: true }).click();
  await page.getByRole('button', { name: 'Publicar página', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Página publicada.');
  const publicPath = `/b/${user.barbershop.slug}`;

  // A separate anonymous browser context proves that publication is public.
  const customerContext = await browser.newContext({
    locale: 'pt-PT',
    timezoneId: 'Europe/Lisbon',
  });
  try {
    const customer = await customerContext.newPage();
    await customer.setViewportSize({ width: 390, height: 844 });
    await customer.goto(`http://127.0.0.1:4200${publicPath}`);
    await expect(
      customer.getByRole('heading', { name: owner.barbershopName, exact: true }),
    ).toBeVisible();
    await expect(customer.locator('.public-shop-logo')).toHaveJSProperty('naturalWidth', 128);
    await expect(customer.locator('.public-shop-cover')).toHaveJSProperty('naturalWidth', 720);
    await expect(customer.locator('.booking-step:visible')).toHaveCount(1);
    await customer.screenshot({ path: testInfo.outputPath('public-service.png'), fullPage: true });
    await customer.getByRole('button', { name: /Corte completo E2E/ }).click();
    await expect(
      customer.getByRole('heading', { name: 'Escolha o dia e a hora', exact: true }),
    ).toBeVisible();
    expect(
      await customer
        .getByLabel('Outra data')
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
    ).toBeGreaterThanOrEqual(16);
    expect((await customer.getByLabel('Outra data').boundingBox())!.height).toBeGreaterThanOrEqual(
      44,
    );
    await customer.getByLabel('Outra data').fill(futureDate());
    await customer.screenshot({ path: testInfo.outputPath('public-time.png'), fullPage: true });
    await customer.locator('.slot-grid button').first().click();
    await expect(customer.locator('.booking-step:visible')).toHaveCount(1);
    await expect(
      customer.getByRole('heading', { name: 'Os seus dados', exact: true }),
    ).toBeVisible();
    await customer.screenshot({ path: testInfo.outputPath('public-details.png'), fullPage: true });
    for (const input of await customer.locator('.booking-customer-form input').all()) {
      expect(
        await input.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
      ).toBeGreaterThanOrEqual(16);
      expect((await input.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await customer.getByLabel('Nome', { exact: true }).fill('Cliente de teste E2E');
    await customer.getByLabel('Telefone', { exact: true }).fill('+351 930 000 001');
    await customer.getByRole('button', { name: 'Confirmar marcação', exact: true }).click();
    await expect(
      customer.getByRole('heading', { name: /Até breve, Cliente de teste E2E/ }),
    ).toBeVisible();

    await page.goto('/dashboard/bookings');
    await page.getByRole('button', { name: 'Lista', exact: true }).click();
    const booking = page.locator('.booking-row-full').filter({ hasText: 'Cliente de teste E2E' });
    await expect(booking).toContainText('Confirmada');
    await booking.getByRole('button', { name: 'Cancelar marcação', exact: true }).click();
    await expect(booking).toHaveCount(0);
    await page.getByRole('button', { name: 'Histórico', exact: true }).click();
    await expect(booking).toContainText('Cancelada');
    await page.reload();
    await page.getByRole('button', { name: 'Lista', exact: true }).click();
    await page.getByRole('button', { name: 'Histórico', exact: true }).click();
    await expect(booking).toContainText('Cancelada');

    await page.goto('/dashboard/profile');
    await page.getByRole('button', { name: 'Pausar marcações', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Marcações pausadas.');
    await customer.reload();
    await expect(
      customer.getByRole('heading', { name: 'Página indisponível', exact: true }),
    ).toBeVisible();
  } finally {
    await customerContext.close();
  }

  await page.getByRole('button', { name: 'Terminar sessão', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/dashboard/profile');
  await expect(page).toHaveURL(/\/login\?returnUrl=/);
});
