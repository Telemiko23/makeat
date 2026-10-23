import { useTranslation } from 'react-i18next';
import { CATALOG } from '../../../../packages/shared/src/content';
import { exclusions } from '../../../../packages/shared/src/recipes/filter';
import type { Recipe } from '../../../../packages/shared/src/recipes/types';
import { Card, ErrorText } from '../components/ui';
import { joinList } from '../onboarding/labels';
import { planInputFor } from '../state/plan';
import { useHousehold } from '../state/household';

/**
 * Warns when a recipe opened directly (a link, a reload) breaks the saved
 * profile's allergy, kashrut or diet rules. The plan never offers such
 * recipes; this covers the paths that bypass the plan.
 */
export function ProfileWarning({ recipe }: { recipe: Recipe }) {
  const { t } = useTranslation();
  const { saved } = useHousehold();
  if (!saved) return null;
  // Drafts are handled by visibleRecipe(); this checks the household's own rules.
  const lines = exclusions(recipe, CATALOG, planInputFor(saved).constraints, { includeDrafts: true }).flatMap((e) => {
    switch (e.rule) {
      case 'allergen':
        return [t('recipe.warnAllergen', { list: joinList(t, e.allergens.map((a) => t(`allergens.${a}`))) })];
      case 'unknownIngredient':
      case 'kashrut':
        return [t('recipe.warnKashrut')];
      case 'diet':
        return [t('recipe.warnDiet', { diet: t(`diets.${e.diet}`) })];
      default:
        return [];
    }
  });
  if (!lines.length) return null;
  return (
    <Card>
      {[...new Set(lines)].map((line) => (
        <ErrorText key={line}>{line}</ErrorText>
      ))}
    </Card>
  );
}
