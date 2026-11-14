import { expect, test } from '@playwright/test';
import { futureDate, mutation, registerViaApi } from './helpers';

test('creates appointments from calendar slots and revisits their details on desktop and mobile', async ({
  page,
}, testInfo) => {
  await registerViaApi(page.request);
  expect(
    (
      await mutation(page.request, '/api/dashboard/services', 'POST', {
        name: 'Sessão de teste',
        description: '',
        durationMinutes: 30,
        priceAmount: 20,
      })
    ).status(),
  ).toBe(201);
  expect(
    (
      await mutation(page.request, '/api/dashboard/availability', 'PUT', {
        days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map(
          (dayOfWeek) => ({ dayOfWeek, startTime: '09:00', endTime: '19:00' }),
        ),
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await mutation(page.request, '/api/dashboard/barbershop/publication', 'PATCH', {
        published: true,
      })
    ).status(),
  ).toBe(200);
  const date = futureDate();
  expect(
    (
      await mutation(page.request, '/api/dashboard/availability/blocks', 'POST', {
        startAt: `${date}T12:00:00`,
        endAt: `${date}T13:00:00`,
        reason: 'Pausa',
      })
    ).status(),
  ).toBe(201);
  for (const width of [1440, 390, 320]) {
    const customerName = `Cliente manual ${width}`;
    await page.setViewportSize({ width, height: 900 });
    const reads: URL[] = [];
    const recordRead = (request: import('@playwright/test').Request) => {
      if (request.method() === 'GET' && request.url().includes('/api/dashboard/')) reads.push(new URL(request.url()));
    };
    page.on('request', recordRead);
    await page.goto('/dashboard');
    await expect(page.getByLabel('Data', { exact: true })).toBeVisible();
    expect(reads.filter((url) => url.pathname === '/api/dashboard/barbershop')).toHaveLength(1);
    const bookingReads = reads.filter((url) => url.pathname === '/api/dashboard/bookings');
    expect(bookingReads).toHaveLength(1);
    expect(bookingReads[0].searchParams.get('from')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(bookingReads[0].searchParams.get('to')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    page.off('request', recordRead);
    await expect.soft(page.getByRole('button', { name: 'Copiar link', exact: true })).toBeVisible();
    if (width <= 390) {
      await expect(page.locator('.calendar-date-switcher')).toBeVisible();
      for (const control of await page
        .locator(
          '.topbar-actions button, .topbar-actions a, .calendar-date-switcher button, .calendar-date-field',
        )
        .all()) {
        const box = await control.boundingBox();
        expect
          .soft(box!.height, 'mobile calendar and header touch height')
          .toBeGreaterThanOrEqual(44);
        expect
          .soft(box!.width, 'mobile calendar and header touch width')
          .toBeGreaterThanOrEqual(44);
        expect
          .soft(box!.x + box!.width, 'mobile controls stay inside the viewport')
          .toBeLessThanOrEqual(width);
      }
      const calendarControls = await page.locator('.booking-calendar-controls').boundingBox();
      expect
        .soft(calendarControls!.height, 'compact mobile date controls')
        .toBeLessThanOrEqual(126);
      expect
        .soft(
          await page
            .getByLabel('Data', { exact: true })
            .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
        )
        .toBeGreaterThanOrEqual(16);
    }
    await page.getByLabel('Data', { exact: true }).fill(date);
    await expect(page.getByRole('button', { name: 'Marcar às 12:00', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Marcar às 10:00', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Nova marcação', exact: true });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: /Sessão de teste/ }).click();
    await expect(dialog.getByRole('heading', { name: 'Os seus dados', exact: true })).toBeVisible();
    await expect(dialog.locator('.booking-summary')).toContainText('10:00');
    await dialog.getByLabel('Nome', { exact: true }).fill(customerName);
    await dialog.getByLabel('Telefone', { exact: true }).fill('+351 930 000 003');
    await dialog.getByRole('button', { name: 'Confirmar marcação', exact: true }).click();
    await expect(
      dialog.getByRole('heading', { name: new RegExp(`Até breve, ${customerName}`) }),
    ).toBeVisible();
    await dialog.getByRole('button', { name: 'Fechar', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Marcar às 10:00', exact: true })).toHaveCount(0);
    const appointment = page.locator('.calendar-event').filter({ hasText: customerName });
    await page.screenshot({ path: testInfo.outputPath(`agenda-${width}.png`), fullPage: true });
    const titleHeight = await appointment
      .locator('strong')
      .evaluate((element) => element.getBoundingClientRect().height);
    expect.soft(titleHeight).toBeGreaterThanOrEqual(14);
    await appointment.click();
    const details = page.getByRole('dialog', { name: 'Detalhes da marcação', exact: true });
    await expect(details).toContainText(customerName);
    await details.getByRole('button', { name: 'Cancelar marcação', exact: true }).click();
    await expect(details.getByText('Cancelada', { exact: true })).toBeVisible();
    await details.getByRole('button', { name: 'Fechar', exact: true }).click();
    await page.reload();
    await page.getByLabel('Data', { exact: true }).fill(date);
    await expect(appointment).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Marcar às 10:00', exact: true })).toBeVisible();
    const stored = await page.request.get('/api/dashboard/bookings');
    expect(
      (await stored.json()).find(
        (booking: { customerName: string; status: string }) =>
          booking.customerName === customerName,
      ).status,
    ).toBe('CANCELLED');
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
    await page.goto('/dashboard/availability');
    await expect(
      page.getByRole('heading', { name: 'Dias de trabalho', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Indisponibilidades pontuais', exact: true }),
    ).toBeHidden();
    await page.getByRole('button', { name: 'Indisponibilidades', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Dias de trabalho', exact: true })).toBeHidden();
    await expect(
      page.getByRole('heading', { name: 'Indisponibilidades pontuais', exact: true }),
    ).toBeVisible();
    await page.goto('/dashboard/profile');
    await page.getByRole('button', { name: 'Informação pública', exact: true }).click();
    await page.getByLabel('Descrição', { exact: false }).fill('Um espaço para si.');
    await page.getByRole('button', { name: 'Publicação', exact: true }).click();
    await page.getByRole('button', { name: 'Informação pública', exact: true }).click();
    await expect(page.getByLabel('Descrição', { exact: false })).toHaveValue('Um espaço para si.');
  }
});
