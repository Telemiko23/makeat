import { DAYS, MEALS, WEEKEND, type Day, type Meal } from '../vocab';
import type { Catalog } from '../recipes/derive';
import { isAllowed, type GateOptions, type RecipeConstraints } from '../recipes/filter';
import type { Recipe } from '../recipes/types';

/** What the planner needs to know about a household. */
export type PlanInput = {
  constraints: RecipeConstraints;
  cookingDays: readonly Day[];
  mealsAtHome: { weekday: readonly Meal[]; weekend: readonly Meal[] };
  lunchboxesPerWeekday: number;
  festive: { fridayDinner: boolean; shabbatLunch: boolean };
  /** Adult-equivalent portions eaten at each home meal. */
  portionsPerMeal: number;
};

export type SlotKind = Meal | 'lunchbox';

export type Slot = {
  day: Day;
  kind: SlotKind;
  /** Null when no allowed recipe fits this slot. */
  recipeId: string | null;
  /** Adult-equivalent portions to prepare. */
  portions: number;
  /** The cooking day this slot is prepared on. */
  cookDay: Day;
  festive: boolean;
};

export type WeekPlan = { seed: number; slots: Slot[] };

/** Small deterministic generator, so a seed always rebuilds the same plan. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const isWeekend = (d: Day) => WEEKEND.includes(d);

/** The latest cooking day on or before `day`, wrapping to the previous week; the day itself if none. */
export function cookDayFor(day: Day, cookingDays: readonly Day[]): Day {
  if (!cookingDays.length) return day;
  const i = DAYS.indexOf(day);
  for (let k = 0; k < DAYS.length; k++) {
    const d = DAYS[(i - k + DAYS.length) % DAYS.length];
    if (cookingDays.includes(d)) return d;
  }
  return day;
}

/** The empty slots of a week, in day order, before recipes are chosen. */
export function weekSlots(input: PlanInput): Omit<Slot, 'recipeId'>[] {
  const slots: Omit<Slot, 'recipeId'>[] = [];
  for (const day of DAYS) {
    const meals = isWeekend(day) ? input.mealsAtHome.weekend : input.mealsAtHome.weekday;
    for (const meal of MEALS) {
      if (!meals.includes(meal)) continue;
      const festive =
        (day === 'fri' && meal === 'dinner' && input.festive.fridayDinner) ||
        (day === 'sat' && meal === 'lunch' && input.festive.shabbatLunch);
      slots.push({ day, kind: meal, portions: input.portionsPerMeal, cookDay: cookDayFor(day, input.cookingDays), festive });
    }
    if (!isWeekend(day) && input.lunchboxesPerWeekday > 0) {
      slots.push({ day, kind: 'lunchbox', portions: input.lunchboxesPerWeekday, cookDay: cookDayFor(day, input.cookingDays), festive: false });
    }
  }
  return slots;
}

/** Whether a recipe suits a slot's kind: the right meal, and never a side dish alone. */
const fitsSlot = (r: Recipe, kind: SlotKind) =>
  !r.tags.includes('side') && (kind === 'lunchbox' ? r.tags.includes('lunchbox') : r.meals.includes(kind));

/** Recipes that may fill a slot: allowed for the household, right meal, and never a side dish alone. */
export function candidatesFor(
  slot: Pick<Slot, 'kind'>,
  recipes: readonly Recipe[],
  catalog: Catalog,
  constraints: RecipeConstraints,
  gate: GateOptions = {},
): Recipe[] {
  return recipes.filter((r) => fitsSlot(r, slot.kind) && isAllowed(r, catalog, constraints, gate));
}

const festiveScore = (r: Recipe) => (r.tags.includes('festive') || r.tags.includes('shabbat') ? 1 : 0);

/**
 * Picks one candidate: festive dishes first for festive slots, then the
 * least-used recipe this week, then a seeded random choice.
 */
function pick(cands: readonly Recipe[], slot: Omit<Slot, 'recipeId'>, used: Map<string, number>, random: () => number, avoid?: string | null) {
  const pool = cands.length > 1 && avoid ? cands.filter((r) => r.id !== avoid) : cands;
  if (!pool.length) return null;
  const score = (r: Recipe) => (slot.festive ? festiveScore(r) * 100 : 0) - (used.get(r.id) ?? 0) * 10;
  const best = Math.max(...pool.map(score));
  const top = pool.filter((r) => score(r) === best);
  return top[Math.floor(random() * top.length)];
}

/** Builds a week of meals from allowed recipes only. Same input and seed, same plan. */
export function buildWeekPlan(
  input: PlanInput,
  recipes: readonly Recipe[],
  catalog: Catalog,
  seed: number,
  gate: GateOptions = {},
): WeekPlan {
  const random = rng(seed);
  const used = new Map<string, number>();
  // Run the gate once per recipe, not once per slot.
  const allowed = recipes.filter((r) => isAllowed(r, catalog, input.constraints, gate));
  const slots = weekSlots(input).map((slot) => {
    const chosen = pick(allowed.filter((r) => fitsSlot(r, slot.kind)), slot, used, random);
    if (chosen) used.set(chosen.id, (used.get(chosen.id) ?? 0) + 1);
    return { ...slot, recipeId: chosen?.id ?? null };
  });
  return { seed, slots };
}

/** Replaces one slot's recipe with a different allowed one, preferring recipes not yet in the week. */
export function swapSlot(
  plan: WeekPlan,
  index: number,
  input: PlanInput,
  recipes: readonly Recipe[],
  catalog: Catalog,
  random: () => number,
  gate: GateOptions = {},
): WeekPlan {
  const slot = plan.slots[index];
  if (!slot) return plan;
  const used = new Map<string, number>();
  plan.slots.forEach((s, i) => {
    if (i !== index && s.recipeId) used.set(s.recipeId, (used.get(s.recipeId) ?? 0) + 1);
  });
  const chosen = pick(candidatesFor(slot, recipes, catalog, input.constraints, gate), slot, used, random, slot.recipeId);
  const slots = plan.slots.slice();
  slots[index] = { ...slot, recipeId: chosen?.id ?? null };
  return { ...plan, slots };
}

/** How much to multiply a recipe's quantities by to feed `portions`. */
export const scaleFor = (recipe: Pick<Recipe, 'servings'>, portions: number) =>
  Math.round((portions / recipe.servings) * 100) / 100;

/**
 * Checks a plan kept from earlier against today's input, recipes and gate.
 * Returns null when the week's layout no longer matches (the caller builds a
 * new plan); otherwise the plan, with any slot whose recipe is gone or no
 * longer allowed (or that was empty) refilled. Unchanged plans come back as
 * the same object.
 */
export function refreshPlan(
  plan: WeekPlan,
  input: PlanInput,
  recipes: readonly Recipe[],
  catalog: Catalog,
  gate: GateOptions = {},
): WeekPlan | null {
  const layout = weekSlots(input);
  if (!Array.isArray(plan.slots) || plan.slots.length !== layout.length) return null;
  const same = layout.every((l, i) => {
    const s = plan.slots[i];
    return !!s && s.day === l.day && s.kind === l.kind && s.portions === l.portions && s.cookDay === l.cookDay && s.festive === l.festive;
  });
  if (!same) return null;
  const allowed = recipes.filter((r) => isAllowed(r, catalog, input.constraints, gate));
  const ok = (s: Slot) => s.recipeId !== null && allowed.some((r) => r.id === s.recipeId && fitsSlot(r, s.kind));
  const stale = plan.slots.map((s, i) => (ok(s) ? -1 : i)).filter((i) => i >= 0);
  if (!stale.length) return plan;
  const random = rng(plan.seed);
  const used = new Map<string, number>();
  plan.slots.forEach((s) => {
    if (ok(s)) used.set(s.recipeId!, (used.get(s.recipeId!) ?? 0) + 1);
  });
  const slots = plan.slots.map((s, i) => {
    if (!stale.includes(i)) return s;
    const chosen = pick(allowed.filter((r) => fitsSlot(r, s.kind)), s, used, random);
    if (chosen) used.set(chosen.id, (used.get(chosen.id) ?? 0) + 1);
    return { ...s, recipeId: chosen?.id ?? null };
  });
  if (slots.every((s, i) => s.recipeId === plan.slots[i].recipeId)) return plan;
  return { ...plan, slots };
}
