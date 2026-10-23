import type { Allergen, Appliance, Diet, Kashrut, Skill } from '../vocab';
import { allergensOf, mixesKashrutClasses, onlyKosherSpecies, resolve, veganOf, vegetarianOf, type Catalog } from './derive';
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

export type GateOptions = {
  /** Lets unreviewed drafts through, for internal builds only. Users never see drafts. */
  includeDrafts?: boolean;
};

export type Exclusion =
  | { rule: 'unknownIngredient'; ingredients: string[] }
  | { rule: 'draft' }
  | { rule: 'allergen'; allergens: Allergen[] }
  | { rule: 'kashrut'; reason: 'species' | 'mixing' }
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

/** A typed dislike and its singular form, so "חצילים" also catches "חציל". */
function dislikeForms(raw: string): string[] {
  const d = norm(raw);
  if (!d) return [];
  const singular = d.replace(/(ים|ות)$/u, '');
  return singular !== d && singular.length >= 2 ? [d, singular] : [d];
}

/**
 * Every rule a recipe breaks for this household; empty means it may be shown.
 * This is the hard gate of CLAUDE.md: anything suggested to a user, authored or
 * produced by a model, passes through here first, so it re-checks everything a
 * model could get wrong and never trusts that content was validated.
 */
export function exclusions(recipe: Recipe, catalog: Catalog, c: RecipeConstraints, options: GateOptions = {}): Exclusion[] {
  const { entries, unknown } = resolve(recipe, catalog);
  // An ingredient we have no facts for can hide any allergen: fail closed.
  if (unknown.length) return [{ rule: 'unknownIngredient', ingredients: unknown }];

  const out: Exclusion[] = [];
  if (recipe.status !== 'reviewed' && !options.includeDrafts) out.push({ rule: 'draft' });

  const allergens = allergensOf(entries).filter((a) => c.allergens.includes(a));
  if (allergens.length) out.push({ rule: 'allergen', allergens });

  // Product certification (hechsher, mehadrin) is a property of products, handled in the basket.
  if (c.kashrut !== 'none') {
    if (!onlyKosherSpecies(entries)) out.push({ rule: 'kashrut', reason: 'species' });
    else if (mixesKashrutClasses(entries)) out.push({ rule: 'kashrut', reason: 'mixing' });
  }

  if (c.diets.includes('vegan') && !veganOf(entries)) out.push({ rule: 'diet', diet: 'vegan' });
  else if (c.diets.includes('vegetarian') && !vegetarianOf(entries)) out.push({ rule: 'diet', diet: 'vegetarian' });

  const missing = recipe.appliances.filter((a) => !c.appliances.includes(a));
  if (missing.length) out.push({ rule: 'appliance', missing });

  if (!SKILL_ALLOWS[c.skill]?.includes(recipe.difficulty)) out.push({ rule: 'skill' });

  // One way only: disliking "בצל ירוק" must not exclude plain "בצל".
  const forms = c.dislikes.flatMap(dislikeForms);
  const disliked = recipe.ingredients
    .filter((ri, i) => {
      const name = norm(entries[i].name.he);
      return forms.some((d) => name.includes(d));
    })
    .map((ri) => ri.id);
  if (disliked.length) out.push({ rule: 'dislike', ingredients: disliked });

  return out;
}

export const isAllowed = (recipe: Recipe, catalog: Catalog, c: RecipeConstraints, options?: GateOptions) =>
  exclusions(recipe, catalog, c, options).length === 0;
