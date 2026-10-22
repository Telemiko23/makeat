import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Button, Card, ErrorText, H1, H2, P, Screen } from '../../components/ui';
import { firstProblem, type StepId } from '../../domain/household';
import { weeklyPortions } from '../../domain/portions';
import { joinList, labelValue, listOf, memberLine, memberNames } from '../../onboarding/labels';
import { useHousehold } from '../../state/household';

export default function Summary() {
  const { t } = useTranslation();
  const { ready, draft: h, save } = useHousehold();
  const [attempted, setAttempted] = useState(false);
  if (!ready) return null;

  // Recomputed on every render, so a fixed problem clears on return from editing.
  const error = attempted ? (firstProblem(h)?.error ?? null) : null;

  const portions = weeklyPortions(h);
  const names = memberNames(h.members, t);
  const festive = (['fridayDinner', 'shabbatLunch', 'holidays'] as const).filter((k) => h.festive[k]);

  const onSave = () => {
    if (save()) return setAttempted(true);
    router.dismissTo('/');
  };

  return (
    <Screen
      footer={
        <>
          {error ? <ErrorText>{t(error)}</ErrorText> : null}
          <Button label={t('onboarding.summary.save')} onPress={onSave} />
          <Button kind="link" label={t('common.back')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/onboarding/shopping'))} />
        </>
      }
    >
      <H1>{t('onboarding.summary.title')}</H1>
      <P muted>{t('onboarding.summary.hint')}</P>

      <Card>
        <H2>{t('onboarding.summary.portions', { total: portions.total })}</H2>
        <P muted>{t('onboarding.summary.portionsDetail', { homeMeals: portions.homeMeals, lunchboxes: portions.lunchboxes })}</P>
        {portions.babies ? <P muted>{t('onboarding.summary.babies', { count: portions.babies })}</P> : null}
      </Card>

      <Block step="household">
        {h.members.map((m, i) => (
          <P key={m.id}>{memberLine(m, names[i], t)}</P>
        ))}
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
        <Line label={t('onboarding.summary.dislikes')} value={h.dislikes.length ? joinList(t, h.dislikes) : t('common.none')} />
      </Block>

      <Block step="kitchen">
        <P>{listOf(t, 'appliances', h.appliances)}</P>
        <Line label={t('onboarding.kitchen.skill')} value={t(`skills.${h.skill}`)} />
      </Block>

      <Block step="shopping">
        <Line label={t('onboarding.summary.mode')} value={h.shoppingMode ? t(`onboarding.shopping.modes.${h.shoppingMode}`) : t('common.none')} />
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
          accessibilityLabel={labelValue(t, t('common.edit'), title)}
          onPress={() => router.push({ pathname: '/onboarding/[step]', params: { step, from: 'summary' } })}
        />
      </View>
      {children}
    </Card>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  const { t } = useTranslation();
  return <P>{labelValue(t, label, value)}</P>;
}
