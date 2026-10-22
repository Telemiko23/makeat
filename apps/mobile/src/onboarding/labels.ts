import type { TFunction } from 'i18next';
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

export const childAge = (t: TFunction, years: number) => t('onboarding.household.ageValue', { count: years });
export const babyAge = (t: TFunction, months: number) => t('onboarding.household.monthsValue', { n: months });

/** "Child 2: 5 years" or "Baby: 8 months, soft food"; just the name for adults. */
export function memberLine(m: Member, name: string, t: TFunction): string {
  if (m.kind === 'adult') return name;
  const details =
    m.kind === 'child' ? childAge(t, m.age) : joinList(t, [babyAge(t, m.months), t(`onboarding.household.stages.${m.stage}`)]);
  return t('onboarding.summary.member', { name, details });
}

export const joinList = (t: TFunction, items: readonly string[]) => items.join(t('format.listSeparator'));

/** Joins translated items, or returns "None" for an empty list. */
export function listOf(t: TFunction, group: string, items: readonly string[]): string {
  return items.length ? joinList(t, items.map((i) => t(`${group}.${i}`))) : t('common.none');
}

export const labelValue = (t: TFunction, label: string, value: string) => t('format.labelValue', { label, value });
