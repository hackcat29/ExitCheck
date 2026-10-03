import { test, expect } from '@playwright/test';
test('real accounts are the default and networks select their own token', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByLabel('Data source')).toHaveCount(0);
  await expect(page.getByLabel('Network', { exact: true })).toHaveValue(
    'testnet',
  );
  await expect(page.getByLabel('Account ID', { exact: true })).toHaveValue(
    '0.0.8348691',
  );
  await expect(
    page.getByLabel('Payment token ID', { exact: true }),
  ).toHaveValue('0.0.1183558');
  await expect(page.getByText('No report yet.', { exact: true })).toBeVisible();
  await page.getByLabel('Network', { exact: true }).selectOption('mainnet');
  await expect(
    page.getByLabel('Payment token ID', { exact: true }),
  ).toHaveValue('0.0.456858');
});
test('failed public reads show an error and allow retry without a replacement report', async ({
  page,
}) => {
  await page.route('**/api/analyze', async (route) => {
    expect(route.request().postDataJSON().mode).toBe('live');
    await route.fulfill({
      status: 422,
      json: { error: 'Live sources could not be read. Retry later.' },
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Run check', exact: true }).click();
  await expect(
    page.getByText('Live sources could not be read. Retry later.'),
  ).toBeVisible();
  await expect(page.getByText('No report yet.', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Run check', exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole('button', { name: 'Save JSON report' }),
  ).toHaveCount(0);
});
test('mobile setup contains the real account workflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByText('Conversion assumptions', { exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Setup', exact: true }).click();
  await expect(
    page.getByText('Use ExitCheck from the terminal', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('2. Read actual testnet balances and a SaucerSwap pool', {
      exact: true,
    }),
  ).toBeVisible();
});
