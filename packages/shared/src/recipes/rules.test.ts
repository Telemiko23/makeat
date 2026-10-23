import { describe, expect, it } from 'vitest';
import { catalogOf, isVegan, isVegetarian, recipeAllergens, recipeClass } from './derive';
import { exclusions, isAllowed, type RecipeConstraints } from './filter';
import type { Ingredient, Recipe } from './types';
import { validateCatalog, validateRecipe } from './validate';

const ing = (id: string, he: string, patch: Partial<Ingredient> = {}): Ingredient => ({
  id, name: { he }, class: 'parve', animal: [], allergens: [], units: ['g'], ...patch,
});

const items: Ingredient[] = [
  ing('flour', 'קמח', { allergens: ['gluten'] }),
  ing('tomato', 'עגבנייה'),
  ing('eggplant', 'חציל'),
  ing('eggs', 'ביצים', { animal: ['egg'], allergens: ['eggs'] }),
  ing('milk', 'חלב', { class: 'dairy', animal: ['dairy'], allergens: ['milk'], substitutes: [{ id: 'tomato', ratio: 1, reasons: ['dairyFree'] }] }),
  ing('beef', 'בקר', { class: 'meat', animal: ['meat'] }),
  ing('salmon', 'סלמון', { class: 'fish', animal: ['fish'], allergens: ['fish'] }),
  ing('honey', 'דבש', { animal: ['honey'] }),
  ing('shrimp', 'שרימפס', { allergens: ['crustaceans'], kosherSpecies: false }),
  ing('sesame', 'טחינה', { allergens: ['sesame'] }),
];
const catalog = catalogOf(items);

const recipe = (ids: string[], patch: Partial<Recipe> = {}): Recipe => ({
  id: 'r', status: 'draft', title: { he: 'מתכון' }, summary: { he: 'תיאור' }, servings: 4,
  prepMinutes: 5, cookMinutes: 5, difficulty: 'easy', meals: ['dinner'], tags: [], appliances: [],
  ingredients: ids.map((id) => ({ id, qty: 1, unit: 'g' as const })),
  steps: [{ text: { he: 'מבשלים' } }],
  ...patch,
});

const open: RecipeConstraints = { allergens: [], diets: [], kashrut: 'none', appliances: [], skill: 'confident', dislikes: [] };

describe('derived facts', () => {
  it('collects allergens in canonical order, optional ingredients included', () => {
    const r = recipe(['sesame', 'flour']);
    r.ingredients[0].optional = true;
    expect(recipeAllergens(r, catalog)).toEqual(['gluten', 'sesame']);
  });
  it('classifies meat over dairy over fish over parve', () => {
    expect(recipeClass(recipe(['tomato', 'eggs']), catalog)).toBe('parve');
    expect(recipeClass(recipe(['tomato', 'salmon']), catalog)).toBe('fish');
    expect(recipeClass(recipe(['salmon', 'milk']), catalog)).toBe('dairy');
    expect(recipeClass(recipe(['beef', 'tomato']), catalog)).toBe('meat');
  });
  it('eggs and honey are vegetarian but not vegan; fish is neither', () => {
    expect(isVegetarian(recipe(['eggs', 'honey']), catalog)).toBe(true);
    expect(isVegan(recipe(['eggs']), catalog)).toBe(false);
    expect(isVegan(recipe(['honey']), catalog)).toBe(false);
    expect(isVegetarian(recipe(['salmon']), catalog)).toBe(false);
    expect(isVegan(recipe(['tomato', 'flour']), catalog)).toBe(true);
  });
  it('throws on an unknown ingredient instead of guessing', () => {
    expect(() => recipeAllergens(recipe(['mystery']), catalog)).toThrow(/unknown ingredient/);
  });
});

describe('filter', () => {
  it('allows a recipe that breaks nothing', () => expect(isAllowed(recipe(['tomato']), catalog, open)).toBe(true));

  it('excludes any recipe with a household allergen, and only those', () => {
    expect(exclusions(recipe(['flour', 'eggs']), catalog, { ...open, allergens: ['eggs', 'fish'] })).toEqual([
      { rule: 'allergen', allergens: ['eggs'] },
    ]);
    expect(isAllowed(recipe(['tomato']), catalog, { ...open, allergens: ['eggs', 'fish'] })).toBe(true);
  });

  it('excludes non-kosher species for every kashrut level except none', () => {
    const r = recipe(['shrimp']);
    expect(isAllowed(r, catalog, open)).toBe(true);
    for (const kashrut of ['style', 'certified', 'mehadrin'] as const) {
      expect(exclusions(r, catalog, { ...open, kashrut })).toEqual([{ rule: 'kashrut' }]);
    }
    expect(isAllowed(recipe(['beef']), catalog, { ...open, kashrut: 'mehadrin' })).toBe(true);
  });

  it('applies vegetarian and vegan', () => {
    expect(exclusions(recipe(['salmon']), catalog, { ...open, diets: ['vegetarian'] })).toEqual([{ rule: 'diet', diet: 'vegetarian' }]);
    expect(isAllowed(recipe(['eggs']), catalog, { ...open, diets: ['vegetarian'] })).toBe(true);
    expect(exclusions(recipe(['eggs']), catalog, { ...open, diets: ['vegetarian', 'vegan'] })).toEqual([{ rule: 'diet', diet: 'vegan' }]);
    expect(isAllowed(recipe(['tomato']), catalog, { ...open, diets: ['vegetarian', 'vegan'] })).toBe(true);
  });

  it('needs every appliance the recipe uses', () => {
    const r = recipe(['tomato'], { appliances: ['oven', 'blender'] });
    expect(exclusions(r, catalog, { ...open, appliances: ['oven'] })).toEqual([{ rule: 'appliance', missing: ['blender'] }]);
    expect(isAllowed(r, catalog, { ...open, appliances: ['oven', 'blender', 'grill'] })).toBe(true);
  });

  it('matches difficulty to skill', () => {
    const medium = recipe(['tomato'], { difficulty: 'medium' });
    expect(isAllowed(medium, catalog, { ...open, skill: 'beginner' })).toBe(false);
    expect(isAllowed(medium, catalog, { ...open, skill: 'home' })).toBe(true);
    expect(isAllowed(recipe(['tomato'], { difficulty: 'hard' }), catalog, { ...open, skill: 'home' })).toBe(false);
  });

  it('matches dislikes either way round and ignores blanks', () => {
    const r = recipe(['eggplant', 'tomato']);
    expect(exclusions(r, catalog, { ...open, dislikes: ['חצילים'] })).toEqual([{ rule: 'dislike', ingredients: ['eggplant'] }]);
    expect(isAllowed(r, catalog, { ...open, dislikes: ['  ', 'כוסברה'] })).toBe(true);
  });

  it('reports every broken rule at once', () => {
    const r = recipe(['beef', 'sesame'], { appliances: ['grill'], difficulty: 'hard' });
    const rules = exclusions(r, catalog, { ...open, allergens: ['sesame'], diets: ['vegetarian'], skill: 'beginner' }).map((x) => x.rule);
    expect(rules).toEqual(['allergen', 'diet', 'appliance', 'skill']);
  });
});

describe('validation', () => {
  it('accepts the fixture catalog', () => expect(validateCatalog(items)).toEqual([]));

  it('rejects class and allergen facts that contradict the source', () => {
    const errors = validateCatalog([
      ing('cheese', 'גבינה', { animal: ['dairy'] }),
      ing('tuna', 'טונה', { class: 'fish', animal: ['fish'] }),
      ing('onion', 'בצל', { units: ['pcs'] }),
      ing('x', 'x'),
    ]);
    expect(errors).toEqual([
      'ingredient cheese: class "dairy" exactly when made from dairy',
      'ingredient cheese: dairy must carry the milk allergen',
      'ingredient tuna: fish must carry the fish allergen',
      'ingredient onion: counted in pieces but has no gramsPerPiece',
      'ingredient x: needs a Hebrew name',
    ]);
  });

  it('rejects meat with dairy and meat with fish', () => {
    expect(validateRecipe(recipe(['beef', 'milk']), catalog)).toContain('recipe r: mixes meat and dairy');
    expect(validateRecipe(recipe(['beef', 'salmon']), catalog)).toContain('recipe r: mixes meat and fish');
    expect(validateRecipe(recipe(['salmon', 'milk']), catalog)).toEqual([]);
  });

  it('rejects unknown ingredients, wrong units and missing Hebrew', () => {
    const r = recipe(['tomato', 'nope'], { title: { he: 'Pasta' } });
    r.ingredients[0].unit = 'pcs';
    expect(validateRecipe(r, catalog)).toEqual([
      'recipe r: needs a Hebrew title',
      'recipe r: tomato: unit "pcs" not allowed (use g)',
      'recipe r: unknown ingredient "nope"',
    ]);
  });
});
