import { ALLERGENS, APPLIANCES, MEALS } from '../vocab';
import type { Catalog } from './derive';
import {
  ANIMAL_SOURCES,
  DIFFICULTIES,
  FOOD_CLASSES,
  RECIPE_TAGS,
  SUBSTITUTE_REASONS,
  UNITS,
  type Ingredient,
  type Localized,
  type Recipe,
} from './types';

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const HEBREW = /[֐-׿]/;

const hasHebrew = (l: Localized | undefined) => !!l && typeof l.he === 'string' && HEBREW.test(l.he);
const within = <T>(allowed: readonly T[], values: readonly T[]) => values.every((v) => allowed.includes(v));
const unique = (values: readonly unknown[]) => new Set(values).size === values.length;

/** Problems in the ingredient catalog, as readable messages; empty when valid. */
export function validateCatalog(ingredients: readonly Ingredient[]): string[] {
  const errors: string[] = [];
  const ids = new Set(ingredients.map((i) => i.id));
  if (ids.size !== ingredients.length) errors.push('catalog: duplicate ingredient ids');
  for (const i of ingredients) {
    const e = (msg: string) => errors.push(`ingredient ${i.id}: ${msg}`);
    if (!ID.test(i.id)) e('id must be kebab-case');
    if (!hasHebrew(i.name)) e('needs a Hebrew name');
    if (!FOOD_CLASSES.includes(i.class)) e(`unknown class "${i.class}"`);
    if (!within(ANIMAL_SOURCES, i.animal) || !unique(i.animal)) e('invalid animal sources');
    if (!within(ALLERGENS, i.allergens) || !unique(i.allergens)) e('invalid allergens');
    if (!i.units.length || !within(UNITS, i.units)) e('invalid units');
    if (i.units.includes('pcs') && !(i.gramsPerPiece && i.gramsPerPiece > 0)) e('counted in pieces but has no gramsPerPiece');
    // The class must agree with what the ingredient is made of.
    const a = new Set(i.animal);
    if ((a.has('meat') || a.has('poultry')) !== (i.class === 'meat')) e('class "meat" exactly when made from meat or poultry');
    if (a.has('dairy') !== (i.class === 'dairy')) e('class "dairy" exactly when made from dairy');
    if (a.has('fish') !== (i.class === 'fish')) e('class "fish" exactly when made from fish');
    if (a.has('dairy') && !i.allergens.includes('milk')) e('dairy must carry the milk allergen');
    if (a.has('egg') && !i.allergens.includes('eggs')) e('egg must carry the eggs allergen');
    if (a.has('fish') && !i.allergens.includes('fish')) e('fish must carry the fish allergen');
    for (const s of i.substitutes ?? []) {
      if (!ids.has(s.id)) e(`substitute "${s.id}" is not in the catalog`);
      if (s.id === i.id) e('cannot substitute itself');
      if (!(s.ratio > 0)) e(`substitute "${s.id}" needs a positive ratio`);
      if (!s.reasons.length || !within(SUBSTITUTE_REASONS, s.reasons)) e(`substitute "${s.id}" has invalid reasons`);
    }
  }
  return errors;
}

/** Problems in one recipe, as readable messages; empty when valid. */
export function validateRecipe(r: Recipe, catalog: Catalog): string[] {
  const errors: string[] = [];
  const e = (msg: string) => errors.push(`recipe ${r.id}: ${msg}`);
  if (!ID.test(r.id)) e('id must be kebab-case');
  if (r.status !== 'draft' && r.status !== 'reviewed') e('status must be draft or reviewed');
  if (!hasHebrew(r.title)) e('needs a Hebrew title');
  if (!hasHebrew(r.summary)) e('needs a Hebrew summary');
  if (!(Number.isInteger(r.servings) && r.servings > 0)) e('servings must be a positive integer');
  if (!(r.prepMinutes >= 0 && r.cookMinutes >= 0 && r.prepMinutes + r.cookMinutes > 0)) e('needs prep or cook time');
  if (!DIFFICULTIES.includes(r.difficulty)) e(`unknown difficulty "${r.difficulty}"`);
  if (!r.meals.length || !within(MEALS, r.meals) || !unique(r.meals)) e('invalid meals');
  if (!within(RECIPE_TAGS, r.tags) || !unique(r.tags)) e('invalid tags');
  if (!within(APPLIANCES, r.appliances) || !unique(r.appliances)) e('invalid appliances');
  if (!r.ingredients.length) e('has no ingredients');
  if (!unique(r.ingredients.map((i) => i.id))) e('lists an ingredient twice');
  if (!r.steps.length || !r.steps.every((s) => hasHebrew(s.text))) e('every step needs Hebrew text');

  const classes = new Set<string>();
  for (const ri of r.ingredients) {
    const ing = catalog.get(ri.id);
    if (!ing) {
      e(`unknown ingredient "${ri.id}"`);
      continue;
    }
    if (!(ri.qty > 0)) e(`${ri.id}: quantity must be positive`);
    if (!ing.units.includes(ri.unit)) e(`${ri.id}: unit "${ri.unit}" not allowed (use ${ing.units.join('/')})`);
    classes.add(ing.class);
  }
  // Kashrut: never meat with dairy, and never meat with fish, in one dish.
  if (classes.has('meat') && classes.has('dairy')) e('mixes meat and dairy');
  if (classes.has('meat') && classes.has('fish')) e('mixes meat and fish');
  return errors;
}
