import { expect, test } from '@playwright/test';
import { fillRegistration, mutation, registerViaApi } from './helpers';

test('rejects duplicate registration, invalid credentials and accepts a normalized login', async ({
  page,
  request,
}) => {
  const { owner } = await registerViaApi(request);
  await page.goto('/register');
  await fillRegistration(page, owner);
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Já existe uma conta com este e-mail.');
  await expect(page.getByRole('button', { name: 'Criar conta', exact: true })).toBeEnabled();

  await page.goto('/login');
  await page.getByLabel('E-mail', { exact: true }).fill(owner.email);
  await page.getByLabel('Palavra-passe', { exact: true }).fill('CredenciaisErradas!');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('E-mail', { exact: true }).fill(`  ${owner.email}  `);
  await page.getByLabel('Palavra-passe', { exact: true }).fill(owner.password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test('requires a session and CSRF and refuses publication before setup', async ({ request }) => {
  expect((await request.get('/api/dashboard/barbershop')).status()).toBe(401);
  expect(
    (
      await request.post('/api/auth/login', {
        data: { email: 'nobody@example.test', password: 'UnusedPassword!' },
      })
    ).status(),
  ).toBe(403);
  const { user } = await registerViaApi(request);
  const response = await mutation(request, '/api/dashboard/barbershop/publication', 'PATCH', {
    published: true,
  });
  expect(response.status()).toBe(409);
  expect((await response.json()).code).toBe('BARBERSHOP_NOT_READY');
  expect((await request.get(`/api/public/barbershops/${user.barbershop.slug}`)).status()).toBe(404);
});
