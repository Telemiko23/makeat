import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Button, Card, ErrorText, H1, H2, P, Screen } from '../../components/ui';
import { STEPS, stepError, type StepId } from '../../domain/household';
import { weeklyPortions } from '../../domain/portions';
import { counted } from '../../i18n';
import { listOf, memberAge, memberNames } from '../../onboarding/labels';
import { useHousehold } from '../../state/household';

export default function Summary() {
  const { t } = useTranslation();
  const { ready, household: h, complete } = useHousehold();
  const [error, setError] = useState<string | null>(null);
  if (!ready) return null;

  const portions = weeklyPortions(h);
  const names = memberNames(h.members, t);
  const festive = (['fridayDinner', 'shabbatLunch', 'holidays'] as const).filter((k) => h.festive[k]);

  const save = () => {
    const problem = STEPS.map((s) => stepError(h, s)).find((e) => e);
    if (problem) return setError(problem);
    complete();
    router.dismissTo('/');
  };

  return (
    <Screen
      footer={
        <>
          {error ? <ErrorText>{t(error)}</ErrorText> : null}
          <Button label={t('onboarding.summary.save')} onPress={save} />
          <Button kind="link" label={t('common.back')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/onboarding/shopping'))} />
        </>
      }
    >
      <H1>{t('onboarding.summary.title')}</H1>
      <P muted>{t('onboarding.summary.hint')}</P>

      <Card>
        <H2>{t('onboarding.summary.portions', { total: portions.total })}</H2>
        <P muted>{t('onboarding.summary.portionsDetail', { homeMeals: portions.homeMeals, lunchboxes: portions.lunchboxes })}</P>
        {portions.babies ? <P muted>{counted(t, 'onboarding.summary.babies', portions.babies)}</P> : null}
      </Card>

      <Block step="household">
        {h.members.map((m, i) => {
          const age = memberAge(m, t);
          const stage = m.kind === 'baby' ? `, ${t(`onboarding.household.stages.${m.stage}`)}` : '';
          return <P key={m.id}>{age ? `${names[i]}: ${age}${stage}` : names[i]}</P>;
        })}
      </Block>

      <Block step="week">
        <Line label={t('onboarding.summary.cookingDays')} value={listOf(t, 'daysLong', h.cookingDays)} />
        <Line label={t('onboarding.summary.weekday')} value={listOf(t, 'meals', h.mealsAtHome.weekday)} />
        <Line label={t('onboarding.summary.weekend')} value={listOf(t, 'meals', h.mealsAtHome.weekend)} />
        <Line label={t('onboarding.summary.lunchboxes')} value={String(h.lunchboxesPerWeekday)} />
        <Line label={t('onboarding.summary.festive')} value={listOf(t, 'onboarding.week', festive)} />
      </Block>

      <Block step="food">
        <Line label={t('onboarding.food.kashrut')} value={t(`kashrut.${h.kashrut}`)} />
        <Line label={t('onboarding.food.diets')} value={listOf(t, 'diets', h.diets)} />
        <Line label={t('onboarding.food.allergens')} value={listOf(t, 'allergens', h.allergens)} />
        <Line label={t('onboarding.summary.dislikes')} value={h.dislikes.length ? h.dislikes.join(', ') : t('common.none')} />
      </Block>

      <Block step="kitchen">
        <P>{listOf(t, 'appliances', h.appliances)}</P>
        <Line label={t('onboarding.kitchen.skill')} value={t(`skills.${h.skill}`)} />
      </Block>

      <Block step="shopping">
        <P>{listOf(t, 'chains', h.chains)}</P>
        <Line label={t('onboarding.summary.clubs')} value={listOf(t, 'chains', h.loyaltyClubs)} />
      </Block>
    </Screen>
  );
}

function Block({ step, children }: { step: StepId; children: ReactNode }) {
  const { t } = useTranslation();
  const title = t(`onboarding.${step}.title`);
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <H2>{title}</H2>
        <Button
          kind="link"
          label={t('common.edit')}
          accessibilityLabel={`${t('common.edit')}: ${title}`}
          onPress={() => router.push({ pathname: '/onboarding/[step]', params: { step, from: 'summary' } })}
        />
      </View>
      {children}
    </Card>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return <P>{`${label}: ${value}`}</P>;
}
