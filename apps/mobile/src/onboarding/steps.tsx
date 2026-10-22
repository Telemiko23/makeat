import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Button, Card, Chip, Chips, Counter, H2, Input, P, RemovableTag, Section } from '../components/ui';
import {
  ALLERGENS,
  APPLIANCES,
  CHAINS,
  DAYS,
  DIETS,
  KASHRUT,
  MAX_DISLIKE_LENGTH,
  MAX_LUNCHBOXES,
  MAX_MEMBERS,
  MEALS,
  SHOPPING_MODES,
  SKILLS,
  addDislike,
  setChains,
  toggle,
  toggleDiet,
  type BabyStage,
  type Household,
  type Member,
} from '../domain/household';
import { spacing } from '../theme/tokens';
import { babyAge, childAge, memberNames } from './labels';

type StepProps = { household: Household; update: (fn: (h: Household) => Household) => void };

type NewMember = Member extends infer M ? (M extends Member ? Omit<M, 'id'> : never) : never;

const STAGES: readonly BabyStage[] = ['purees', 'soft', 'finger'];

let idSeq = 0;
const newId = () => `${Date.now().toString(36)}-${(idSeq++).toString(36)}`;

function replaceMember(h: Household, id: string, fn: (m: Member) => Member): Household {
  return { ...h, members: h.members.map((m) => (m.id === id ? fn(m) : m)) };
}

export function HouseholdStep({ household, update }: StepProps) {
  const { t } = useTranslation();
  const names = memberNames(household.members, t);
  const full = household.members.length >= MAX_MEMBERS;
  const add = (m: NewMember) =>
    update((h) => (h.members.length >= MAX_MEMBERS ? h : { ...h, members: [...h.members, { ...m, id: newId() }] }));

  return (
    <>
      <P muted>{t('onboarding.household.hint')}</P>
      <View style={{ gap: spacing.sm }}>
        {household.members.length === 0 ? <P muted>{t('onboarding.household.empty')}</P> : null}
        {household.members.map((m, i) => (
          <Card key={m.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <H2>{names[i]}</H2>
              <Button
                kind="link"
                label={t('common.remove')}
                accessibilityLabel={t('onboarding.household.removeMember', { name: names[i] })}
                onPress={() => update((h) => ({ ...h, members: h.members.filter((x) => x.id !== m.id) }))}
              />
            </View>
            {m.kind === 'child' ? (
              <Counter
                label={t('onboarding.household.age')}
                value={m.age}
                min={1}
                max={17}
                format={(n) => childAge(t, n)}
                decLabel={t('common.decrease')}
                incLabel={t('common.increase')}
                onChange={(age) => update((h) => replaceMember(h, m.id, (x) => (x.kind === 'child' ? { ...x, age } : x)))}
              />
            ) : null}
            {m.kind === 'baby' ? (
              <>
                <Counter
                  label={t('onboarding.household.months')}
                  value={m.months}
                  min={6}
                  max={12}
                  format={(n) => babyAge(t, n)}
                  decLabel={t('common.decrease')}
                  incLabel={t('common.increase')}
                  onChange={(months) => update((h) => replaceMember(h, m.id, (x) => (x.kind === 'baby' ? { ...x, months } : x)))}
                />
                <P muted>{t('onboarding.household.stage')}</P>
                <Chips>
                  {STAGES.map((stage) => (
                    <Chip
                      key={stage}
                      single
                      label={t(`onboarding.household.stages.${stage}`)}
                      selected={m.stage === stage}
                      onPress={() => update((h) => replaceMember(h, m.id, (x) => (x.kind === 'baby' ? { ...x, stage } : x)))}
                    />
                  ))}
                </Chips>
              </>
            ) : null}
          </Card>
        ))}
      </View>
      <Section title={t('onboarding.household.addTitle')} hint={full ? t('onboarding.household.full') : undefined}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <Button kind="secondary" disabled={full} label={t('common.addItem', { name: t('onboarding.household.addAdult') })} onPress={() => add({ kind: 'adult' })} />
          <Button kind="secondary" disabled={full} label={t('common.addItem', { name: t('onboarding.household.addChild') })} onPress={() => add({ kind: 'child', age: 5 })} />
          <Button
            kind="secondary"
            disabled={full}
            label={t('common.addItem', { name: t('onboarding.household.addBaby') })}
            onPress={() => add({ kind: 'baby', months: 8, stage: 'soft' })}
          />
        </View>
      </Section>
    </>
  );
}

export function WeekStep({ household: h, update }: StepProps) {
  const { t } = useTranslation();
  return (
    <>
      <Section title={t('onboarding.week.cookingDays')}>
        <Chips>
          {DAYS.map((d) => (
            <Chip key={d} label={t(`daysLong.${d}`)} selected={h.cookingDays.includes(d)} onPress={() => update((x) => ({ ...x, cookingDays: toggle(x.cookingDays, d) }))} />
          ))}
        </Chips>
      </Section>
      {(['weekday', 'weekend'] as const).map((part) => (
        <Section key={part} title={t(part === 'weekday' ? 'onboarding.week.weekdayMeals' : 'onboarding.week.weekendMeals')}>
          <Chips>
            {MEALS.map((meal) => (
              <Chip
                key={meal}
                label={t(`meals.${meal}`)}
                selected={h.mealsAtHome[part].includes(meal)}
                onPress={() => update((x) => ({ ...x, mealsAtHome: { ...x.mealsAtHome, [part]: toggle(x.mealsAtHome[part], meal) } }))}
              />
            ))}
          </Chips>
        </Section>
      ))}
      <Section title={t('onboarding.week.lunchboxes')} hint={t('onboarding.week.lunchboxesHint')}>
        <Counter
          label={t('onboarding.summary.lunchboxes')}
          value={h.lunchboxesPerWeekday}
          min={0}
          max={MAX_LUNCHBOXES}
          decLabel={t('common.decrease')}
          incLabel={t('common.increase')}
          onChange={(n) => update((x) => ({ ...x, lunchboxesPerWeekday: n }))}
        />
      </Section>
      <Section title={t('onboarding.week.festive')}>
        <Chips>
          {(['fridayDinner', 'shabbatLunch', 'holidays'] as const).map((k) => (
            <Chip
              key={k}
              label={t(`onboarding.week.${k}`)}
              selected={h.festive[k]}
              onPress={() => update((x) => ({ ...x, festive: { ...x.festive, [k]: !x.festive[k] } }))}
            />
          ))}
        </Chips>
      </Section>
    </>
  );
}

export function FoodStep({ household: h, update }: StepProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');
  const submit = () => {
    update((x) => ({ ...x, dislikes: addDislike(x.dislikes, draft) }));
    setDraft('');
  };
  return (
    <>
      <Section title={t('onboarding.food.kashrut')}>
        <Chips>
          {KASHRUT.map((k) => (
            <Chip key={k} single label={t(`kashrut.${k}`)} selected={h.kashrut === k} onPress={() => update((x) => ({ ...x, kashrut: k }))} />
          ))}
        </Chips>
      </Section>
      <Section title={t('onboarding.food.diets')}>
        <Chips>
          {DIETS.map((d) => (
            <Chip key={d} label={t(`diets.${d}`)} selected={h.diets.includes(d)} onPress={() => update((x) => ({ ...x, diets: toggleDiet(x.diets, d) }))} />
          ))}
        </Chips>
      </Section>
      <Section title={t('onboarding.food.allergens')} hint={t('onboarding.food.allergensHint')}>
        <Chips>
          {ALLERGENS.map((a) => (
            <Chip key={a} label={t(`allergens.${a}`)} selected={h.allergens.includes(a)} onPress={() => update((x) => ({ ...x, allergens: toggle(x.allergens, a) }))} />
          ))}
        </Chips>
      </Section>
      <Section title={t('onboarding.food.dislikes')} hint={t('onboarding.food.dislikesHint')}>
        <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Input
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={submit}
              maxLength={MAX_DISLIKE_LENGTH}
              placeholder={t('onboarding.food.dislikePlaceholder')}
              accessibilityLabel={t('onboarding.food.dislikes')}
              returnKeyType="done"
              submitBehavior="submit"
            />
          </View>
          <Button kind="secondary" label={t('onboarding.food.addDislike')} disabled={!draft.trim()} onPress={submit} />
        </View>
        {h.dislikes.length ? (
          <Chips>
            {h.dislikes.map((d) => (
              <RemovableTag
                key={d}
                label={d}
                removeLabel={t('onboarding.food.removeDislike', { name: d })}
                onRemove={() => update((x) => ({ ...x, dislikes: x.dislikes.filter((y) => y !== d) }))}
              />
            ))}
          </Chips>
        ) : null}
      </Section>
    </>
  );
}

export function KitchenStep({ household: h, update }: StepProps) {
  const { t } = useTranslation();
  return (
    <>
      <Section title={t('onboarding.kitchen.appliances')}>
        <Chips>
          {APPLIANCES.map((a) => (
            <Chip key={a} label={t(`appliances.${a}`)} selected={h.appliances.includes(a)} onPress={() => update((x) => ({ ...x, appliances: toggle(x.appliances, a) }))} />
          ))}
        </Chips>
      </Section>
      <Section title={t('onboarding.kitchen.skill')}>
        <Chips>
          {SKILLS.map((s) => (
            <Chip key={s} single label={t(`skills.${s}`)} selected={h.skill === s} onPress={() => update((x) => ({ ...x, skill: s }))} />
          ))}
        </Chips>
      </Section>
    </>
  );
}

export function ShoppingStep({ household: h, update }: StepProps) {
  const { t } = useTranslation();
  return (
    <>
      <Section title={t('onboarding.shopping.mode')} hint={h.shoppingMode ? t(`onboarding.shopping.modeHints.${h.shoppingMode}`) : undefined}>
        <Chips>
          {SHOPPING_MODES.map((m) => (
            <Chip key={m} single label={t(`onboarding.shopping.modes.${m}`)} selected={h.shoppingMode === m} onPress={() => update((x) => ({ ...x, shoppingMode: m }))} />
          ))}
        </Chips>
      </Section>
      <Section title={t('onboarding.shopping.chains')}>
        <Chips>
          {CHAINS.map((c) => (
            <Chip key={c} label={t(`chains.${c}`)} selected={h.chains.includes(c)} onPress={() => update((x) => setChains(x, toggle(x.chains, c)))} />
          ))}
        </Chips>
      </Section>
      <Section title={t('onboarding.shopping.clubs')} hint={t('onboarding.shopping.clubsHint')}>
        {h.chains.length === 0 ? (
          <P muted>{t('onboarding.shopping.clubsEmpty')}</P>
        ) : (
          <Chips>
            {CHAINS.filter((c) => h.chains.includes(c)).map((c) => (
              <Chip
                key={c}
                label={t(`chains.${c}`)}
                accessibilityLabel={t('onboarding.shopping.clubLabel', { name: t(`chains.${c}`) })}
                selected={h.loyaltyClubs.includes(c)}
                onPress={() => update((x) => ({ ...x, loyaltyClubs: toggle(x.loyaltyClubs, c) }))}
              />
            ))}
          </Chips>
        )}
      </Section>
    </>
  );
}
