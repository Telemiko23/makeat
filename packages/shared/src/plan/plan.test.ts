import { describe, expect, it } from 'vitest';
import { CATALOG, RECIPES } from '../content';
import { exclusions, type RecipeConstraints } from '../recipes/filter';
import { buildWeekPlan, candidatesFor, cookDayFor, rng, scaleFor, swapSlot, weekSlots, type PlanInput } from './plan';

const constraints: RecipeConstraints = {
  allergens: [],
  diets: [],
  kashrut: 'none',
  appliances: ['oven', 'stovetop'],
  skill: 'home',
  dislikes: [],
};

const input: PlanInput = {
  constraints,
  cookingDays: ['sun', 'tue', 'thu'],
  mealsAtHome: { weekday: ['dinner'], weekend: ['lunch', 'dinner'] },
  lunchboxesPerWeekday: 2,
  festive: { fridayDinner: true, shabbatLunch: false },
  portionsPerMeal: 2.5,
};

// The real recipes are drafts; internal builds opt in to see them.
const gate = { includeDrafts: true };

describe('weekSlots', () => {
  it('lays out the week in day order with lunchboxes on weekdays only', () => {
    const slots = weekSlots(input);
    expect(slots.map((s) => `${s.day}:${s.kind}`)).toEqual([
      'sun:dinner', 'sun:lunchbox', 'mon:dinner', 'mon:lunchbox', 'tue:dinner', 'tue:lunchbox',
      'wed:dinner', 'wed:lunchbox', 'thu:dinner', 'thu:lunchbox',
      'fri:lunch', 'fri:dinner', 'sat:lunch', 'sat:dinner',
    ]);
    expect(slots.filter((s) => s.kind === 'lunchbox').every((s) => s.portions === 2)).toBe(true);
    expect(slots.filter((s) => s.kind !== 'lunchbox').every((s) => s.portions === 2.5)).toBe(true);
    expect(slots.filter((s) => s.festive).map((s) => `${s.day}:${s.kind}`)).toEqual(['fri:dinner']);
  });

  it('prepares each slot on the latest cooking day, wrapping to last week', () => {
    expect(cookDayFor('mon', ['sun', 'tue', 'thu'])).toBe('sun');
    expect(cookDayFor('tue', ['sun', 'tue', 'thu'])).toBe('tue');
    expect(cookDayFor('sat', ['sun', 'tue', 'thu'])).toBe('thu');
    expect(cookDayFor('sun', ['wed'])).toBe('wed');
    expect(cookDayFor('mon', [])).toBe('mon');
  });
});

describe('buildWeekPlan', () => {
  it('fills every slot with an allowed recipe of the right kind', () => {
    const plan = buildWeekPlan(input, RECIPES, CATALOG, 7, gate);
    for (const slot of plan.slots) {
      const recipe = RECIPES.find((r) => r.id === slot.recipeId);
      expect(recipe, `${slot.day}:${slot.kind}`).toBeDefined();
      expect(exclusions(recipe!, CATALOG, constraints, gate)).toEqual([]);
      expect(recipe!.tags).not.toContain('side');
      if (slot.kind === 'lunchbox') expect(recipe!.tags).toContain('lunchbox');
      else expect(recipe!.meals).toContain(slot.kind);
    }
  });

  it('is reproducible from its seed and varies across seeds', () => {
    const a = buildWeekPlan(input, RECIPES, CATALOG, 42, gate);
    expect(buildWeekPlan(input, RECIPES, CATALOG, 42, gate)).toEqual(a);
    const others = [1, 2, 3, 4].map((s) => buildWeekPlan(input, RECIPES, CATALOG, s, gate).slots.map((x) => x.recipeId).join());
    expect(new Set(others).size).toBeGreaterThan(1);
  });

  it('does not repeat a dinner while unused dinners remain', () => {
    const plan = buildWeekPlan(input, RECIPES, CATALOG, 3, gate);
    const dinners = plan.slots.filter((s) => s.kind === 'dinner').map((s) => s.recipeId);
    expect(new Set(dinners).size).toBe(dinners.length);
  });

  it('serves a festive dish on Friday night when asked', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const fri = buildWeekPlan(input, RECIPES, CATALOG, seed, gate).slots.find((s) => s.day === 'fri' && s.kind === 'dinner')!;
      const tags = RECIPES.find((r) => r.id === fri.recipeId)!.tags;
      expect(tags.some((t) => t === 'festive' || t === 'shabbat')).toBe(true);
    }
  });

  it('respects allergies, diet and kashrut across the whole week', () => {
    const strict: PlanInput = {
      ...input,
      constraints: { ...constraints, allergens: ['gluten', 'eggs'], diets: ['vegetarian'], kashrut: 'mehadrin' },
    };
    const plan = buildWeekPlan(strict, RECIPES, CATALOG, 11, gate);
    for (const s of plan.slots.filter((x) => x.recipeId)) {
      expect(exclusions(RECIPES.find((r) => r.id === s.recipeId)!, CATALOG, strict.constraints, gate)).toEqual([]);
    }
  });

  it('leaves a slot empty rather than break a rule', () => {
    const impossible: PlanInput = { ...input, constraints: { ...constraints, appliances: [] } };
    const plan = buildWeekPlan(impossible, RECIPES, CATALOG, 1, gate);
    // Every main dish needs an oven or a stove, so nothing fits.
    expect(plan.slots.every((s) => s.recipeId === null)).toBe(true);
  });

  it('shows no drafts unless the build opts in', () => {
    const plan = buildWeekPlan(input, RECIPES, CATALOG, 1);
    expect(plan.slots.every((s) => s.recipeId === null)).toBe(true);
  });
});

describe('swapSlot', () => {
  it('changes only the chosen slot, to a different allowed recipe', () => {
    const plan = buildWeekPlan(input, RECIPES, CATALOG, 5, gate);
    const i = plan.slots.findIndex((s) => s.kind === 'dinner');
    const next = swapSlot(plan, i, input, RECIPES, CATALOG, rng(9), gate);
    expect(next.slots[i].recipeId).not.toBe(plan.slots[i].recipeId);
    expect(candidatesFor(next.slots[i], RECIPES, CATALOG, constraints, gate).map((r) => r.id)).toContain(next.slots[i].recipeId);
    expect(next.slots.filter((_, k) => k !== i)).toEqual(plan.slots.filter((_, k) => k !== i));
  });
});

describe('scaleFor', () => {
  it('scales by portions per recipe serving', () => {
    expect(scaleFor({ servings: 4 }, 2.5)).toBe(0.63);
    expect(scaleFor({ servings: 2 }, 4)).toBe(2);
  });
});
