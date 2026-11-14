import { expect, test } from '@playwright/test';
import { account, fillRegistration, mutation, registerViaApi } from './helpers';

test('serves the authentication API through the frontend proxy without redirects', async ({
  request,
}) => {
  const csrf = await request.get('/api/auth/csrf', { maxRedirects: 0 });
  expect(csrf.status(), 'The preview must reach the Compasso API, not another local service').toBe(
    200,
  );
  expect(csrf.headers()['content-type']).toContain('application/json');
  expect(await csrf.json()).toEqual({
    headerName: 'X-XSRF-TOKEN',
    parameterName: '_csrf',
    token: expect.any(String),
  });
  expect((await request.get('/api/auth/me', { maxRedirects: 0 })).status()).toBe(401);
});

test('registers in English, restores the session, rejects duplicates and accepts a normalized login', async ({
  page,
  request,
}) => {
  const owner = account();
  await page.goto('/register');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.getByLabel('Your name', { exact: true }).fill(owner.ownerName);
  await page.getByLabel('Business name', { exact: true }).fill(owner.barbershopName);
  await page.getByLabel('Email', { exact: true }).fill(owner.email);
  await page.getByLabel('Phone', { exact: true }).fill(owner.phone);
  await page.getByLabel('Password', { exact: true }).fill(owner.password);
  await page.getByLabel('Confirm password', { exact: true }).fill(owner.password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.reload();
  await expect(page.locator('.sidebar-user')).toContainText(owner.email);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole('button', { name: 'Português (Portugal)', exact: true }).click();
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
