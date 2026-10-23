import { expect, test, type Page, type Request, type Route } from '@playwright/test';
import products from '../../../content/products.json';
import { PRICES_URL } from '../src/config';

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

// Every mapped barcode at one price, so a branch that has them all prices every mapped item.
const codes = Object.values(products.products).flatMap((options) => options.map((o) => o.code));
const priced = (price: number, skip: string[] = []) => Object.fromEntries(codes.filter((c) => !skip.includes(c)).map((c) => [c, price]));
const onions = products.products.onion.map((o) => o.code);

const file = {
  version: 1,
  generatedAt: '2026-10-23T11:59:31',
  stores: [
    // Cheaper but without onions, so it comes after the complete branch.
    { chain: 'RAMI_LEVY', storeId: '2', name: 'סניף זול', city: null, publishedAt: '2026-10-23T10:00:04', prices: priced(1, onions) },
    { chain: 'RAMI_LEVY', storeId: '1', name: 'סניף מלא', city: null, publishedAt: '2026-10-23T11:00:05', prices: priced(10) },
    { chain: 'OSHER_AD', storeId: '3', name: 'לא ברשתות שלכם', city: null, publishedAt: '2026-10-23T11:05:02', prices: priced(2) },
  ],
};

const serve = (route: Route) => route.fulfill({ json: file, headers: { 'access-control-allow-origin': '*' } });

async function openWith(page: Page, changes: Partial<typeof profile>) {
  await page.goto('/');
  const s = { ...profile, ...changes };
  await page.evaluate((x) => localStorage.setItem('makeat.household.v1', JSON.stringify({ version: 1, saved: x, draft: x })), s);
  // Waits for the price download (mocked or failed) so a test sees its outcome.
  const ours = (r: Request) => r.url() === PRICES_URL;
  const fetched = Promise.race([page.waitForEvent('requestfinished', ours), page.waitForEvent('requestfailed', ours)]).catch(() => undefined);
  await page.goto('/shopping');
  await fetched;
  await expect(page.getByRole('heading', { name: 'כמה יעלה הסל' })).toBeVisible();
}

const openList = (page: Page) => openWith(page, {});

const stores = (page: Page) => page.getByText(/^רמי לוי, |^אושר עד, /).allTextContents();
const coverage = async (page: Page) => {
  const text = await page.getByText(/^יש מחיר ל-/).first().textContent();
  const [, priced, total] = text!.match(/(\d+) מתוך (\d+)/)!.map(Number);
  return { priced, total };
};

test('prices the list at the household chain branches, complete first, with the data time', async ({ page }) => {
  await page.route(PRICES_URL, serve);
  await openList(page);
  expect(await stores(page)).toEqual(['רמי לוי, סניף מלא', 'רמי לוי, סניף זול']);
  await expect(page.getByText(/^בלי מחיר: .*בצל/)).toBeVisible();
  await expect(page.getByText('מחירים מ-23.10 בשעה 11:00')).toBeVisible();
  await expect(page.getByText('מחירים מ-23.10 בשעה 10:00')).toBeVisible();
  await expect(page.getByText(/בלי מבצעים/)).toBeVisible();
  const total = await page.getByText(/^[\d.]+ ₪$/).first().textContent();
  expect(Number(total!.replace(' ₪', ''))).toBeGreaterThan(0);
  await page.screenshot({ path: 'test-results/prices.png', fullPage: true });
});

test('items marked as at home leave the basket', async ({ page }) => {
  await page.route(PRICES_URL, serve);
  await openList(page);
  const before = await coverage(page);
  await page.getByRole('checkbox', { name: /: יש בבית$/ }).first().click();
  await expect.poll(async () => (await coverage(page)).total).toBe(before.total - 1);
});

test('without a connection it says so, and retry loads the prices', async ({ page }) => {
  let online = false;
  await page.route(PRICES_URL, (route) => (online ? serve(route) : route.abort()));
  await openList(page);
  await expect(page.getByText(/^לא הצלחנו לטעון מחירים/)).toBeVisible();
  online = true;
  await page.getByRole('button', { name: 'לנסות שוב' }).click();
  await expect(page.getByText('רמי לוי, סניף מלא')).toBeVisible();
  await expect(page.getByRole('button', { name: 'לנסות שוב' })).toHaveCount(0);
});

test('offline, the last saved prices are still shown', async ({ page }) => {
  await page.route(PRICES_URL, serve);
  await openList(page);
  await expect(page.getByText('רמי לוי, סניף מלא')).toBeVisible();
  await page.unroute(PRICES_URL);
  await page.route(PRICES_URL, (route) => route.abort());
  await page.reload();
  await expect(page.getByText('רמי לוי, סניף מלא')).toBeVisible();
  await expect(page.getByText(/^לא הצלחנו לעדכן/)).toBeVisible();
});

test('chains without price data are named', async ({ page }) => {
  await page.route(PRICES_URL, serve);
  await openWith(page, { chains: ['shufersal'] });
  await expect(page.getByText(/^עדיין אין לנו מחירים מהרשתות שבחרתם. כרגע יש: רמי לוי, אושר עד\.$/)).toBeVisible();
});

test('online-only shoppers get no shelf totals, since their quote needs the delivery fee', async ({ page }) => {
  await page.route(PRICES_URL, serve);
  await openWith(page, { shoppingMode: 'online' });
  await expect(page.getByText(/^השוואת מחירים להזמנה אונליין/)).toBeVisible();
  await expect(page.getByText(/ ₪$/)).toHaveCount(0);
});
