import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Button, Card, H1, H2, P, Screen } from '../../components/ui';
import { CATALOG } from '../../../../../packages/shared/src/content';
import { recipeAllergens, recipeClass } from '../../../../../packages/shared/src/recipes/derive';
import { local } from '../../plan/format';
import { IngredientList } from '../../plan/IngredientList';
import { ProfileWarning } from '../../plan/ProfileWarning';
import { portionsParam, visibleRecipe } from '../../plan/recipes';
import { joinList, labelValue } from '../../onboarding/labels';
import { goBackOr } from '../../navigation';
import { spacing } from '../../theme/tokens';

export default function RecipeScreen() {
  const { id, portions: raw } = useLocalSearchParams<{ id: string; portions?: string }>();
  const { t, i18n } = useTranslation();
  const recipe = visibleRecipe(id);
  const back = <Button kind="link" label={t('common.back')} onPress={() => goBackOr('/plan')} />;

  if (!recipe) {
    return (
      <Screen footer={back}>
        <P>{t('recipe.notFound')}</P>
      </Screen>
    );
  }

  const portions = portionsParam(raw, recipe);
  const allergens = recipeAllergens(recipe, CATALOG);
  const lang = i18n.language;

  return (
    <Screen
      footer={
        <>
          <Button
            label={t('cook.start')}
            onPress={() => router.push({ pathname: '/cook/[id]', params: { id: recipe.id, portions: String(portions) } })}
          />
          {back}
        </>
      }
    >
      <H1>{local(recipe.title, lang)}</H1>
      <P muted>{local(recipe.summary, lang)}</P>
      <P muted>
        {joinList(t, [
          t('recipe.time', { n: recipe.prepMinutes + recipe.cookMinutes }),
          t(`recipe.difficulty.${recipe.difficulty}`),
          t(`recipe.classes.${recipeClass(recipe, CATALOG)}`),
        ])}
      </P>

      <ProfileWarning recipe={recipe} />
      {allergens.length ? (
        <Card>
          <P>{labelValue(t, t('recipe.contains'), joinList(t, allergens.map((a) => t(`allergens.${a}`))))}</P>
          <P muted>{t('recipe.allergenWarning')}</P>
        </Card>
      ) : null}

      <View style={{ gap: spacing.sm }}>
        <H2>{t('recipe.ingredients')}</H2>
        <IngredientList recipe={recipe} portions={portions} />
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
