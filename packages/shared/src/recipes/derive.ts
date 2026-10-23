import { ALLERGENS, type Allergen } from '../vocab';
import type { AnimalSource, FoodClass, Ingredient, Recipe } from './types';

export type Catalog = ReadonlyMap<string, Ingredient>;

export function catalogOf(ingredients: readonly Ingredient[]): Catalog {
  return new Map(ingredients.map((i) => [i.id, i]));
}

/** Catalog entries of a recipe's ingredients, optional ones included, in recipe order. */
function entries(recipe: Recipe, catalog: Catalog): Ingredient[] {
  return recipe.ingredients.map((ri) => {
    const ing = catalog.get(ri.id);
    if (!ing) throw new Error(`${recipe.id}: unknown ingredient "${ri.id}"`);
    return ing;
  });
}

/**
 * Every allergen any ingredient carries. Optional ingredients count too: a user
 * who skips the optional part must not be the safety mechanism.
 */
export function recipeAllergens(recipe: Recipe, catalog: Catalog): Allergen[] {
  const found = new Set(entries(recipe, catalog).flatMap((i) => i.allergens));
  return ALLERGENS.filter((a) => found.has(a));
}

/** Meat if any ingredient is meat, dairy if any is dairy, else fish if any is fish, else parve. */
export function recipeClass(recipe: Recipe, catalog: Catalog): FoodClass {
  const classes = new Set(entries(recipe, catalog).map((i) => i.class));
  if (classes.has('meat')) return 'meat';
  if (classes.has('dairy')) return 'dairy';
  if (classes.has('fish')) return 'fish';
  return 'parve';
}

export function animalSources(recipe: Recipe, catalog: Catalog): Set<AnimalSource> {
  return new Set(entries(recipe, catalog).flatMap((i) => i.animal));
}

export function isVegetarian(recipe: Recipe, catalog: Catalog): boolean {
  const a = animalSources(recipe, catalog);
  return !a.has('meat') && !a.has('poultry') && !a.has('fish');
}

export function isVegan(recipe: Recipe, catalog: Catalog): boolean {
  return animalSources(recipe, catalog).size === 0;
}

/** True when every ingredient is of a kosher-permitted species. */
export function hasOnlyKosherSpecies(recipe: Recipe, catalog: Catalog): boolean {
  return entries(recipe, catalog).every((i) => i.kosherSpecies !== false);
}
