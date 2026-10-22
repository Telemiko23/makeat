import { expect, test, type Page } from '@playwright/test';

// Full onboarding flow in Hebrew. Every test starts from a fresh browser
// context, so the on-device profile (localStorage on web) starts empty.

const next = (page: Page) => page.getByRole('button', { name: 'המשך', exact: true }).click();
const box = (page: Page, name: string) => page.getByRole('checkbox', { name, exact: true });
const radio = (page: Page, name: string) => page.getByRole('radio', { name, exact: true });

async function start(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'בואו נתחיל' }).click();
  await expect(page.getByText('מי גר בבית?')).toBeVisible();
}

/** Adult + 5-year-old + 8-month baby, 2 lunchboxes, sesame allergy, Rami Levy and Osher Ad with a Rami Levy club. */
async function fillToSummary(page: Page) {
  await start(page);
  await page.getByRole('button', { name: '+ מבוגר' }).click();
  await page.getByRole('button', { name: '+ ילד' }).click();
  await page.getByRole('button', { name: '+ תינוק' }).click();
  await next(page);

  await expect(page.getByText('השבוע שלכם')).toBeVisible();
  const moreLunchboxes = page.getByRole('button', { name: 'הוספה של קופסאות ביום' });
  await moreLunchboxes.click();
  await moreLunchboxes.click();
  await next(page);

  await expect(page.getByText('מה אוכלים?')).toBeVisible();
  await box(page, 'שומשום').click();
  await page.getByLabel('מה לא אוהבים?').fill('כוסברה');
  await page.getByRole('button', { name: 'הוספה', exact: true }).click();
  await next(page);

  await expect(page.getByText('המטבח שלכם')).toBeVisible();
  await next(page);

  await expect(page.getByText('איפה קונים?')).toBeVisible();
  await radio(page, 'בסניף').click();
  await box(page, 'רמי לוי').click();
  await box(page, 'אושר עד').click();
  await box(page, 'מועדון רמי לוי').click();
  await next(page);
  await expect(page).toHaveURL(/\/onboarding\/summary$/);
}

test('needs an adult before leaving the household step', async ({ page }) => {
  await start(page);
  await next(page);
  await expect(page.getByRole('alert')).toHaveText('הוסיפו לפחות מבוגר אחד.');
  await expect(page).toHaveURL(/\/onboarding\/household$/);

  // A child alone is not enough.
  await page.getByRole('button', { name: '+ ילד' }).click();
  await next(page);
  await expect(page.getByRole('alert')).toBeVisible();

  await page.getByRole('button', { name: '+ מבוגר' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await next(page);
  await expect(page).toHaveURL(/\/onboarding\/week$/);
});

test('shows progress and the privacy note', async ({ page }) => {
  await start(page);
  await expect(page.getByText('שלב 1 מתוך 5')).toBeVisible();
  await expect(page.getByRole('progressbar')).toBeVisible();
  await expect(page.getByText('הפרטים נשמרים רק במכשיר שלכם.')).toBeVisible();
});

test('child age and baby months stay within limits', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: '+ ילד' }).click();
  await expect(page.getByText('5 שנים')).toBeVisible();
  const younger = page.getByRole('button', { name: 'הפחתה של גיל' });
  for (let i = 0; i < 4; i++) await younger.click();
  await expect(page.getByText('שנה', { exact: true })).toBeVisible();
  await expect(younger).toBeDisabled();

  await page.getByRole('button', { name: 'הסרת ילד' }).click();
  await page.getByRole('button', { name: '+ תינוק' }).click();
  await expect(page.getByText('8 חודשים')).toBeVisible();
  await expect(radio(page, 'אוכל רך')).toBeChecked();
  await radio(page, 'מחיות').click();
  await expect(radio(page, 'מחיות')).toBeChecked();
  await expect(radio(page, 'אוכל רך')).not.toBeChecked();
  const older = page.getByRole('button', { name: 'הוספה של גיל' });
  for (let i = 0; i < 4; i++) await older.click();
  await expect(page.getByText('12 חודשים')).toBeVisible();
  await expect(older).toBeDisabled();
});

test('numbers members of the same kind and caps the household at 12', async ({ page }) => {
  await start(page);
  const addAdult = page.getByRole('button', { name: '+ מבוגר' });
  await addAdult.click();
  await expect(page.getByRole('heading', { name: 'מבוגר', exact: true })).toBeVisible();
  await addAdult.click();
  await expect(page.getByRole('heading', { name: 'מבוגר 2' })).toBeVisible();
  for (let i = 0; i < 10; i++) await addAdult.click();
  await expect(page.getByRole('heading', { name: 'מבוגר 12' })).toBeVisible();
  await expect(addAdult).toBeDisabled();
  await expect(page.getByText('הגעתם למספר המקסימלי של בני בית.')).toBeVisible();
});

test('week step needs a cooking day and at least one meal', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: '+ מבוגר' }).click();
  await next(page);
  for (const day of ['ראשון', 'שלישי', 'חמישי']) await box(page, day).click();
  await next(page);
  await expect(page.getByRole('alert')).toHaveText('בחרו לפחות יום בישול אחד.');
  await box(page, 'רביעי').click();
  await expect(page.getByRole('alert')).toHaveCount(0);

  // Defaults: dinner on weekdays, lunch and dinner on the weekend. Clear them all.
  for (const meal of await page.getByRole('checkbox', { name: 'ערב', exact: true }).all()) await meal.click();
  await page.getByRole('checkbox', { name: 'צהריים', exact: true }).nth(1).click();
  await next(page);
  await expect(page.getByRole('alert')).toHaveText('בחרו לפחות ארוחה אחת או קופסת אוכל.');
  // A lunchbox alone counts as food to plan.
  await page.getByRole('button', { name: 'הוספה של קופסאות ביום' }).click();
  await next(page);
  await expect(page).toHaveURL(/\/onboarding\/food$/);
});

test('kashrut is a single choice and vegan implies vegetarian', async ({ page }) => {
  await page.goto('/onboarding/food');
  await expect(radio(page, 'לא שומרים')).toBeChecked();
  await radio(page, 'מהדרין').click();
  await expect(radio(page, 'מהדרין')).toBeChecked();
  await expect(radio(page, 'לא שומרים')).not.toBeChecked();

  await box(page, 'טבעוני').click();
  await expect(box(page, 'צמחוני')).toBeChecked();
  await box(page, 'צמחוני').click();
  await expect(box(page, 'טבעוני')).not.toBeChecked();
});

test('dislikes are trimmed, deduplicated and removable', async ({ page }) => {
  await page.goto('/onboarding/food');
  const input = page.getByLabel('מה לא אוהבים?');
  const add = page.getByRole('button', { name: 'הוספה', exact: true });
  await expect(add).toBeDisabled();
  await input.fill('  חצילים  ');
  await input.press('Enter');
  await expect(input).toHaveValue('');
  await input.fill('חצילים');
  await add.click();
  await expect(page.getByRole('button', { name: 'הסרת חצילים' })).toHaveCount(1);
  await page.getByRole('button', { name: 'הסרת חצילים' }).click();
  await expect(page.getByRole('button', { name: 'הסרת חצילים' })).toHaveCount(0);
});

test('loyalty clubs follow the selected chains', async ({ page }) => {
  await page.goto('/onboarding/shopping');
  await expect(page.getByText('בחרו רשת כדי לסמן מועדון.')).toBeVisible();
  await next(page);
  await expect(page.getByRole('alert')).toHaveText('בחרו איך אתם קונים.');
  await radio(page, 'בהזמנה אונליין').click();
  await expect(page.getByText('נשווה את הסל המלא כולל דמי משלוח.')).toBeVisible();
  await radio(page, 'בסניף').click();
  await expect(page.getByText('נשווה לפי מחירי המדף בסניף, בלי משלוח.')).toBeVisible();
  await expect(radio(page, 'בהזמנה אונליין')).not.toBeChecked();
  await next(page);
  await expect(page.getByRole('alert')).toHaveText('בחרו לפחות רשת אחת.');

  await box(page, 'שופרסל').click();
  await box(page, 'מועדון שופרסל').click();
  await expect(box(page, 'מועדון שופרסל')).toBeChecked();
  // Dropping the chain drops its club too.
  await box(page, 'שופרסל').click();
  await expect(box(page, 'מועדון שופרסל')).toHaveCount(0);
  await box(page, 'שופרסל').click();
  await expect(box(page, 'מועדון שופרסל')).not.toBeChecked();
});

test('back keeps what was entered', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: '+ מבוגר' }).click();
  await page.getByRole('button', { name: '+ ילד' }).click();
  await next(page);
  await box(page, 'שני').click();
  await page.getByRole('button', { name: 'חזרה' }).click();
  await expect(page.getByRole('heading', { name: 'ילד', exact: true })).toBeVisible();
  await next(page);
  await expect(box(page, 'שני')).toBeChecked();
});

test('summary shows the answers and weekly portions', async ({ page }) => {
  await fillToSummary(page);
  // (1 adult + 0.5 child) x (5 weekday dinners + 2 x 2 weekend meals) = 13.5, plus 2 x 5 lunchboxes.
  await expect(page.getByText('בערך 23.5 מנות בשבוע')).toBeVisible();
  await expect(page.getByText('13.5 בבית ועוד 10 בקופסאות')).toBeVisible();
  await expect(page.getByText('ועוד תינוק אחד עם תפריט משלו')).toBeVisible();
  await expect(page.getByText('ילד: 5 שנים')).toBeVisible();
  await expect(page.getByText('תינוק: 8 חודשים, אוכל רך')).toBeVisible();
  await expect(page.getByText('ימי בישול: ראשון, שלישי, חמישי')).toBeVisible();
  await expect(page.getByText('אלרגיות: שומשום')).toBeVisible();
  await expect(page.getByText('לא אוהבים: כוסברה')).toBeVisible();
  await expect(page.getByText('רמי לוי, אושר עד')).toBeVisible();
  await expect(page.getByText('מועדונים: רמי לוי')).toBeVisible();
  await expect(page.getByText('קנייה: בסניף')).toBeVisible();
});

test('editing from the summary returns to the summary', async ({ page }) => {
  await fillToSummary(page);
  await page.getByRole('button', { name: 'עריכה: מה אוכלים?' }).click();
  await expect(page).toHaveURL(/\/onboarding\/food\?from=summary$/);
  await box(page, 'בוטנים').click();
  await page.getByRole('button', { name: 'חזרה לסיכום' }).click();
  await expect(page).toHaveURL(/\/onboarding\/summary$/);
  await expect(page.getByText('אלרגיות: שומשום, בוטנים')).toBeVisible();
});

test('saving shows the profile on the home screen and survives a reload', async ({ page }) => {
  await fillToSummary(page);
  await page.getByRole('button', { name: 'שמירה' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('הבית שלכם')).toBeVisible();
  await expect(page.getByText('3 נפשות')).toBeVisible();
  await expect(page.getByText('בערך 23.5 מנות בשבוע')).toBeVisible();

  await page.reload();
  await expect(page.getByText('3 נפשות')).toBeVisible();
  await page.getByRole('button', { name: 'עריכת הפרופיל' }).click();
  await expect(page).toHaveURL(/\/onboarding\/summary$/);
  await expect(page.getByText('אלרגיות: שומשום')).toBeVisible();
});

test('summary refuses to save an incomplete profile', async ({ page }) => {
  await page.goto('/onboarding/summary');
  await page.getByRole('button', { name: 'שמירה' }).click();
  await expect(page.getByRole('alert')).toHaveText('הוסיפו לפחות מבוגר אחד.');
  await expect(page).toHaveURL(/\/onboarding\/summary$/);
});

test('an unknown step falls back to the first step', async ({ page }) => {
  await page.goto('/onboarding/nope');
  await expect(page).toHaveURL(/\/onboarding\/household$/);
});

test('no step overflows horizontally at phone width', async ({ page }) => {
  for (const step of ['household', 'week', 'food', 'kitchen', 'shopping', 'summary']) {
    await page.goto(`/onboarding/${step}`);
    await expect(page.getByRole('heading').first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, step).toBeLessThanOrEqual(0);
  }
});

test('leaving an edit without saving keeps the saved profile', async ({ page }) => {
  await fillToSummary(page);
  await page.getByRole('button', { name: 'שמירה' }).click();
  await expect(page.getByText('3 נפשות')).toBeVisible();

  await page.getByRole('button', { name: 'עריכת הפרופיל' }).click();
  await page.getByRole('button', { name: 'עריכה: מי גר בבית?' }).click();
  await page.getByRole('button', { name: 'הסרת מבוגר' }).click();
  // Leave without saving: browser back to the summary, then the summary's back link.
  await page.goBack();
  await expect(page).toHaveURL(/\/onboarding\/summary$/);
  await page.getByRole('button', { name: 'חזרה' }).last().click();
  await expect(page.getByText('3 נפשות')).toBeVisible();

  await page.reload();
  await expect(page.getByText('3 נפשות')).toBeVisible();
  // Editing again starts from the saved profile, not the abandoned draft.
  await page.getByRole('button', { name: 'עריכת הפרופיל' }).click();
  await expect(page.getByText('מבוגר', { exact: true })).toBeVisible();
});

test('a fixed problem clears from the summary', async ({ page }) => {
  await page.goto('/onboarding/summary');
  await page.getByRole('button', { name: 'שמירה' }).click();
  await expect(page.getByRole('alert')).toHaveText('הוסיפו לפחות מבוגר אחד.');
  await page.getByRole('button', { name: 'עריכה: מי גר בבית?' }).click();
  await page.getByRole('button', { name: '+ מבוגר' }).click();
  await page.getByRole('button', { name: 'חזרה לסיכום' }).click();
  await expect(page).toHaveURL(/\/onboarding\/summary$/);
  // The next problem (shopping mode) replaces it.
  await expect(page.getByRole('alert')).toHaveText('בחרו איך אתם קונים.');
});

test('a stored profile with unknown values still loads', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() =>
    localStorage.setItem(
      'makeat.household.v1',
      JSON.stringify({
        version: 1,
        saved: { members: [{ id: 'a', kind: 'adult' }, { kind: 'alien' }], shoppingMode: 'store', chains: ['ramiLevy', 'closedChain'], mealsAtHome: { weekday: ['dinner'] } },
      }),
    ),
  );
  await page.reload();
  await expect(page.getByText('נפש אחת')).toBeVisible();
  await page.getByRole('button', { name: 'עריכת הפרופיל' }).click();
  await expect(page.getByText('רמי לוי', { exact: true })).toBeVisible();
});
