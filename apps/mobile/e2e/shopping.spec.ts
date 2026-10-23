import { expect, test, type Page } from '@playwright/test';

// A saved profile written straight to device storage, so these tests start at the plan.
const profile = {
  members: [{ id: 'a', kind: 'adult' }, { id: 'b', kind: 'adult' }],
  cookingDays: ['sun', 'wed'],
  mealsAtHome: { weekday: ['dinner'], weekend: ['lunch', 'dinner'] },
  lunchboxesPerWeekday: 1,
  festive: { fridayDinner: true, shabbatLunch: false, holidays: false },
  kashrut: 'none',
  diets: [],
  allergens: [],
  dislikes: [],
  appliances: ['oven', 'stovetop'],
  skill: 'home',
  shoppingMode: 'store',
  chains: ['ramiLevy'],
  loyaltyClubs: [],
};

async function openList(page: Page) {
  await page.goto('/');
  await page.evaluate((s) => localStorage.setItem('makeat.household.v1', JSON.stringify({ version: 1, saved: s, draft: s })), profile);
  await page.goto('/plan');
  await page.getByRole('button', { name: 'רשימת קניות' }).click();
  await expect(page).toHaveURL(/\/shopping$/);
  await expect(page.getByRole('heading', { name: 'רשימת קניות' })).toBeVisible();
}

const leftCount = async (page: Page) => {
  const text = await page.getByText(/^נשאר/).textContent();
  return text?.includes('אחד') ? 1 : text?.includes('שני') ? 2 : Number(text?.match(/\d+/)?.[0]);
};

test('lists what the week needs, with staples apart and no water', async ({ page }) => {
  await openList(page);
  await expect(page.getByRole('heading', { name: 'לקנות' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'מהמזווה' })).toBeVisible();
  await expect(page.getByText(/^מלח: /)).toBeVisible();
  await expect(page.getByText(/^מים: /)).toHaveCount(0);
  await expect(page.getByText(/^בשביל: /).first()).toBeVisible();
  expect(await leftCount(page)).toBeGreaterThan(5);
  // Pieces are always whole.
  const pieces = await page.getByText(/ יח׳$/).allTextContents();
  expect(pieces.length).toBeGreaterThan(0);
  for (const p of pieces) expect(p, p).toMatch(/: \d+ יח׳$/);
});

test('marking items counts down and survives a reload; marks can be cleared', async ({ page }) => {
  await openList(page);
  const before = await leftCount(page);
  const have = page.getByRole('checkbox', { name: /: יש בבית$/ }).first();
  const bought = page.getByRole('checkbox', { name: /: קניתי$/ }).nth(1);
  await have.click();
  await bought.click();
  await expect(have).toHaveAttribute('aria-checked', 'true');
  expect(await leftCount(page)).toBe(before - 2);

  await page.reload();
  await expect(page.getByRole('checkbox', { name: /: יש בבית$/ }).first()).toHaveAttribute('aria-checked', 'true');
  expect(await leftCount(page)).toBe(before - 2);

  // One mark per item: "bought" replaces "have"; a second tap clears it.
  const firstBought = page.getByRole('checkbox', { name: /: קניתי$/ }).first();
  await firstBought.click();
  await expect(page.getByRole('checkbox', { name: /: יש בבית$/ }).first()).toHaveAttribute('aria-checked', 'false');
  await firstBought.click();
  expect(await leftCount(page)).toBe(before - 1);

  await page.getByRole('button', { name: 'ניקוי הסימונים' }).click();
  expect(await leftCount(page)).toBe(before);
});

test('a new menu starts a clean list', async ({ page }) => {
  await openList(page);
  await page.getByRole('checkbox', { name: /: קניתי$/ }).first().click();
  await expect(page.getByRole('checkbox', { name: /: קניתי$/ }).first()).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: 'חזרה' }).click();
  await page.getByRole('button', { name: 'תפריט חדש' }).click();
  await page.getByRole('button', { name: 'רשימת קניות' }).click();
  await expect(page.getByRole('heading', { name: 'לקנות' })).toBeVisible();
  await expect(page.getByRole('checkbox', { checked: true })).toHaveCount(0);
});

test('without a menu the list says so', async ({ page }) => {
  await page.goto('/shopping');
  await expect(page.getByText('אין עדיין מה לקנות. בנו קודם תפריט.')).toBeVisible();
});

test('the list does not overflow at phone width', async ({ page }) => {
  await openList(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
