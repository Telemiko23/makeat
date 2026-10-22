import { DAYS, WEEKEND, type Household, type Member } from './household';

// Consumption relative to an adult portion. Initial estimates, to be
// calibrated with a dietitian (see the plan). Babies are planned separately.
export function portionFactor(m: Member): number {
  switch (m.kind) {
    case 'adult':
      return 1;
    case 'child':
      if (m.age <= 3) return 0.4;
      if (m.age <= 6) return 0.5;
      if (m.age <= 10) return 0.7;
      if (m.age <= 13) return 0.85;
      return 1;
    case 'baby':
      return 0;
  }
}

export type WeeklyPortions = {
  /** Adult-equivalent portions for meals eaten at home over a week. */
  homeMeals: number;
  /** Adult portions packed as lunchboxes over the weekdays. */
  lunchboxes: number;
  total: number;
  babies: number;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export function weeklyPortions(h: Household): WeeklyPortions {
  const perMeal = h.members.reduce((sum, m) => sum + portionFactor(m), 0);
  const weekendDays = WEEKEND.length;
  const weekdays = DAYS.length - weekendDays;
  const homeMeals =
    perMeal * (weekdays * h.mealsAtHome.weekday.length + weekendDays * h.mealsAtHome.weekend.length);
  const lunchboxes = weekdays * h.lunchboxesPerWeekday;
  return {
    homeMeals: round1(homeMeals),
    lunchboxes,
    total: round1(homeMeals + lunchboxes),
    babies: h.members.filter((m) => m.kind === 'baby').length,
  };
}
