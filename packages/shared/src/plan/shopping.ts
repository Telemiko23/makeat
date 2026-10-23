import type { Catalog } from '../recipes/derive';
import type { Recipe, Unit } from '../recipes/types';
import { scaleFor, type WeekPlan } from './plan';

/** Ingredients nobody buys, even though recipes list them. */
const NEVER_BUY: readonly string[] = ['water'];

export type ShoppingAmount = { unit: Unit; qty: number };

export type ShoppingItem = {
  id: string;
  /** What to buy, one entry per unit that could not be merged. Pinch has qty 0. */
  amounts: ShoppingAmount[];
  /** Kitchen staples most homes already have; listed so the user can check. */
  pantry: boolean;
  /** True when every recipe that uses it marks it optional. */
  optional: boolean;
  /** Recipes in the week that use it, in plan order, without repeats. */
  recipeIds: string[];
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Merges every planned recipe's ingredients, scaled to each slot's portions,
 * into one list. Teaspoons fold into tablespoons, and grams of produce
 * sold by the piece fold into pieces, so each ingredient reads as one amount
 * where possible. Unknown recipes and ingredients are skipped (the plan already
 * passed the gate, which fails closed on them).
 */
export function shoppingList(plan: WeekPlan, recipes: readonly Recipe[], catalog: Catalog): ShoppingItem[] {
  const byId = new Map(recipes.map((r) => [r.id, r]));
  const items = new Map<string, { qty: Map<Unit, number>; optional: boolean; recipeIds: string[] }>();

  for (const slot of plan.slots) {
    const recipe = slot.recipeId ? byId.get(slot.recipeId) : undefined;
    if (!recipe) continue;
    const scale = scaleFor(recipe, slot.portions);
    for (const ri of recipe.ingredients) {
      if (NEVER_BUY.includes(ri.id) || !catalog.has(ri.id)) continue;
      let item = items.get(ri.id);
      if (!item) {
        item = { qty: new Map(), optional: true, recipeIds: [] };
        items.set(ri.id, item);
      }
      item.qty.set(ri.unit, (item.qty.get(ri.unit) ?? 0) + (ri.unit === 'pinch' ? 0 : ri.qty * scale));
      item.optional &&= !!ri.optional;
      if (!item.recipeIds.includes(recipe.id)) item.recipeIds.push(recipe.id);
    }
  }

  return [...items].map(([id, item]) => {
    const ing = catalog.get(id)!;
    const q = item.qty;
    if (q.has('tsp') && q.has('tbsp')) {
      q.set('tbsp', q.get('tbsp')! + q.get('tsp')! / 3);
      q.delete('tsp');
    }
    if (q.has('g') && ing.units.includes('pcs') && ing.gramsPerPiece) {
      q.set('pcs', (q.get('pcs') ?? 0) + q.get('g')! / ing.gramsPerPiece);
      q.delete('g');
    }
    if (q.has('pinch') && q.size > 1) q.delete('pinch');
    const amounts = [...q].map(([unit, qty]) => ({ unit, qty: round2(qty) }));
    return { id, amounts, pantry: !!ing.pantry, optional: item.optional, recipeIds: item.recipeIds };
  });
}
