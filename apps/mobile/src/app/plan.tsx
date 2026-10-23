import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Button, Card, H1, H2, P, Screen } from '../components/ui';
import { RECIPES_BY_ID as byId } from '../../../../packages/shared/src/content';
import { DAYS } from '../../../../packages/shared/src/vocab';
import { SHOW_DRAFT_RECIPES } from '../config';
import { local } from '../plan/format';
import { usePlan } from '../state/plan';
import { goBackOr } from '../navigation';
import { spacing } from '../theme/tokens';

export default function Plan() {
  const { t, i18n } = useTranslation();
  const { ready, plan, regenerate, swap } = usePlan();
  if (!ready) return null;

  if (!plan) {
    return (
      <Screen footer={<Button label={t('welcome.start')} onPress={() => router.replace('/onboarding/household')} />}>
        <H1>{t('plan.title')}</H1>
        <P muted>{t('plan.empty')}</P>
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <>
          <Button label={t('plan.shoppingList')} onPress={() => router.push('/shopping')} />
          <Button label={t('plan.regenerate')} kind="secondary" onPress={regenerate} />
          <Button kind="link" label={t('common.back')} onPress={() => goBackOr('/')} />
        </>
      }
    >
      <H1>{t('plan.title')}</H1>
      <P muted>{t('plan.hint')}</P>
      {SHOW_DRAFT_RECIPES ? <P muted>{t('plan.draftNotice')}</P> : null}

      {DAYS.map((day) => {
        const slots = plan.slots.map((slot, index) => ({ slot, index })).filter(({ slot }) => slot.day === day);
        if (!slots.length) return null;
        return (
          <View key={day} style={{ gap: spacing.sm }}>
            <H2>{t(`daysLong.${day}`)}</H2>
            {slots.map(({ slot, index }) => {
              const recipe = slot.recipeId ? byId.get(slot.recipeId) : undefined;
              const meal = slot.kind === 'lunchbox' ? t('plan.lunchbox') : t(`meals.${slot.kind}`);
              const title = recipe ? local(recipe.title, i18n.language) : t('plan.noMatch');
              const details = [
                t('plan.portions', { count: slot.portions }),
                recipe ? t('plan.minutes', { n: recipe.prepMinutes + recipe.cookMinutes }) : null,
                slot.cookDay !== slot.day ? t('plan.cookOn', { day: t(`daysLong.${slot.cookDay}`) }) : null,
                slot.festive ? t('plan.festive') : null,
              ].filter(Boolean);
              return (
                <Card key={`${day}-${slot.kind}`}>
                  <P muted>{meal}</P>
                  {recipe ? (
                    <Button
                      kind="link"
                      label={title}
                      onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: recipe.id, portions: String(slot.portions) } })}
                    />
                  ) : (
                    <P>{title}</P>
                  )}
                  <P muted>{details.join(t('format.listSeparator'))}</P>
                  <Button
                    kind="secondary"
                    label={t('plan.swap')}
                    accessibilityLabel={t('plan.swapLabel', { meal, day: t(`daysLong.${day}`) })}
                    onPress={() => swap(index)}
                  />
                </Card>
              );
            })}
          </View>
        );
      })}
    </Screen>
  );
}
