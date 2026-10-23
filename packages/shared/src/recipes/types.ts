import type { Allergen, Appliance, Meal } from '../vocab';

/** Text shown to users. Hebrew is required; other languages are added later. */
export type Localized = { he: string; ar?: string; ru?: string; en?: string };

/** Quantities are metric. Spoons and pinches are only for small amounts. */
export const UNITS = ['g', 'ml', 'pcs', 'tbsp', 'tsp', 'pinch'] as const;
export type Unit = (typeof UNITS)[number];

/** Kashrut class of an ingredient or a dish. */
export const FOOD_CLASSES = ['meat', 'dairy', 'fish', 'parve'] as const;
export type FoodClass = (typeof FOOD_CLASSES)[number];

/** What an animal-derived ingredient comes from; drives the vegetarian and vegan rules. */
export const ANIMAL_SOURCES = ['meat', 'poultry', 'fish', 'dairy', 'egg', 'honey'] as const;
export type AnimalSource = (typeof ANIMAL_SOURCES)[number];

export const SUBSTITUTE_REASONS = ['glutenFree', 'dairyFree', 'eggFree', 'vegan', 'parve', 'budget', 'availability'] as const;
export type SubstituteReason = (typeof SUBSTITUTE_REASONS)[number];

export type Substitute = {
  id: string;
  /** Amount of the substitute per unit of the original, in the original's unit. */
  ratio: number;
  reasons: SubstituteReason[];
};

/** One entry of the ingredient catalog (content/ingredients.json). The facts here drive every safety rule. */
export type Ingredient = {
  id: string;
  name: Localized;
  class: FoodClass;
  /** Empty for plant and mineral ingredients. */
  animal: AnimalSource[];
  allergens: Allergen[];
  /** False for species that are never kosher (pork, shellfish). Omitted means kosher-permitted. */
  kosherSpecies?: false;
  /** Units a recipe may use for this ingredient. */
  units: Unit[];
  /** Weight of one piece, for ingredients counted in pieces; used to price baskets. */
  gramsPerPiece?: number;
  /** Salt, pepper, oil and the like: assumed at home, never the reason a basket is bought. */
  pantry?: boolean;
  substitutes?: Substitute[];
};

export type RecipeIngredient = {
  id: string;
  qty: number;
  unit: Unit;
  optional?: boolean;
  note?: Localized;
};

export type Step = {
  text: Localized;
  /** Hands-on or waiting time for this step, if it matters for planning. */
  minutes?: number;
};

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const RECIPE_TAGS = ['festive', 'shabbat', 'lunchbox', 'kidFriendly', 'freezes', 'onePot', 'side'] as const;
export type RecipeTag = (typeof RECIPE_TAGS)[number];

/**
 * A recipe as authored in content/recipes/<id>.json. Allergens, kashrut class and
 * diet are never written here: they are derived from the ingredients (derive.ts).
 */
export type Recipe = {
  id: string;
  /** `draft` until the nutrition role has reviewed it; only `reviewed` recipes ship. */
  status: 'draft' | 'reviewed';
  title: Localized;
  summary: Localized;
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  difficulty: Difficulty;
  meals: Meal[];
  tags: RecipeTag[];
  /** Every appliance the recipe needs. */
  appliances: Appliance[];
  ingredients: RecipeIngredient[];
  steps: Step[];
};
