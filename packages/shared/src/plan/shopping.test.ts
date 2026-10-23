import { describe, expect, it } from 'vitest';
import { CATALOG, RECIPES } from '../content';
import type { Catalog } from '../recipes/derive';
import type { Ingredient, Recipe } from '../recipes/types';
import { buildWeekPlan, type PlanInput, type Slot, type WeekPlan } from './plan';
import { shoppingList } from './shopping';

const ing = (id: string, extra: Partial<Ingredient> = {}): Ingredient => ({
  id,
  name: { he: 'א' },
  class: 'parve',
  animal: [],
  allergens: [],
  units: ['g', 'pcs', 'tbsp', 'tsp', 'pinch', 'ml'],
  gramsPerPiece: 100,
  ...extra,
});

const catalog: Catalog = new Map(
  [ing('onion'), ing('oil', { pantry: true, gramsPerPiece: undefined }), ing('salt', { pantry: true }), ing('herb'), ing('water', { pantry: true })].map((i) => [i.id, i]),
);

const recipe = (id: string, servings: number, ingredients: Recipe['ingredients']): Recipe =>
  ({ id, servings, ingredients, status: 'reviewed', tags: [], meals: ['dinner'] }) as unknown as Recipe;

const slot = (recipeId: string, portions: number): Slot => ({ day: 'sun', kind: 'dinner', recipeId, portions, cookDay: 'sun', festive: false });

describe('shoppingList', () => {
  const a = recipe('a', 4, [
    { id: 'onion', qty: 2, unit: 'pcs' },
    { id: 'oil', qty: 1, unit: 'tbsp' },
    { id: 'salt', qty: 1, unit: 'pinch' },
    { id: 'herb', qty: 10, unit: 'g', optional: true },
    { id: 'water', qty: 500, unit: 'ml' },
  ]);
  const b = recipe('b', 2, [
    { id: 'onion', qty: 150, unit: 'g' },
    { id: 'oil', qty: 3, unit: 'tsp' },
    { id: 'salt', qty: 1, unit: 'tsp' },
    { id: 'herb', qty: 5, unit: 'g' },
  ]);

  it('merges and scales each ingredient across the week', () => {
    const plan: WeekPlan = { seed: 1, slots: [slot('a', 2), slot('b', 2), slot('a', 4), { ...slot('a', 2), recipeId: null }] };
    const list = shoppingList(plan, [a, b], catalog);
    const get = (id: string) => list.find((i) => i.id === id)!;
    // a at 0.5 and 1x: 1 + 2 pieces; b: 150 g at 100 g a piece.
    expect(get('onion').amounts).toEqual([{ unit: 'pcs', qty: 4.5 }]);
    // 0.5 + 1 tbsp, plus 3 tsp = 1 tbsp.
    expect(get('oil').amounts).toEqual([{ unit: 'tbsp', qty: 2.5 }]);
    // A pinch disappears next to a real amount.
    expect(get('salt').amounts).toEqual([{ unit: 'tsp', qty: 1 }]);
    expect(get('salt').pantry).toBe(true);
    expect(get('onion').recipeIds).toEqual(['a', 'b']);
  });

  it('is optional only when every use is optional', () => {
    expect(shoppingList({ seed: 1, slots: [slot('a', 4)] }, [a, b], catalog).find((i) => i.id === 'herb')!.optional).toBe(true);
    expect(shoppingList({ seed: 1, slots: [slot('a', 4), slot('b', 2)] }, [a, b], catalog).find((i) => i.id === 'herb')!.optional).toBe(false);
  });

  it('never lists water, and lists nothing for an empty week', () => {
    expect(shoppingList({ seed: 1, slots: [slot('a', 4)] }, [a], catalog).map((i) => i.id)).not.toContain('water');
    expect(shoppingList({ seed: 1, slots: [{ ...slot('a', 4), recipeId: null }] }, [a], catalog)).toEqual([]);
  });

  it('covers a real week with positive amounts for every listed ingredient', () => {
    const input: PlanInput = {
      constraints: { allergens: [], diets: [], kashrut: 'none', appliances: ['oven', 'stovetop'], skill: 'home', dislikes: [] },
      cookingDays: ['sun', 'wed'],
      mealsAtHome: { weekday: ['dinner'], weekend: ['lunch', 'dinner'] },
      lunchboxesPerWeekday: 1,
      festive: { fridayDinner: true, shabbatLunch: false },
      portionsPerMeal: 3,
    };
    const plan = buildWeekPlan(input, RECIPES, CATALOG, 3, { includeDrafts: true });
    const list = shoppingList(plan, RECIPES, CATALOG);
    expect(list.length).toBeGreaterThan(15);
    expect(new Set(list.map((i) => i.id)).size).toBe(list.length);
    for (const item of list) {
      expect(item.amounts.length, item.id).toBeGreaterThan(0);
      for (const a of item.amounts) if (a.unit !== 'pinch') expect(a.qty, item.id).toBeGreaterThan(0);
    }
  });
});
