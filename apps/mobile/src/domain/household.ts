// Household profile collected in onboarding. Stored on the device only.

// Vocabularies shared with recipe filtering, so profile ids and recipe rules can never drift.
import { ALLERGENS, APPLIANCES, DAYS, DIETS, KASHRUT, MEALS, SKILLS, WEEKEND } from '../../../../packages/shared/src/vocab';
import type { Allergen, Appliance, Day, Diet, Kashrut, Meal, Skill } from '../../../../packages/shared/src/vocab';

export { ALLERGENS, APPLIANCES, DAYS, DIETS, KASHRUT, MEALS, SKILLS, WEEKEND };
export type { Allergen, Appliance, Day, Diet, Kashrut, Meal, Skill };

export type MemberKind = 'adult' | 'child' | 'baby';
export type BabyStage = 'purees' | 'soft' | 'finger';

export type Member =
  | { id: string; kind: 'adult' }
  | { id: string; kind: 'child'; age: number } // years, 1-17
  | { id: string; kind: 'baby'; months: number; stage: BabyStage }; // 6-12 months

export const CHAINS = [
  'shufersal', 'ramiLevy', 'osherAd', 'victory', 'yochananof',
  'carrefour', 'tivTaam', 'haziHinam',
] as const;
export type Chain = (typeof CHAINS)[number];

/** How the household buys groceries; decides how baskets are quoted. */
export const SHOPPING_MODES = ['online', 'store', 'both'] as const;
export type ShoppingMode = (typeof SHOPPING_MODES)[number];

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
  /** Online quotes include the delivery fee; in-store quotes use shelf prices. Unset until answered. */
  shoppingMode: ShoppingMode | null;
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
  shoppingMode: null,
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
      if (!h.shoppingMode) return 'errors.needShoppingMode';
      return h.chains.length === 0 ? 'errors.needChain' : null;
    default:
      return null;
  }
}

const oneOf = <T extends string>(allowed: readonly T[], v: unknown, fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback;
const subsetOf = <T extends string>(allowed: readonly T[], v: unknown, fallback: T[]): T[] =>
  Array.isArray(v) ? allowed.filter((a) => v.includes(a)) : fallback;
const intIn = (v: unknown, min: number, max: number, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback;
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

function normalizeMember(v: unknown, index: number): Member | null {
  const m = obj(v);
  const id = typeof m.id === 'string' && m.id ? m.id : `m${index}`;
  switch (m.kind) {
    case 'adult':
      return { id, kind: 'adult' };
    case 'child':
      return { id, kind: 'child', age: intIn(m.age, 1, 17, 5) };
    case 'baby':
      return { id, kind: 'baby', months: intIn(m.months, 6, 12, 8), stage: oneOf(['purees', 'soft', 'finger'], m.stage, 'soft') };
    default:
      return null;
  }
}

/**
 * Rebuilds a household from stored data field by field: unknown values are
 * dropped, numbers are clamped, and missing fields (including nested ones added
 * in later versions) take their defaults.
 */
export function normalizeHousehold(raw: unknown): Household {
  const d = emptyHousehold();
  const h = obj(raw);
  const meals = obj(h.mealsAtHome);
  const festive = obj(h.festive);
  const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
  const members = Array.isArray(h.members)
    ? h.members.map(normalizeMember).filter((m): m is Member => m !== null).slice(0, MAX_MEMBERS)
    : d.members;
  const ids = new Set<string>();
  const uniqueMembers = members.map((m, i) => {
    const id = ids.has(m.id) ? `${m.id}-${i}` : m.id;
    ids.add(id);
    return { ...m, id };
  });
  const chains = subsetOf(CHAINS, h.chains, d.chains);
  const diets = subsetOf(DIETS, h.diets, d.diets);
  return {
    members: uniqueMembers,
    cookingDays: subsetOf(DAYS, h.cookingDays, d.cookingDays),
    mealsAtHome: {
      weekday: subsetOf(MEALS, meals.weekday, d.mealsAtHome.weekday),
      weekend: subsetOf(MEALS, meals.weekend, d.mealsAtHome.weekend),
    },
    lunchboxesPerWeekday: intIn(h.lunchboxesPerWeekday, 0, MAX_LUNCHBOXES, d.lunchboxesPerWeekday),
    festive: {
      fridayDinner: bool(festive.fridayDinner, d.festive.fridayDinner),
      shabbatLunch: bool(festive.shabbatLunch, d.festive.shabbatLunch),
      holidays: bool(festive.holidays, d.festive.holidays),
    },
    kashrut: oneOf(KASHRUT, h.kashrut, d.kashrut),
    diets: diets.includes('vegan') && !diets.includes('vegetarian') ? ['vegetarian', 'vegan'] : diets,
    allergens: subsetOf(ALLERGENS, h.allergens, d.allergens),
    dislikes: Array.isArray(h.dislikes)
      ? h.dislikes.reduce<string[]>((list, x) => (typeof x === 'string' ? addDislike(list, x) : list), [])
      : d.dislikes,
    appliances: subsetOf(APPLIANCES, h.appliances, d.appliances),
    skill: oneOf(SKILLS, h.skill, d.skill),
    shoppingMode: SHOPPING_MODES.includes(h.shoppingMode as ShoppingMode) ? (h.shoppingMode as ShoppingMode) : null,
    chains,
    loyaltyClubs: subsetOf(CHAINS, h.loyaltyClubs, d.loyaltyClubs).filter((c) => chains.includes(c)),
  };
}

/** The first step whose answers are incomplete, with its error key. */
export function firstProblem(h: Household): { step: StepId; error: string } | null {
  for (const step of STEPS) {
    const error = stepError(h, step);
    if (error) return { step, error };
  }
  return null;
}
