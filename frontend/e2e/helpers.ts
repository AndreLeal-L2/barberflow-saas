import { randomUUID } from 'node:crypto';
import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const baseURL = 'http://127.0.0.1:4200';

export function account() {
  const id = randomUUID().slice(0, 8);
  return {
    ownerName: 'Administrador de teste',
    barbershopName: `Barbearia E2E ${id}`,
    email: `e2e-${id}@example.test`,
    phone: '+351 910 000 000',
    password: 'PalavraPasseE2E2026!',
  };
}

export async function mutation(
  request: APIRequestContext,
  path: string,
  method: string,
  data: unknown,
) {
  expect(new URL(baseURL).hostname).toBe('127.0.0.1');
  const csrfResponse = await request.get('/api/auth/csrf');
  expect(csrfResponse.ok()).toBe(true);
  // Spring returns a masked JSON token. The XSRF header must use the raw cookie.
  const state = await request.storageState();
  const token = state.cookies.find((cookie) => cookie.name === 'XSRF-TOKEN')?.value;
  expect(token).toBeTruthy();
  return request.fetch(path, {
    method,
    headers: { 'X-XSRF-TOKEN': decodeURIComponent(token!), Origin: baseURL },
    data,
  });
}

export async function registerViaApi(request: APIRequestContext) {
  const owner = account();
  const response = await mutation(request, '/api/auth/register', 'POST', owner);
  expect(response.status()).toBe(201);
  const user = await response.json();
  return { owner, user };
}

export async function fillRegistration(page: Page, owner: ReturnType<typeof account>) {
  await page.getByLabel('O seu nome', { exact: true }).fill(owner.ownerName);
  await page.getByLabel('Nome da barbearia', { exact: true }).fill(owner.barbershopName);
  await page.getByLabel('E-mail', { exact: true }).fill(owner.email);
  await page.getByLabel('Telefone', { exact: true }).fill(owner.phone);
  await page.getByLabel('Palavra-passe', { exact: true }).fill(owner.password);
  await page.getByLabel('Confirmar palavra-passe', { exact: true }).fill(owner.password);
}

export function futureDate() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Lisbon' }).format(
    new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
  );
}
