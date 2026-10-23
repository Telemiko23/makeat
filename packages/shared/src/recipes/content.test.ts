import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { catalogOf, recipeClass } from './derive';
import type { Ingredient, Recipe } from './types';
import { validateCatalog, validateRecipe } from './validate';

// Validates the real content in content/ on every test run.
const root = join(__dirname, '../../../../content');
const read = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;
const ingredients = read<Ingredient[]>(join(root, 'ingredients.json'));
const files = readdirSync(join(root, 'recipes')).filter((f) => f.endsWith('.json'));
const recipes = files.map((f) => ({ file: f, recipe: read<Recipe>(join(root, 'recipes', f)) }));
const catalog = catalogOf(ingredients);

describe('content', () => {
  it('ingredient catalog is valid', () => expect(validateCatalog(ingredients)).toEqual([]));

  it('has recipes', () => expect(recipes.length).toBeGreaterThanOrEqual(20));

  it.each(recipes)('$file is valid and named after its id', ({ file, recipe }) => {
    expect(file).toBe(`${recipe.id}.json`);
    expect(validateRecipe(recipe, catalog)).toEqual([]);
  });

  it('covers every kashrut class so plans can mix meals', () => {
    const classes = new Set(recipes.map(({ recipe }) => recipeClass(recipe, catalog)));
    expect([...classes].sort()).toEqual(['dairy', 'fish', 'meat', 'parve']);
  });
});
