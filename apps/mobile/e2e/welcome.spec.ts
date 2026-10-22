import { expect, test } from '@playwright/test';

test.describe('Welcome screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows the brand, tagline and all three steps in Hebrew', async ({ page }) => {
    await expect(page.getByText('Makeat', { exact: true })).toBeVisible();
    await expect(page.getByText('מתכננים, משווים, חוסכים.')).toBeVisible();
    for (const step of [
      'תפריט מתכונים שמתאים בדיוק לבית שלכם',
      'השוואת הסל המלא בין הרשתות, כולל משלוח',
      'בישול צעד אחרי צעד, בלי לזרוק אוכל',
    ]) {
      await expect(page.getByText(step)).toBeVisible();
    }
    await expect(page.getByText('החודש הראשון עלינו')).toBeVisible();
  });

  test('lays out right-to-left', async ({ page }) => {
    const brand = page.getByText('Makeat', { exact: true });
    const tagline = page.getByText('מתכננים, משווים, חוסכים.');
    expect(await tagline.evaluate((el) => getComputedStyle(el).direction)).toBe('rtl');

    // Text is right-aligned: its right edge sits near the viewport's right edge.
    const viewport = page.viewportSize()!;
    const box = (await brand.boundingBox())!;
    expect(viewport.width - (box.x + box.width)).toBeLessThan(40);

    // Step badges sit on the right of their row in RTL.
    const badge = (await page.getByText('1', { exact: true }).boundingBox())!;
    const stepText = (await page.getByText('תפריט מתכונים שמתאים בדיוק לבית שלכם').boundingBox())!;
    expect(badge.x).toBeGreaterThan(stepText.x);
  });

  test('has no horizontal overflow at phone width', async ({ page }) => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('start button is an accessible button and opens onboarding', async ({ page }) => {
    const start = page.getByRole('button', { name: 'בואו נתחיל' });
    await expect(start).toBeVisible();
    await start.click();
    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(page.getByText('השאלון בדרך')).toBeVisible();
  });

  test('back from onboarding returns to welcome', async ({ page }) => {
    await page.getByRole('button', { name: 'בואו נתחיל' }).click();
    await page.getByRole('button', { name: 'חזרה' }).click();
    await expect(page.getByText('מתכננים, משווים, חוסכים.')).toBeVisible();
  });

  test('renders without runtime errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.reload();
    await expect(page.getByText('Makeat', { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test('deep link to onboarding works on a fresh load', async ({ page }) => {
  await page.goto('/onboarding');
  await expect(page.getByText('השאלון בדרך')).toBeVisible();
});

test('dark mode uses a dark background', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone-dark', 'dark project only');
  await page.goto('/');
  await expect(page.getByText('Makeat', { exact: true })).toBeVisible();
  // Background behind empty space near the bottom of the screen.
  const bg = await page.evaluate(() => {
    let el: Element | null = document.elementFromPoint(10, window.innerHeight - 10);
    while (el) {
      const c = getComputedStyle(el).backgroundColor;
      if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c;
      el = el.parentElement;
    }
    return 'rgb(255, 255, 255)';
  });
  const [r, g, b] = bg.match(/\d+/g)!.map(Number);
  expect((r + g + b) / 3).toBeLessThan(60);
});
