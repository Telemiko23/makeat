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
      return qty >= 100 ? Math.round(qty / 10) * 10 : Math.max(5, Math.round(qty / 5) * 5);
    case 'pcs':
    case 'tbsp':
    case 'tsp':
      return Math.max(0.5, Math.round(qty * 2) / 2);
    case 'pinch':
      return 1;
  }
}

export const amount = (t: TFunction, qty: number, unit: Unit) => t(`units.${unit}`, { n: roundQty(qty, unit) });
