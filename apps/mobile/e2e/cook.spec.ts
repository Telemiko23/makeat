import { expect, test, type Page } from '@playwright/test';

// The recipe screen stays mounted under cooking mode, so match what is on screen only.
const shown = (page: Page, text: string) => page.getByText(text, { exact: false }).filter({ visible: true });

test('starts cooking from a recipe and walks the steps, keeping the place on reload', async ({ page }) => {
  await page.goto('/recipe/shakshuka?portions=4');
  await page.getByRole('button', { name: 'מתחילים לבשל' }).click();
  await expect(page).toHaveURL(/\/cook\/shakshuka\?portions=4/);
  await expect(page.getByText('שלב 1 מתוך 6')).toBeVisible();
  await expect(shown(page, 'חותכים את הבצל והפלפל')).toBeVisible();
  // The first step has no time, so no timer.
  await expect(page.getByRole('timer')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'לשלב הקודם' })).toHaveCount(0);

  await page.getByRole('button', { name: 'לשלב הבא' }).click();
  await expect(page.getByText('שלב 2 מתוך 6')).toBeVisible();
  await expect(page).toHaveURL(/step=2/);
  await page.reload();
  await expect(page.getByText('שלב 2 מתוך 6')).toBeVisible();

  await page.getByRole('button', { name: 'לשלב הקודם' }).click();
  await expect(page.getByText('שלב 1 מתוך 6')).toBeVisible();
});

test('a step timer counts down, pauses, and says when time is up', async ({ page }) => {
  await page.clock.install();
  await page.goto('/cook/shakshuka?portions=4&step=2');
  await expect(page.getByText('טיימר: 8 דק׳')).toBeVisible();
  const timer = page.getByRole('timer');
  await expect(timer).toHaveText('8:00');

  await page.getByRole('button', { name: 'הפעלת טיימר' }).click();
  await page.clock.runFor(61_000);
  await expect(timer).toHaveText('6:59');
  await page.getByRole('button', { name: 'השהיה' }).click();
  await page.clock.runFor(30_000);
  await expect(timer).toHaveText('6:59');

  await page.getByRole('button', { name: 'המשך' }).click();
  await page.clock.runFor(7 * 60_000);
  await expect(timer).toHaveText('0:00');
  await expect(page.getByText('הזמן נגמר!')).toBeVisible();

  await page.getByRole('button', { name: 'איפוס' }).click();
  await expect(timer).toHaveText('8:00');
  await expect(page.getByText('הזמן נגמר!')).toHaveCount(0);
});

test('a running timer keeps going while reading other steps, and says when it is done', async ({ page }) => {
  await page.clock.install();
  await page.goto('/cook/shakshuka?step=2');
  await page.getByRole('button', { name: 'הפעלת טיימר' }).click();
  await page.clock.runFor(60_000);
  await page.getByRole('button', { name: 'לשלב הבא' }).click();
  // Step 3 has its own fresh timer, and step 2's keeps running above it.
  await expect(page.getByText('טיימר: 1 דק׳')).toBeVisible();
  await expect(page.getByRole('timer')).toHaveText('1:00');
  await expect(page.getByText('טיימר שלב 2: 7:00')).toBeVisible();
  await page.clock.runFor(7 * 60_000);
  await expect(page.getByText('טיימר שלב 2: הזמן נגמר!')).toBeVisible();
  await page.getByRole('button', { name: 'מעבר לשלב 2' }).click();
  await expect(page.getByText('שלב 2 מתוך 6')).toBeVisible();
  await expect(page.getByRole('timer')).toHaveText('0:00');
  await expect(page.getByText('הזמן נגמר!', { exact: true })).toBeVisible();
});

test('pausing and resuming never adds time', async ({ page }) => {
  await page.clock.install();
  await page.goto('/cook/shakshuka?step=2');
  const timer = page.getByRole('timer');
  await expect(timer).toHaveText('8:00');
  // Stop the clock between steps, so only runFor moves time (clicks take real time otherwise).
  await page.clock.pauseAt(Date.now() + 60_000);
  await page.getByRole('button', { name: 'הפעלת טיימר' }).click();
  for (let i = 0; i < 4; i++) {
    await page.clock.runFor(30_200);
    await page.getByRole('button', { name: 'השהיה' }).click();
    await page.getByRole('button', { name: 'המשך' }).click();
  }
  // 4 x 30.2 s + 0.1 s = 120.9 s gone: 359.1 s left, shown rounded up as 6:00.
  // Had each pause rounded up to the second, it would read 6:04.
  await page.clock.runFor(100);
  await expect(timer).toHaveText('6:00');
  await page.clock.runFor(1_000);
  await expect(timer).toHaveText('5:59');
});

test('warns when a recipe opened directly breaks the household allergies', async ({ page }) => {
  const profile = {
    members: [{ id: 'a', kind: 'adult' }], cookingDays: ['sun'], mealsAtHome: { weekday: ['dinner'], weekend: [] },
    lunchboxesPerWeekday: 0, festive: { fridayDinner: false, shabbatLunch: false, holidays: false }, kashrut: 'none',
    diets: [], allergens: ['eggs'], dislikes: [], appliances: ['oven', 'stovetop'], skill: 'home', shoppingMode: 'store',
    chains: ['ramiLevy'], loyaltyClubs: [],
  };
  await page.goto('/');
  await page.evaluate((s) => localStorage.setItem('makeat.household.v1', JSON.stringify({ version: 1, saved: s, draft: s })), profile);
  await page.goto('/cook/shakshuka');
  await expect(shown(page, 'שימו לב: מכיל ביצים, שמופיע באלרגיות שלכם.')).toBeVisible();
  await page.goto('/recipe/shakshuka');
  await expect(shown(page, 'שימו לב: מכיל ביצים, שמופיע באלרגיות שלכם.')).toBeVisible();
  await page.goto('/recipe/red-lentil-soup');
  await expect(page.getByText(/^שימו לב/)).toHaveCount(0);
});

test('shows the scaled ingredients on demand, and the last step finishes', async ({ page }) => {
  await page.goto('/recipe/shakshuka?portions=4');
  await page.getByRole('button', { name: 'מתחילים לבשל' }).click();
  await page.getByRole('button', { name: 'הצגת המרכיבים' }).click();
  await expect(shown(page, 'ביצים: 6 יח׳')).toBeVisible();
  await page.getByRole('button', { name: 'הסתרת המרכיבים' }).click();
  await expect(shown(page, 'ביצים: 6 יח׳')).toHaveCount(0);

  for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'לשלב הבא' }).click();
  await expect(page.getByText('שלב 6 מתוך 6')).toBeVisible();
  await expect(page.getByRole('button', { name: 'לשלב הבא' })).toHaveCount(0);
  await page.getByRole('button', { name: 'סיימתי, בתיאבון!' }).click();
  await expect(page).toHaveURL(/\/recipe\/shakshuka/);
});

test('a bad step number starts at the first step; an unknown recipe says so', async ({ page }) => {
  for (const bad of ['99', '0', '2.0', 'x']) {
    await page.goto(`/cook/shakshuka?step=${bad}`);
    await expect(page.getByText('שלב 1 מתוך 6')).toBeVisible();
    await expect(page).toHaveURL(/step=1$/);
  }
  await page.goto('/cook/nope');
  await expect(page.getByText('המתכון לא נמצא.')).toBeVisible();
});

test('cooking mode does not overflow at phone width', async ({ page }) => {
  await page.goto('/cook/shakshuka?portions=4&step=5');
  await expect(page.getByRole('timer')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
