import { expect, test } from '@playwright/test';
import { account, fillRegistration, futureDate } from './helpers';

test('registers, configures, publishes, accepts a customer booking, cancels and pauses', async ({
  page,
  browser,
}) => {
  const owner = account();
  await page.goto('/register');
  await fillRegistration(page, owner);
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('Conta criada', { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Hoje na barbearia' })).toBeVisible();
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
    await customer.goto(`http://127.0.0.1:4200${publicPath}`);
    await expect(
      customer.getByRole('heading', { name: owner.barbershopName, exact: true }),
    ).toBeVisible();
    await customer.getByRole('button', { name: /Corte completo E2E/ }).click();
    await customer.getByLabel('Outra data').fill(futureDate());
    await customer.locator('.slot-grid button').first().click();
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
