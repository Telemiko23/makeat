import type { Allergen, Appliance, Diet, Kashrut, Skill } from '../vocab';
import { hasOnlyKosherSpecies, isVegan, isVegetarian, recipeAllergens, type Catalog } from './derive';
import type { Difficulty, Recipe } from './types';

/** The parts of a household profile that decide which recipes it may see. */
export type RecipeConstraints = {
  allergens: readonly Allergen[];
  diets: readonly Diet[];
  kashrut: Kashrut;
  appliances: readonly Appliance[];
  skill: Skill;
  dislikes: readonly string[];
};

export type Exclusion =
  | { rule: 'allergen'; allergens: Allergen[] }
  | { rule: 'kashrut' }
  | { rule: 'diet'; diet: Diet }
  | { rule: 'appliance'; missing: Appliance[] }
  | { rule: 'skill' }
  | { rule: 'dislike'; ingredients: string[] };

const SKILL_ALLOWS: Record<Skill, readonly Difficulty[]> = {
  beginner: ['easy'],
  home: ['easy', 'medium'],
  confident: ['easy', 'medium', 'hard'],
};

const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLocaleLowerCase();

/**
 * Every rule a recipe breaks for this household; empty means it may be shown.
 * This is the hard gate of CLAUDE.md: anything suggested to a user, by people
 * or by a model, passes through here first. No allergen or kashrut judgment is
 * left to text or to a model.
 */
export function exclusions(recipe: Recipe, catalog: Catalog, c: RecipeConstraints): Exclusion[] {
  const out: Exclusion[] = [];

  const allergens = recipeAllergens(recipe, catalog).filter((a) => c.allergens.includes(a));
  if (allergens.length) out.push({ rule: 'allergen', allergens });

  // Meat with dairy or fish never passes validation, so kosher households only
  // need the species check. Certification is a property of products, handled in the basket.
  if (c.kashrut !== 'none' && !hasOnlyKosherSpecies(recipe, catalog)) out.push({ rule: 'kashrut' });

  if (c.diets.includes('vegan') && !isVegan(recipe, catalog)) out.push({ rule: 'diet', diet: 'vegan' });
  else if (c.diets.includes('vegetarian') && !isVegetarian(recipe, catalog)) out.push({ rule: 'diet', diet: 'vegetarian' });

  const missing = recipe.appliances.filter((a) => !c.appliances.includes(a));
  if (missing.length) out.push({ rule: 'appliance', missing });

  if (!SKILL_ALLOWS[c.skill].includes(recipe.difficulty)) out.push({ rule: 'skill' });

  // Dislikes are free text: match either way round, so "חצילים" catches "חציל".
  const dislikes = c.dislikes.map(norm).filter(Boolean);
  const disliked = recipe.ingredients
    .filter((ri) => {
      const name = norm(catalog.get(ri.id)?.name.he ?? '');
      return !!name && dislikes.some((d) => name.includes(d) || d.includes(name));
    })
    .map((ri) => ri.id);
  if (disliked.length) out.push({ rule: 'dislike', ingredients: disliked });

  return out;
}

export const isAllowed = (recipe: Recipe, catalog: Catalog, c: RecipeConstraints) => exclusions(recipe, catalog, c).length === 0;
