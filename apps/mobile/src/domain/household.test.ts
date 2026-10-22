import { describe, expect, it } from 'vitest';
import { addDislike, emptyHousehold, setChains, stepError, toggle, toggleDiet, type Household } from './household';
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
  it('kitchen needs an appliance; shopping needs a chain', () => {
    expect(stepError(withMembers([], { appliances: [] }), 'kitchen')).toBe('errors.needAppliance');
    expect(stepError(withMembers([]), 'shopping')).toBe('errors.needChain');
    expect(stepError(withMembers([], { chains: ['ramiLevy'] }), 'shopping')).toBeNull();
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
