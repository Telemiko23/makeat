import type { Catalog } from '../recipes/derive';
import type { Ingredient } from '../recipes/types';
import type { ShoppingAmount, ShoppingItem } from '../plan/shopping';

/** One shelf product that can stand in for an ingredient (content/products.json). */
export type ProductOption =
  | { code: string; perKg: true; note?: string }
  | { code: string; size: number; unit: 'g' | 'ml' | 'pcs'; note?: string; perKg?: undefined };

export type ProductMap = Record<string, readonly ProductOption[]>;

/** One branch in the hourly price file (decision 0012). */
export type StorePrices = {
  chain: string;
  storeId: string;
  name: string;
  city: string | null;
  /** Israel local time of the newest feed file, e.g. "2026-10-23T11:00:05". */
  publishedAt: string | null;
  /** Shelf price by barcode; per kilogram for weighed produce. */
  prices: Record<string, number>;
};

export type PriceFile = { version: 1; generatedAt: string; stores: StorePrices[] };

export type QuoteLine = { id: string; code: string; cost: number; packs: number | null; grams: number | null };

export type StoreQuote = {
  store: StorePrices;
  total: number;
  lines: QuoteLine[];
  /** Ingredient ids with no mapped product on this branch's shelf. */
  missing: string[];
};

// Kitchen measures in grams (or millilitres; water-like density is close enough for buying).
const SPOON = { tbsp: 15, tsp: 5, pinch: 0.5 } as const;

/** Grams (or ml) for an amount; null when a piece count has no weight to convert with. */
function grams(a: ShoppingAmount, ing: Ingredient): number | null {
  switch (a.unit) {
    case 'g':
    case 'ml':
      return a.qty;
    case 'pcs':
      return ing.gramsPerPiece ? a.qty * ing.gramsPerPiece : null;
    default:
      return a.unit === 'pinch' ? SPOON.pinch : a.qty * SPOON[a.unit];
  }
}

/** Pieces for an amount; null when it is not a count and has no piece weight. */
function pieces(a: ShoppingAmount, ing: Ingredient): number | null {
  if (a.unit === 'pcs') return a.qty;
  const g = grams(a, ing);
  return g !== null && ing.gramsPerPiece ? g / ing.gramsPerPiece : null;
}

const sum = (values: (number | null)[]) => (values.some((v) => v === null) ? null : (values as number[]).reduce((s, v) => s + v, 0));
const money = (n: number) => Math.round(n * 100) / 100;

/** The cost of buying `amounts` as one product option at `price`, or null when the units cannot be matched. */
export function optionCost(option: ProductOption, price: number, amounts: readonly ShoppingAmount[], ing: Ingredient): Omit<QuoteLine, 'id' | 'code'> | null {
  if (option.perKg) {
    const g = sum(amounts.map((a) => grams(a, ing)));
    return g === null ? null : { cost: money((g / 1000) * price), packs: null, grams: Math.round(g) };
  }
  const need = option.unit === 'pcs' ? sum(amounts.map((a) => pieces(a, ing))) : sum(amounts.map((a) => grams(a, ing)));
  if (need === null) return null;
  // Whole packs only; the epsilon keeps 2.0000001 packs from becoming 3.
  const packs = Math.max(1, Math.ceil(need / option.size - 1e-9));
  return { cost: money(packs * price), packs, grams: null };
}

/**
 * Prices a shopping list at one branch: for each item, the cheapest mapped
 * product on that branch's shelf, in whole packs (weighed produce by weight).
 * Shelf prices only; promotions are not applied yet (decision 0012).
 */
export function quoteStore(items: readonly ShoppingItem[], products: ProductMap, catalog: Catalog, store: StorePrices): StoreQuote {
  const lines: QuoteLine[] = [];
  const missing: string[] = [];
  for (const item of items) {
    const ing = catalog.get(item.id);
    let best: QuoteLine | null = null;
    for (const option of (ing && products[item.id]) || []) {
      const price = store.prices[option.code];
      if (price === undefined) continue;
      const cost = optionCost(option, price, item.amounts, ing!);
      if (cost && (!best || cost.cost < best.cost)) best = { id: item.id, code: option.code, ...cost };
    }
    if (best) lines.push(best);
    else missing.push(item.id);
  }
  return { store, total: money(lines.reduce((s, l) => s + l.cost, 0)), lines, missing };
}

/** Quotes for every branch, most complete first, then cheapest. */
export function quoteStores(items: readonly ShoppingItem[], products: ProductMap, catalog: Catalog, stores: readonly StorePrices[]): StoreQuote[] {
  return stores
    .map((s) => quoteStore(items, products, catalog, s))
    .sort((a, b) => a.missing.length - b.missing.length || a.total - b.total);
}
