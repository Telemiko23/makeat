import { ALLERGENS, type Allergen } from '../vocab';
import type { AnimalSource, FoodClass, Ingredient, Recipe } from './types';

export type Catalog = ReadonlyMap<string, Ingredient>;

export function catalogOf(ingredients: readonly Ingredient[]): Catalog {
  return new Map(ingredients.map((i) => [i.id, i]));
}

/** Catalog entries of a recipe's ingredients, optional ones included, in recipe order. */
export function resolve(recipe: Recipe, catalog: Catalog): { entries: Ingredient[]; unknown: string[] } {
  const entries: Ingredient[] = [];
  const unknown: string[] = [];
  for (const ri of recipe.ingredients) {
    const ing = catalog.get(ri.id);
    if (ing) entries.push(ing);
    else unknown.push(ri.id);
  }
  return { entries, unknown };
}

function known(recipe: Recipe, catalog: Catalog): Ingredient[] {
  const { entries, unknown } = resolve(recipe, catalog);
  if (unknown.length) throw new Error(`${recipe.id}: unknown ingredient "${unknown[0]}"`);
  return entries;
}

// The functions below take resolved entries, so the gate resolves a recipe once.

/**
 * Every allergen any ingredient carries. Optional ingredients count too: a user
 * who skips the optional part must not be the safety mechanism.
 */
export function allergensOf(entries: readonly Ingredient[]): Allergen[] {
  const found = new Set(entries.flatMap((i) => i.allergens));
  return ALLERGENS.filter((a) => found.has(a));
}

/** Meat if any ingredient is meat, dairy if any is dairy, else fish if any is fish, else parve. */
export function classOf(entries: readonly Ingredient[]): FoodClass {
  const classes = new Set(entries.map((i) => i.class));
  if (classes.has('meat')) return 'meat';
  if (classes.has('dairy')) return 'dairy';
  if (classes.has('fish')) return 'fish';
  return 'parve';
}

/** Meat with dairy, or meat with fish, in one dish. */
export function mixesKashrutClasses(entries: readonly Ingredient[]): boolean {
  const classes = new Set(entries.map((i) => i.class));
  return classes.has('meat') && (classes.has('dairy') || classes.has('fish'));
}

const sources = (entries: readonly Ingredient[]) => new Set<AnimalSource>(entries.flatMap((i) => i.animal));
const FLESH: readonly AnimalSource[] = ['meat', 'poultry', 'fish', 'shellfish'];

export const vegetarianOf = (entries: readonly Ingredient[]) => !FLESH.some((a) => sources(entries).has(a));
export const veganOf = (entries: readonly Ingredient[]) => sources(entries).size === 0;
export const onlyKosherSpecies = (entries: readonly Ingredient[]) => entries.every((i) => i.kosherSpecies !== false);

// Recipe-level helpers; they throw on an unknown ingredient instead of guessing.
export const recipeAllergens = (r: Recipe, c: Catalog) => allergensOf(known(r, c));
export const recipeClass = (r: Recipe, c: Catalog) => classOf(known(r, c));
export const isVegetarian = (r: Recipe, c: Catalog) => vegetarianOf(known(r, c));
export const isVegan = (r: Recipe, c: Catalog) => veganOf(known(r, c));
export const hasOnlyKosherSpecies = (r: Recipe, c: Catalog) => onlyKosherSpecies(known(r, c));
