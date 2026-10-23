import { RECIPES_BY_ID } from '../../../../packages/shared/src/content';
import type { Recipe } from '../../../../packages/shared/src/recipes/types';
import { GATE } from '../config';

/** A recipe the user may open: drafts only in builds that show them, even from a deep link. */
export function visibleRecipe(id: string | undefined): Recipe | undefined {
  const recipe = id ? RECIPES_BY_ID.get(id) : undefined;
  return recipe && (recipe.status === 'reviewed' || GATE.includeDrafts) ? recipe : undefined;
}

/** Portions from a URL parameter, or the recipe's own servings when missing or invalid. */
export function portionsParam(raw: string | undefined, recipe: Recipe): number {
  const asked = Number(raw);
  return Number.isFinite(asked) && asked > 0 ? asked : recipe.servings;
}
