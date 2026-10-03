import { test, expect } from '@playwright/test';
test('demo coverage and independently verified report', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByText('Your modeled proceeds leave a payout gap'),
  ).toBeVisible();
  await page.getByLabel('Obligation amount').fill('1000');
  await expect(
    page.getByText(
      'Inputs changed. Run exit check to update the displayed report.',
    ),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Run exit check' }).click();
  await expect(
    page.getByText('Covered within the modeled routes'),
  ).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export report' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^exitcheck-.*\.json$/);
  await page.getByRole('button', { name: 'Verify this report' }).click();
  await page.getByRole('button', { name: 'Verify integrity' }).click();
  await expect(
    page.getByText('Report integrity verified', { exact: true }),
  ).toBeVisible();
  const field = page.getByRole('textbox', { name: 'Report envelope' });
  const value = JSON.parse(await field.inputValue());
  value.report.result.minimumProceeds = '1';
  await field.fill(JSON.stringify(value));
  await page.getByRole('button', { name: 'Verify integrity' }).click();
  await expect(
    page.getByText('Verification failed', { exact: true }),
  ).toBeVisible();
});
test('stress scenario and mobile layout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(
    page.getByText('Your modeled proceeds leave a payout gap'),
  ).toBeVisible();
  await page
    .getByRole('slider', { name: 'Remaining liquidity', exact: true })
    .fill('2500');
  await page.getByRole('button', { name: 'Apply scenario' }).click();
  await expect(
    page.getByText(
      'Inputs changed. Run exit check to update the displayed report.',
    ),
  ).not.toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Toggle navigation' }).click();
  await page.getByRole('button', { name: 'Methodology', exact: true }).click();
  await expect(
    page.getByText('Validate direct liquidity', { exact: true }),
  ).toBeVisible();
});
