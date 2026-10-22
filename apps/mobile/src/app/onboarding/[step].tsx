import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ErrorText, H1, P, Progress, Screen } from '../../components/ui';
import { STEPS, stepError, type Household, type StepId } from '../../domain/household';
import { FoodStep, HouseholdStep, KitchenStep, ShoppingStep, WeekStep } from '../../onboarding/steps';
import { useHousehold } from '../../state/household';

const BODIES: Record<StepId, ComponentType<{ household: Household; update: (fn: (h: Household) => Household) => void }>> = {
  household: HouseholdStep,
  week: WeekStep,
  food: FoodStep,
  kitchen: KitchenStep,
  shopping: ShoppingStep,
};

const isStep = (s: unknown): s is StepId => typeof s === 'string' && (STEPS as readonly string[]).includes(s);

export default function OnboardingStep() {
  const { step, from } = useLocalSearchParams<{ step: string; from?: string }>();
  const { t } = useTranslation();
  const { ready, household, update } = useHousehold();
  const [attempted, setAttempted] = useState(false);

  if (!isStep(step)) return <Redirect href="/onboarding/household" />;
  if (!ready) return null;

  const index = STEPS.indexOf(step);
  const fromSummary = from === 'summary';
  const error = attempted ? stepError(household, step) : null;
  const Body = BODIES[step];

  const toSummary = () => (router.canGoBack() ? router.back() : router.replace('/onboarding/summary'));

  const next = () => {
    if (stepError(household, step)) {
      setAttempted(true);
      return;
    }
    if (fromSummary) return toSummary();
    const following = STEPS[index + 1];
    router.push(following ? `/onboarding/${following}` : '/onboarding/summary');
  };

  const back = () => {
    if (router.canGoBack()) return router.back();
    router.replace(index > 0 ? `/onboarding/${STEPS[index - 1]}` : '/');
  };

  return (
    <Screen
      footer={
        <>
          {error ? <ErrorText>{t(error)}</ErrorText> : null}
          <Button label={t(fromSummary ? 'common.toSummary' : 'common.next')} onPress={next} />
          {fromSummary ? null : <Button kind="link" label={t('common.back')} onPress={back} />}
        </>
      }
    >
      <Progress step={index + 1} total={STEPS.length} label={t('onboarding.progress', { step: index + 1, total: STEPS.length })} />
      <H1>{t(`onboarding.${step}.title`)}</H1>
      <Body household={household} update={update} />
      {step === 'household' ? <P muted>{t('onboarding.privacy')}</P> : null}
    </Screen>
  );
}
