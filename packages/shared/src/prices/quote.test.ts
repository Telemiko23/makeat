import { describe, expect, it } from 'vitest';
import { CATALOG, PRODUCTS } from '../content';
import type { Catalog } from '../recipes/derive';
import type { Ingredient } from '../recipes/types';
import type { ShoppingItem } from '../plan/shopping';
import { optionCost, quoteStore, quoteStores, type ProductMap, type StorePrices } from './quote';

const ing = (id: string, extra: Partial<Ingredient> = {}): Ingredient =>
  ({ id, name: { he: 'א' }, class: 'parve', animal: [], allergens: [], units: ['g'], ...extra }) as Ingredient;

const onion = ing('onion', { units: ['pcs', 'g'], gramsPerPiece: 150 });
const eggs = ing('eggs', { units: ['pcs'], gramsPerPiece: 55 });
const oil = ing('oil', { units: ['tbsp', 'ml'] });
const catalog: Catalog = new Map([onion, eggs, oil].map((i) => [i.id, i]));

const products: ProductMap = {
  onion: [{ code: 'onion-kg', perKg: true }],
  eggs: [
    { code: 'eggs-12', size: 12, unit: 'pcs' },
    { code: 'eggs-18', size: 18, unit: 'pcs' },
  ],
  oil: [{ code: 'oil-750', size: 750, unit: 'ml' }],
};

const item = (id: string, amounts: ShoppingItem['amounts']): ShoppingItem => ({ id, amounts, pantry: false, optional: false, recipeIds: [] });
const store = (prices: Record<string, number>): StorePrices => ({ chain: 'X', storeId: '1', name: 'n', city: null, publishedAt: null, prices });

describe('optionCost', () => {
  it('prices weighed produce by weight, converting pieces', () => {
    expect(optionCost({ code: 'x', perKg: true }, 4.9, [{ unit: 'pcs', qty: 4 }], onion)).toEqual({ cost: 2.94, packs: null, grams: 600 });
  });

  it('buys whole packs, never a partial one', () => {
    expect(optionCost({ code: 'x', size: 12, unit: 'pcs' }, 13.1, [{ unit: 'pcs', qty: 13 }], eggs)).toEqual({ cost: 26.2, packs: 2, grams: null });
    expect(optionCost({ code: 'x', size: 12, unit: 'pcs' }, 13.1, [{ unit: 'pcs', qty: 12 }], eggs)!.packs).toBe(1);
  });

  it('turns spoons into millilitres', () => {
    expect(optionCost({ code: 'x', size: 750, unit: 'ml' }, 19.9, [{ unit: 'tbsp', qty: 3 }], oil)!.packs).toBe(1);
  });

  it('cannot price pieces of something with no piece weight by weight', () => {
    expect(optionCost({ code: 'x', perKg: true }, 10, [{ unit: 'pcs', qty: 2 }], oil)).toBeNull();
  });
});

describe('quoteStore', () => {
  const items = [item('onion', [{ unit: 'pcs', qty: 2 }]), item('eggs', [{ unit: 'pcs', qty: 14 }]), item('oil', [{ unit: 'tbsp', qty: 2 }])];

  it('picks the cheapest product for each item and totals it', () => {
    const q = quoteStore(items, products, catalog, store({ 'onion-kg': 5, 'eggs-12': 13, 'eggs-18': 19.6, 'oil-750': 20 }));
    // Eggs: two 12-packs = 26, one 18-pack = 19.60.
    expect(q.lines.map((l) => [l.id, l.code, l.cost])).toEqual([
      ['onion', 'onion-kg', 1.5],
      ['eggs', 'eggs-18', 19.6],
      ['oil', 'oil-750', 20],
    ]);
    expect(q.total).toBe(41.1);
    expect(q.missing).toEqual([]);
  });

  it('lists what the branch does not carry instead of guessing', () => {
    const q = quoteStore(items, products, catalog, store({ 'onion-kg': 5 }));
    expect(q.missing).toEqual(['eggs', 'oil']);
    expect(q.total).toBe(1.5);
  });

  it('orders branches by completeness, then price', () => {
    const full = { ...store({ 'onion-kg': 9, 'eggs-12': 13, 'oil-750': 20 }), storeId: 'full' };
    const cheap = { ...store({ 'onion-kg': 1 }), storeId: 'cheap' };
    const cheaper = { ...store({ 'onion-kg': 2, 'eggs-12': 10, 'oil-750': 15 }), storeId: 'cheaper' };
    expect(quoteStores(items, products, catalog, [cheap, full, cheaper]).map((q) => q.store.storeId)).toEqual(['cheaper', 'full', 'cheap']);
  });
});

describe('the product map', () => {
  it('maps only known ingredients, with sizes and units the quote can use', () => {
    for (const [id, options] of Object.entries(PRODUCTS)) {
      const ingredient = CATALOG.get(id);
      expect(ingredient, id).toBeDefined();
      expect(options.length, id).toBeGreaterThan(0);
      for (const o of options) {
        expect(o.code, id).toMatch(/^\d{6,14}$/);
        if (!o.perKg) {
          expect(o.size, id).toBeGreaterThan(0);
          expect(['g', 'ml', 'pcs'], id).toContain(o.unit);
          // A count-only ingredient cannot be bought by weight, and pieces need a piece weight to match grams.
          if (o.unit === 'pcs') expect(ingredient!.units.includes('pcs') || !!ingredient!.gramsPerPiece, id).toBe(true);
        }
      }
    }
  });

  it('lists each barcode under one ingredient only', () => {
    const codes = Object.values(PRODUCTS).flatMap((options) => options.map((o) => o.code));
    expect(new Set(codes).size).toBe(codes.length);
  });
});
