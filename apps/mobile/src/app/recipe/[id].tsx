import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Button, Card, H1, H2, P, Screen } from '../../components/ui';
import { CATALOG, RECIPES } from '../../../../../packages/shared/src/content';
import { recipeAllergens, recipeClass } from '../../../../../packages/shared/src/recipes/derive';
import { GATE } from '../../config';
import { scaleFor } from '../../../../../packages/shared/src/plan/plan';
import { amount, local } from '../../plan/format';
import { joinList, labelValue } from '../../onboarding/labels';
import { spacing } from '../../theme/tokens';

export default function RecipeScreen() {
  const { id, portions: raw } = useLocalSearchParams<{ id: string; portions?: string }>();
  const { t, i18n } = useTranslation();
  // Drafts open only in builds that show them, even from a deep link.
  const recipe = RECIPES.find((r) => r.id === id && (r.status === 'reviewed' || GATE.includeDrafts));
  const back = <Button kind="link" label={t('common.back')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/plan'))} />;

  if (!recipe) {
    return (
      <Screen footer={back}>
        <P>{t('recipe.notFound')}</P>
      </Screen>
    );
  }

  const asked = Number(raw);
  const portions = Number.isFinite(asked) && asked > 0 ? asked : recipe.servings;
  const scale = scaleFor(recipe, portions);
  const allergens = recipeAllergens(recipe, CATALOG);
  const lang = i18n.language;

  return (
    <Screen footer={back}>
      <H1>{local(recipe.title, lang)}</H1>
      <P muted>{local(recipe.summary, lang)}</P>
      <P muted>
        {joinList(t, [
          t('recipe.time', { n: recipe.prepMinutes + recipe.cookMinutes }),
          t(`recipe.difficulty.${recipe.difficulty}`),
          t(`recipe.classes.${recipeClass(recipe, CATALOG)}`),
        ])}
      </P>

      {allergens.length ? (
        <Card>
          <P>{labelValue(t, t('recipe.contains'), joinList(t, allergens.map((a) => t(`allergens.${a}`))))}</P>
          <P muted>{t('recipe.allergenWarning')}</P>
        </Card>
      ) : null}

      <View style={{ gap: spacing.sm }}>
        <H2>{t('recipe.ingredients')}</H2>
        <P muted>{t('recipe.forPortions', { count: portions })}</P>
        {recipe.ingredients.map((ri) => {
          const ing = CATALOG.get(ri.id);
          const name = ing ? local(ing.name, lang) : ri.id;
          const label = ri.optional ? `${name} (${t('recipe.optional')})` : name;
          return <P key={ri.id}>{labelValue(t, label, amount(t, ri.qty * scale, ri.unit))}</P>;
        })}
      </View>

      <View style={{ gap: spacing.sm }}>
        <H2>{t('recipe.steps')}</H2>
        {recipe.steps.map((step, i) => (
          <Card key={i}>
            <P muted>{t('recipe.step', { n: i + 1 })}</P>
            <P>{local(step.text, lang)}</P>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
