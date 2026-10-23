import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { Button, H1, P, Progress, Screen } from '../../components/ui';
import { local } from '../../plan/format';
import { IngredientList } from '../../plan/IngredientList';
import { portionsParam, visibleRecipe } from '../../plan/recipes';
import { Timer } from '../../plan/Timer';
import { fontFamily, fontSize, lineHeight, spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

/** Cooking mode: one step at a time, large text, a timer where a step has one, and the screen kept on. */
export default function Cook() {
  useKeepAwake();
  const { id, portions: rawPortions, step: rawStep } = useLocalSearchParams<{ id: string; portions?: string; step?: string }>();
  const { t, i18n } = useTranslation();
  const { c, text } = useTheme();
  const [showIngredients, setShowIngredients] = useState(false);
  const recipe = visibleRecipe(id);
  const leave = () => (router.canGoBack() ? router.back() : router.replace('/plan'));

  if (!recipe) {
    return (
      <Screen footer={<Button kind="link" label={t('common.back')} onPress={leave} />}>
        <P>{t('recipe.notFound')}</P>
      </Screen>
    );
  }

  const portions = portionsParam(rawPortions, recipe);
  const total = recipe.steps.length;
  // The step lives in the URL, so a reload or a return keeps the cook's place.
  const asked = Number(rawStep);
  const index = Number.isInteger(asked) && asked >= 1 && asked <= total ? asked - 1 : 0;
  const step = recipe.steps[index];
  const last = index === total - 1;
  const go = (i: number) => router.setParams({ step: String(i + 1) });

  return (
    <Screen
      footer={
        <>
          {last ? <Button label={t('cook.finish')} onPress={leave} /> : <Button label={t('cook.next')} onPress={() => go(index + 1)} />}
          {index > 0 ? <Button kind="secondary" label={t('cook.previous')} onPress={() => go(index - 1)} /> : null}
          {last ? null : <Button kind="link" label={t('cook.exit')} onPress={leave} />}
        </>
      }
    >
      <H1>{local(recipe.title, i18n.language)}</H1>
      <Progress step={index + 1} total={total} label={t('cook.stepOf', { n: index + 1, total })} />
      <Text
        key={index}
        style={[{ color: c.text, fontSize: fontSize.subtitle, lineHeight: lineHeight.subtitle, fontFamily: fontFamily.body }, text]}
      >
        {local(step.text, i18n.language)}
      </Text>
      {/* A new timer for each step. */}
      {step.minutes ? <Timer key={index} minutes={step.minutes} /> : null}

      <View style={{ gap: spacing.sm }}>
        <Button
          kind="link"
          label={showIngredients ? t('cook.hideIngredients') : t('cook.showIngredients')}
          onPress={() => setShowIngredients((v) => !v)}
        />
        {showIngredients ? <IngredientList recipe={recipe} portions={portions} /> : null}
      </View>
    </Screen>
  );
}
