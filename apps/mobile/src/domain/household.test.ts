import { describe, expect, it } from 'vitest';
import { addDislike, emptyHousehold, firstProblem, normalizeHousehold, setChains, stepError, toggle, toggleDiet, type Household } from './household';
import { portionFactor, weeklyPortions } from './portions';

const withMembers = (members: Household['members'], patch: Partial<Household> = {}): Household => ({
  ...emptyHousehold(),
  members,
  ...patch,
});

describe('toggle', () => {
  it('adds and removes', () => {
    expect(toggle(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggle(['a', 'b'], 'a')).toEqual(['b']);
  });
});

describe('addDislike', () => {
  it('trims and collapses spaces', () => expect(addDislike([], '  כוסברה   טרייה ')).toEqual(['כוסברה טרייה']));
  it('ignores blanks', () => expect(addDislike(['a'], '   ')).toEqual(['a']));
  it('ignores case-insensitive duplicates', () => expect(addDislike(['Mushrooms'], 'mushrooms')).toEqual(['Mushrooms']));
  it('ignores text over 40 characters', () => expect(addDislike([], 'א'.repeat(41))).toEqual([]));
  it('accepts exactly 40 characters', () => expect(addDislike([], 'א'.repeat(40))).toHaveLength(1));
});

describe('toggleDiet', () => {
  it('vegan also selects vegetarian', () => expect(toggleDiet([], 'vegan')).toEqual(['vegetarian', 'vegan']));
  it('removing vegetarian removes vegan', () => expect(toggleDiet(['vegetarian', 'vegan'], 'vegetarian')).toEqual([]));
  it('removing vegan keeps vegetarian', () => expect(toggleDiet(['vegetarian', 'vegan'], 'vegan')).toEqual(['vegetarian']));
});

describe('setChains', () => {
  it('drops loyalty clubs of deselected chains', () => {
    const h = { ...emptyHousehold(), chains: ['ramiLevy', 'osherAd'], loyaltyClubs: ['ramiLevy', 'osherAd'] } as Household;
    expect(setChains(h, ['osherAd']).loyaltyClubs).toEqual(['osherAd']);
  });
});

describe('stepError', () => {
  it('household needs at least one adult', () => {
    expect(stepError(withMembers([]), 'household')).toBe('errors.needAdult');
    expect(stepError(withMembers([{ id: '1', kind: 'child', age: 5 }]), 'household')).toBe('errors.needAdult');
    expect(stepError(withMembers([{ id: '1', kind: 'adult' }]), 'household')).toBeNull();
  });
  it('week needs a cooking day and at least one meal or lunchbox', () => {
    expect(stepError(withMembers([], { cookingDays: [] }), 'week')).toBe('errors.needCookingDay');
    const none = withMembers([], { mealsAtHome: { weekday: [], weekend: [] }, lunchboxesPerWeekday: 0 });
    expect(stepError(none, 'week')).toBe('errors.needMeal');
    expect(stepError({ ...none, lunchboxesPerWeekday: 1 }, 'week')).toBeNull();
  });
  it('kitchen needs an appliance; shopping needs a mode and a chain', () => {
    expect(stepError(withMembers([], { appliances: [] }), 'kitchen')).toBe('errors.needAppliance');
    expect(stepError(withMembers([]), 'shopping')).toBe('errors.needShoppingMode');
    expect(stepError(withMembers([], { shoppingMode: 'store' }), 'shopping')).toBe('errors.needChain');
    expect(stepError(withMembers([], { shoppingMode: 'store', chains: ['ramiLevy'] }), 'shopping')).toBeNull();
  });
  it('food has no blocking rule', () => expect(stepError(withMembers([]), 'food')).toBeNull());
});

describe('portions', () => {
  it('child factors by age band', () => {
    expect([2, 3, 4, 6, 7, 10, 11, 13, 14, 17].map((age) => portionFactor({ id: 'x', kind: 'child', age }))).toEqual([
      0.4, 0.4, 0.5, 0.5, 0.7, 0.7, 0.85, 0.85, 1, 1,
    ]);
  });

  it('matches the plan example: 2 adults, children 7 and 4, a baby', () => {
    const h = withMembers(
      [
        { id: 'a', kind: 'adult' },
        { id: 'b', kind: 'adult' },
        { id: 'c', kind: 'child', age: 7 },
        { id: 'd', kind: 'child', age: 4 },
        { id: 'e', kind: 'baby', months: 9, stage: 'soft' },
      ],
      { mealsAtHome: { weekday: ['dinner'], weekend: ['lunch', 'dinner'] }, lunchboxesPerWeekday: 1 },
    );
    // 3.2 per meal x (5 weekday dinners + 2 days x 2 weekend meals) = 28.8; lunchboxes 5 x 1.
    expect(weeklyPortions(h)).toEqual({ homeMeals: 28.8, lunchboxes: 5, total: 33.8, babies: 1 });
  });

  it('is zero for an empty household with no lunchboxes', () => {
    expect(weeklyPortions(withMembers([], { lunchboxesPerWeekday: 0 })).total).toBe(0);
  });
});

describe('normalizeHousehold', () => {
  it('returns defaults for garbage', () => {
    expect(normalizeHousehold(null)).toEqual(emptyHousehold());
    expect(normalizeHousehold({ members: null, festive: 3 })).toEqual(emptyHousehold());
  });

  it('keeps valid data unchanged', () => {
    const h = withMembers([{ id: 'a', kind: 'adult' }, { id: 'b', kind: 'baby', months: 7, stage: 'purees' }], {
      allergens: ['sesame'],
      shoppingMode: 'both',
      chains: ['ramiLevy'],
      loyaltyClubs: ['ramiLevy'],
      dislikes: ['כוסברה'],
    });
    expect(normalizeHousehold(JSON.parse(JSON.stringify(h)))).toEqual(h);
  });

  it('fills nested fields missing from an older profile', () => {
    const h = normalizeHousehold({ mealsAtHome: { weekday: ['lunch'] }, festive: { holidays: true } });
    expect(h.mealsAtHome).toEqual({ weekday: ['lunch'], weekend: ['lunch', 'dinner'] });
    expect(h.festive).toEqual({ fridayDinner: true, shabbatLunch: false, holidays: true });
  });

  it('drops unknown ids, invalid members and clubs of unselected chains', () => {
    const h = normalizeHousehold({
      members: [{ kind: 'alien' }, { id: 'c', kind: 'child', age: 40 }, 'x'],
      chains: ['ramiLevy', 'gone'],
      loyaltyClubs: ['shufersal', 'ramiLevy'],
      allergens: ['sesame', 'kryptonite'],
      kashrut: 'strict',
      shoppingMode: 'drone',
    });
    expect(h.members).toEqual([{ id: 'c', kind: 'child', age: 17 }]);
    expect(h.chains).toEqual(['ramiLevy']);
    expect(h.loyaltyClubs).toEqual(['ramiLevy']);
    expect(h.allergens).toEqual(['sesame']);
    expect(h.kashrut).toBe('none');
    expect(h.shoppingMode).toBeNull();
  });

  it('makes member ids unique and caps the household', () => {
    const many = Array.from({ length: 20 }, () => ({ id: 'same', kind: 'adult' }));
    const h = normalizeHousehold({ members: many });
    expect(h.members).toHaveLength(12);
    expect(new Set(h.members.map((m) => m.id)).size).toBe(12);
  });
});

describe('firstProblem', () => {
  it('names the first incomplete step', () => {
    expect(firstProblem(emptyHousehold())).toEqual({ step: 'household', error: 'errors.needAdult' });
    expect(firstProblem(withMembers([{ id: 'a', kind: 'adult' }]))).toEqual({ step: 'shopping', error: 'errors.needShoppingMode' });
    expect(firstProblem(withMembers([{ id: 'a', kind: 'adult' }], { shoppingMode: 'store' }))).toEqual({ step: 'shopping', error: 'errors.needChain' });
    expect(firstProblem(withMembers([{ id: 'a', kind: 'adult' }], { shoppingMode: 'store', chains: ['victory'] }))).toBeNull();
  });
});

describe('shared vocabularies', () => {
  // Recipe filtering (packages/shared) matches profile ids against these lists,
  // so a missing or renamed id would silently skip an allergen.
  it('profile lists match the shared ones exactly', async () => {
    const shared = await import('../../../../packages/shared/src/vocab');
    const own = await import('./household');
    expect(own.ALLERGENS).toEqual(shared.ALLERGENS);
    expect(own.APPLIANCES).toEqual(shared.APPLIANCES);
    expect(own.MEALS).toEqual(shared.MEALS);
    expect(own.DIETS).toEqual(shared.DIETS);
    expect(own.KASHRUT).toEqual(shared.KASHRUT);
    expect(own.SKILLS).toEqual(shared.SKILLS);
  });
});
