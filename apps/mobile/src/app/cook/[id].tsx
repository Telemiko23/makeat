import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { Button, Card, H1, P, Progress, Screen } from '../../components/ui';
import { goBackOr } from '../../navigation';
import { local } from '../../plan/format';
import { IngredientList } from '../../plan/IngredientList';
import { ProfileWarning } from '../../plan/ProfileWarning';
import { portionsParam, visibleRecipe } from '../../plan/recipes';
import { alertTimeUp, clock, Timer, useStepTimers } from '../../plan/Timer';
import { fontFamily, fontSize, lineHeight, spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

/** A 1-based step number from the URL, or null when it is not one of the recipe's steps. */
function stepParam(raw: string | undefined, total: number): number | null {
  if (!raw || !/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return n >= 1 && n <= total ? n : null;
}

/** Cooking mode: one step at a time, large text, step timers that keep running, and the screen kept on. */
export default function Cook() {
  useKeepAwake();
  const { id, portions: rawPortions, step: rawStep } = useLocalSearchParams<{ id: string; portions?: string; step?: string }>();
  const { t, i18n } = useTranslation();
  const { c, text } = useTheme();
  const [showIngredients, setShowIngredients] = useState(false);
  const timers = useStepTimers((step) => alertTimeUp(t('cook.timeUpStep', { n: step + 1 })));
  const recipe = visibleRecipe(id);
  const total = recipe?.steps.length ?? 0;
  const parsed = stepParam(rawStep, total);

  // The step lives in the URL, so a reload keeps the cook's place; a bad value is corrected there too.
  useEffect(() => {
    if (recipe && rawStep !== undefined && parsed === null) router.setParams({ step: '1' });
  }, [recipe, rawStep, parsed]);

  const leave = () => goBackOr('/plan');
  if (!recipe) {
    return (
      <Screen footer={<Button kind="link" label={t('common.back')} onPress={leave} />}>
        <P>{t('recipe.notFound')}</P>
      </Screen>
    );
  }

  const portions = portionsParam(rawPortions, recipe);
  const index = (parsed ?? 1) - 1;
  const step = recipe.steps[index];
  const last = index === total - 1;
  const go = (i: number) => router.setParams({ step: String(i + 1) });
  const msOf = (i: number) => Math.round((recipe.steps[i].minutes ?? 0) * 60_000);

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
      <ProfileWarning recipe={recipe} />
      <Progress step={index + 1} total={total} label={t('cook.stepOf', { n: index + 1, total })} />

      {/* Timers of other steps keep running; show them so nothing burns while reading ahead. */}
      {timers.active(index).map((s) => {
        const timer = timers.get(s, msOf(s));
        return (
          <Card key={s}>
            <P>{timer.leftMs === 0 ? t('cook.otherTimerDone', { n: s + 1 }) : t('cook.otherTimer', { n: s + 1, time: clock(timer.leftMs) })}</P>
            <Button kind="link" label={t('cook.goToStep', { n: s + 1 })} onPress={() => go(s)} />
          </Card>
        );
      })}

      <Text style={[{ color: c.text, fontSize: fontSize.subtitle, lineHeight: lineHeight.subtitle, fontFamily: fontFamily.body }, text]}>
        {local(step.text, i18n.language)}
      </Text>
      {step.minutes ? (
        <Timer
          minutes={step.minutes}
          timer={timers.get(index, msOf(index))}
          onStart={() => timers.start(index, msOf(index))}
          onPause={() => timers.pause(index, msOf(index))}
          onReset={() => timers.reset(index, msOf(index))}
        />
      ) : null}

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
