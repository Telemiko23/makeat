import type { TFunction } from 'i18next';
import type { Localized, Unit } from '../../../../packages/shared/src/recipes/types';

/** Recipe text in the active language, falling back to Hebrew. */
export const local = (l: Localized, language: string): string =>
  (l as Record<string, string | undefined>)[language.split('-')[0]] ?? l.he;

/** Rounds a scaled amount to something a home cook can measure. */
export function roundQty(qty: number, unit: Unit): number {
  switch (unit) {
    case 'g':
    case 'ml':
      if (qty >= 100) return Math.round(qty / 10) * 10;
      if (qty >= 10) return Math.round(qty / 5) * 5;
      // Small amounts (yeast, spices) stay close to the recipe.
      return Math.max(0.5, Math.round(qty * 2) / 2);
    case 'pcs':
      return Math.max(0.5, Math.round(qty * 2) / 2);
    case 'tbsp':
    case 'tsp':
      return Math.max(0.25, Math.round(qty * 4) / 4);
    case 'pinch':
      return 1;
  }
}

/**
 * Amount to buy: whole pieces (nobody buys half an onion), otherwise the
 * same rounding as in a recipe.
 */
export const buyAmount = (t: TFunction, qty: number, unit: Unit) =>
  unit === 'pcs' ? t('units.pcs', { count: Math.max(1, Math.ceil(qty - 0.01)) }) : amount(t, qty, unit);

export const amount = (t: TFunction, qty: number, unit: Unit) => t(`units.${unit}`, { count: roundQty(qty, unit) });
