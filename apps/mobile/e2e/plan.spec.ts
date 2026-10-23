import { expect, test, type Page } from '@playwright/test';
import { CATALOG, RECIPES } from '../../../packages/shared/src/content';
import { recipeAllergens } from '../../../packages/shared/src/recipes/derive';

// A saved profile written straight to device storage, so these tests start at the plan.
const profile = {
  members: [{ id: 'a', kind: 'adult' }, { id: 'b', kind: 'adult' }, { id: 'c', kind: 'child', age: 5 }],
  cookingDays: ['sun', 'tue', 'thu'],
  mealsAtHome: { weekday: ['dinner'], weekend: ['lunch', 'dinner'] },
  lunchboxesPerWeekday: 2,
  festive: { fridayDinner: true, shabbatLunch: false, holidays: false },
  kashrut: 'none',
  diets: [],
  allergens: [] as string[],
  dislikes: [],
  appliances: ['oven', 'stovetop'],
  skill: 'home',
  shoppingMode: 'store',
  chains: ['ramiLevy'],
  loyaltyClubs: [],
};

async function withProfile(page: Page, patch: Partial<typeof profile> = {}) {
  const saved = { ...profile, ...patch };
  await page.goto('/');
  await page.evaluate((s) => localStorage.setItem('makeat.household.v1', JSON.stringify({ version: 1, saved: s, draft: s })), saved);
  await page.reload();
  await page.getByRole('button', { name: 'התפריט שלי' }).click();
  await expect(page).toHaveURL(/\/plan$/);
  await expect(page.getByRole('button', { name: /^החלפת / }).first()).toBeVisible();
}

const swaps = (page: Page) => page.getByRole('button', { name: /^החלפת / });
/** Recipe titles in the plan, in order (each is a link-style button). */
const titles = (page: Page) =>
  page.getByRole('button').evaluateAll((els) =>
    els
      .map((e) => (e.getAttribute('aria-label') ?? e.textContent ?? '').trim())
      .filter((n) => n && !/^(החלפ|חזרה|תפריט חדש|עריכת)/.test(n)),
  );

test('builds a week from the profile: one card per meal and lunchbox', async ({ page }) => {
  await withProfile(page);
  await expect(page.getByRole('heading', { name: 'התפריט שלי' })).toBeVisible();
  await expect(page.getByText('גרסת ניסיון: המתכונים עוד לא עברו בדיקה תזונתית.')).toBeVisible();
  // 5 weekday dinners + 5 lunchboxes + 2 Friday + 2 Saturday meals.
  await expect(swaps(page)).toHaveCount(14);
  for (const day of ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']) {
    await expect(page.getByRole('heading', { name: day, exact: true })).toBeVisible();
  }
  await expect(page.getByText('חגיגי', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('מבשלים ביום ראשון').first()).toBeVisible();
  await expect(page.getByText('אין מתכון שמתאים')).toHaveCount(0);
});

test('swapping changes only that meal, and the plan survives a reload', async ({ page }) => {
  await withProfile(page);
  const before = await titles(page);
  await page.getByRole('button', { name: 'החלפת ערב ביום ראשון' }).click();
  await expect.poll(async () => (await titles(page))[0]).not.toBe(before[0]);
  const after = await titles(page);
  expect(after.slice(1)).toEqual(before.slice(1));

  await page.reload();
  await expect(swaps(page)).toHaveCount(14);
  expect(await titles(page)).toEqual(after);
});

test('a new plan replaces the week', async ({ page }) => {
  await withProfile(page);
  const before = await titles(page);
  await page.getByRole('button', { name: 'תפריט חדש' }).click();
  await expect.poll(async () => (await titles(page)).join()).not.toBe(before.join());
});

test('never plans a dish with a household allergen', async ({ page }) => {
  await withProfile(page, { allergens: ['eggs', 'gluten'] });
  const banned = RECIPES.filter((r) => recipeAllergens(r, CATALOG).some((a) => a === 'eggs' || a === 'gluten')).map((r) => r.title.he);
  expect(banned.length).toBeGreaterThan(5);
  const planned = await titles(page);
  expect(planned.length).toBeGreaterThan(0);
  expect(planned.filter((t) => banned.includes(t))).toEqual([]);
});

test('opens a recipe scaled to the planned portions', async ({ page }) => {
  await withProfile(page);
  const [first] = await titles(page);
  await page.getByRole('button', { name: first, exact: true }).first().click();
  await expect(page).toHaveURL(/\/recipe\/[a-z-]+\?portions=2\.5$/);
  await expect(page.getByRole('heading', { name: first })).toBeVisible();
  await expect(page.getByText('הכמויות ל-2.5 מנות')).toBeVisible();
  await expect(page.getByText('שלב 1', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'חזרה' }).click();
  await expect(page).toHaveURL(/\/plan$/);
});

test('a recipe shows its allergens and scales its quantities', async ({ page }) => {
  await page.goto('/recipe/shakshuka?portions=4');
  await expect(page.getByRole('heading', { name: 'שקשוקה' })).toBeVisible();
  await expect(page.getByText('מכיל: ביצים')).toBeVisible();
  await expect(page.getByText('בדקו תמיד גם את תווית המוצר.')).toBeVisible();
  await expect(page.getByText('ביצים: 6 יח׳')).toBeVisible();
  await expect(page.getByText('פרווה', { exact: false })).toBeVisible();
  await expect(page.getByText('פטרוזיליה (לא חובה): 10 גרם')).toBeVisible();

  await page.goto('/recipe/shakshuka?portions=2');
  await expect(page.getByText('ביצים: 3 יח׳')).toBeVisible();
});

test('an unknown recipe says so', async ({ page }) => {
  await page.goto('/recipe/nope');
  await expect(page.getByText('המתכון לא נמצא.')).toBeVisible();
});

test('without a profile the plan asks for the questionnaire', async ({ page }) => {
  await page.goto('/plan');
  await expect(page.getByText('כדי לבנות תפריט, מלאו קודם את השאלון.')).toBeVisible();
});

test('plan and recipe screens do not overflow at phone width', async ({ page }) => {
  await withProfile(page);
  for (const path of ['/plan', '/recipe/vegetable-couscous?portions=2.5']) {
    await page.goto(path);
    await expect(page.getByRole('heading').first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

test('profile edits the planner does not use keep the week; the plan stores no profile copy', async ({ page }) => {
  await withProfile(page);
  await page.getByRole('button', { name: 'החלפת ערב ביום ראשון' }).click();
  const before = await titles(page);
  const changed = { ...profile, chains: ['osherAd'] };
  await page.evaluate((s) => localStorage.setItem('makeat.household.v1', JSON.stringify({ version: 1, saved: s, draft: s })), changed);
  await page.reload();
  await expect(swaps(page)).toHaveCount(14);
  expect(await titles(page)).toEqual(before);
  const record = await page.evaluate(() => localStorage.getItem('makeat.plan.v1') ?? '');
  expect(record).not.toContain('child');
  expect(record).not.toContain('allergens');
});
