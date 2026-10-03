import { test, expect } from '@playwright/test';
test('run an example, change payment, export, verify and reject changed results', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByText('No report yet.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Run check', exact: true }).click();
  await expect(
    page.getByText('The checked balances do not cover the payment.', {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByLabel('Payment amount', { exact: true }).fill('1000');
  await expect(
    page.getByText('Inputs changed. Run check again before using this result.'),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Save JSON report' }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Run check', exact: true }).click();
  await expect(
    page.getByText('The checked balances cover the payment.', { exact: true }),
  ).toBeVisible();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save JSON report' }).click();
  expect((await pending).suggestedFilename()).toMatch(/^exitcheck-.*\.json$/);
  await page.getByRole('button', { name: 'Verify this report' }).click();
  await page
    .getByRole('button', { name: 'Verify report', exact: true })
    .click();
  await expect(
    page.getByText('Report verified', { exact: true }),
  ).toBeVisible();
  const field = page.getByRole('textbox', { name: 'Report JSON', exact: true });
  const report = JSON.parse(await field.inputValue());
  report.report.result.minimumProceeds = '1';
  await field.fill(JSON.stringify(report));
  await page
    .getByRole('button', { name: 'Verify report', exact: true })
    .click();
  await expect(
    page.getByText('Verification failed', { exact: true }),
  ).toBeVisible();
});
test('mobile flow and liquidity assumptions', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByText('Conversion assumptions', { exact: true }).click();
  await page
    .getByLabel('Pool liquidity remaining (%)', { exact: true })
    .fill('25');
  await page.getByRole('button', { name: 'Run check', exact: true }).click();
  await expect(
    page.getByText('The checked balances do not cover the payment.', {
      exact: true,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Setup', exact: true }).click();
  await expect(
    page.getByText('Use ExitCheck from the terminal', { exact: true }),
  ).toBeVisible();
});
test('live network inputs stay distinct from the example', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Data source').selectOption('live');
  await expect(page.getByLabel('Network', { exact: true })).toHaveValue(
    'testnet',
  );
  await expect(
    page.getByLabel('Payment token ID', { exact: true }),
  ).toHaveValue('0.0.1183558');
  await page.getByLabel('Network', { exact: true }).selectOption('mainnet');
  await expect(
    page.getByLabel('Payment token ID', { exact: true }),
  ).toHaveValue('0.0.456858');
  await page.getByLabel('Data source').selectOption('demo');
  await expect(page.getByLabel('Network', { exact: true })).toHaveCount(0);
  await expect(page.getByText('No report yet.', { exact: true })).toBeVisible();
});
