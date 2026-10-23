// Shared vocabularies. The app's household profile (apps/mobile/src/domain/household.ts)
// must use exactly these ids; a test there checks they match.

export const ALLERGENS = [
  'gluten', 'milk', 'eggs', 'peanuts', 'treeNuts', 'sesame', 'soy',
  'fish', 'crustaceans', 'molluscs', 'mustard', 'celery', 'sulphites', 'lupin',
] as const;
export type Allergen = (typeof ALLERGENS)[number];

export const APPLIANCES = [
  'oven', 'stovetop', 'microwave', 'airFryer', 'blender', 'foodProcessor',
  'standMixer', 'grill', 'taboon', 'slowCooker', 'pressureCooker', 'toasterOven',
] as const;
export type Appliance = (typeof APPLIANCES)[number];

export const MEALS = ['breakfast', 'lunch', 'dinner'] as const;
export type Meal = (typeof MEALS)[number];

export const DIETS = ['vegetarian', 'vegan'] as const;
export type Diet = (typeof DIETS)[number];

export const KASHRUT = ['none', 'style', 'certified', 'mehadrin'] as const;
export type Kashrut = (typeof KASHRUT)[number];

export const SKILLS = ['beginner', 'home', 'confident'] as const;
export type Skill = (typeof SKILLS)[number];
