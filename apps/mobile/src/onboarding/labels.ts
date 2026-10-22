import type { TFunction } from 'i18next';
import { counted } from '../i18n';
import type { Member } from '../domain/household';

/** "Child", or "Child 2" when there is more than one member of that kind. */
export function memberNames(members: readonly Member[], t: TFunction): string[] {
  const totals = new Map<Member['kind'], number>();
  for (const m of members) totals.set(m.kind, (totals.get(m.kind) ?? 0) + 1);
  const seen = new Map<Member['kind'], number>();
  return members.map((m) => {
    const n = (seen.get(m.kind) ?? 0) + 1;
    seen.set(m.kind, n);
    const base = t(`onboarding.household.${m.kind}`);
    return totals.get(m.kind)! > 1 ? `${base} ${n}` : base;
  });
}

/** Short description of a member's age, e.g. "5 years" or "8 months". */
export function memberAge(m: Member, t: TFunction): string | null {
  if (m.kind === 'child') return counted(t, 'onboarding.household.ageValue', m.age);
  if (m.kind === 'baby') return t('onboarding.household.monthsValue', { n: m.months });
  return null;
}

/** Joins translated items, or returns "None" for an empty list. */
export function listOf(t: TFunction, group: string, items: readonly string[]): string {
  return items.length ? items.map((i) => t(`${group}.${i}`)).join(', ') : t('common.none');
}
