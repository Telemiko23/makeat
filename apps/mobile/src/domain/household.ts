// Household profile collected in onboarding. Stored on the device only.

export type MemberKind = 'adult' | 'child' | 'baby';
export type BabyStage = 'purees' | 'soft' | 'finger';

export type Member =
  | { id: string; kind: 'adult' }
  | { id: string; kind: 'child'; age: number } // years, 1-17
  | { id: string; kind: 'baby'; months: number; stage: BabyStage }; // 6-12 months

export const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
export type Day = (typeof DAYS)[number];
export const WEEKEND: readonly Day[] = ['fri', 'sat'];

export const MEALS = ['breakfast', 'lunch', 'dinner'] as const;
export type Meal = (typeof MEALS)[number];

export const KASHRUT = ['none', 'style', 'certified', 'mehadrin'] as const;
export type Kashrut = (typeof KASHRUT)[number];

export const DIETS = ['vegetarian', 'vegan'] as const;
export type Diet = (typeof DIETS)[number];

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

export const SKILLS = ['beginner', 'home', 'confident'] as const;
export type Skill = (typeof SKILLS)[number];

export const CHAINS = [
  'shufersal', 'ramiLevy', 'osherAd', 'victory', 'yochananof',
  'carrefour', 'tivTaam', 'haziHinam',
] as const;
export type Chain = (typeof CHAINS)[number];

export type Household = {
  members: Member[];
  cookingDays: Day[];
  /** Meals eaten at home, for weekdays (sun-thu) and the weekend (fri-sat). */
  mealsAtHome: { weekday: Meal[]; weekend: Meal[] };
  /** Lunchboxes to prepare per weekday (sun-thu). */
  lunchboxesPerWeekday: number;
  festive: { fridayDinner: boolean; shabbatLunch: boolean; holidays: boolean };
  kashrut: Kashrut;
  diets: Diet[];
  allergens: Allergen[];
  dislikes: string[];
  appliances: Appliance[];
  skill: Skill;
  chains: Chain[];
  /** Chains whose loyalty club the household belongs to (subset of `chains`). */
  loyaltyClubs: Chain[];
};

export const emptyHousehold = (): Household => ({
  members: [],
  cookingDays: ['sun', 'tue', 'thu'],
  mealsAtHome: { weekday: ['dinner'], weekend: ['lunch', 'dinner'] },
  lunchboxesPerWeekday: 0,
  festive: { fridayDinner: true, shabbatLunch: false, holidays: false },
  kashrut: 'none',
  diets: [],
  allergens: [],
  dislikes: [],
  appliances: ['oven', 'stovetop'],
  skill: 'home',
  chains: [],
  loyaltyClubs: [],
});

export const MAX_MEMBERS = 12;
export const MAX_LUNCHBOXES = 6;
export const MAX_DISLIKE_LENGTH = 40;

export function toggle<T>(list: readonly T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

/** Adds a dislike after trimming; ignores blanks, duplicates (case-insensitive) and over-long text. */
export function addDislike(list: readonly string[], raw: string): string[] {
  const value = raw.trim().replace(/\s+/g, ' ');
  if (!value || value.length > MAX_DISLIKE_LENGTH) return [...list];
  if (list.some((d) => d.toLocaleLowerCase() === value.toLocaleLowerCase())) return [...list];
  return [...list, value];
}

/** Keeps loyalty clubs consistent with the selected chains. */
export function setChains(h: Household, chains: Chain[]): Household {
  return { ...h, chains, loyaltyClubs: h.loyaltyClubs.filter((c) => chains.includes(c)) };
}

/** Vegan implies vegetarian; selecting vegan keeps the list consistent. */
export function toggleDiet(diets: readonly Diet[], diet: Diet): Diet[] {
  const next = toggle(diets, diet);
  if (diet === 'vegan' && next.includes('vegan') && !next.includes('vegetarian')) return ['vegetarian', 'vegan'];
  if (diet === 'vegetarian' && !next.includes('vegetarian')) return next.filter((d) => d !== 'vegan');
  return next;
}

export type StepId = 'household' | 'week' | 'food' | 'kitchen' | 'shopping';
export const STEPS: readonly StepId[] = ['household', 'week', 'food', 'kitchen', 'shopping'];

/** Returns the i18n key of the first problem that blocks leaving a step, or null. */
export function stepError(h: Household, step: StepId): string | null {
  switch (step) {
    case 'household':
      return h.members.some((m) => m.kind === 'adult') ? null : 'errors.needAdult';
    case 'week':
      if (h.cookingDays.length === 0) return 'errors.needCookingDay';
      if (h.mealsAtHome.weekday.length + h.mealsAtHome.weekend.length + h.lunchboxesPerWeekday === 0)
        return 'errors.needMeal';
      return null;
    case 'kitchen':
      return h.appliances.length === 0 ? 'errors.needAppliance' : null;
    case 'shopping':
      return h.chains.length === 0 ? 'errors.needChain' : null;
    default:
      return null;
  }
}
