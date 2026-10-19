import { expect, test } from '@playwright/test';

// The form as `npm test` builds it: PUBLIC_SIGNUP_URL unset, so not wired.
test.describe('subscribe form (signup not configured)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/subscribe/');
  });

  test('has a labelled, required email field', async ({ page }) => {
    const email = page.getByRole('textbox', { name: 'Email address' });
    await expect(email).toHaveAttribute('type', 'email');
    await expect(email).toHaveAttribute('required', '');
    await expect(email).toHaveAttribute('autocomplete', 'email');
  });

  test('rejects a malformed address in the browser', async ({ page }) => {
    const email = page.getByRole('textbox', { name: 'Email address' });
    await email.fill('not-an-email');
    expect(await email.evaluate((input: HTMLInputElement) => input.validity.typeMismatch)).toBe(true);
  });

  test('keeps the honeypot away from people and assistive tech', async ({ page }) => {
    const honeypot = page.locator('#subscribe-website');
    await expect(honeypot).toHaveAttribute('tabindex', '-1');
    await expect(page.locator('.honeypot')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.getByRole('textbox', { name: 'Leave this field empty' })).toHaveCount(0);
  });

  test('submit stays disabled and says signup opens soon', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Subscribe' })).toBeDisabled();
    await expect(page.getByText('Signup opens soon.')).toBeVisible();
  });
});

// The PLAN.md signup flows (happy path, invalid, duplicate, confirm, unsubscribe)
// need the local newsletter stack: tests/signup/flows.spec.ts, `npm run test:signup`.
