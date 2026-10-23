import { useTranslation } from 'react-i18next';
import { CATALOG } from '../../../../packages/shared/src/content';
import { scaleFor } from '../../../../packages/shared/src/plan/plan';
import type { Recipe } from '../../../../packages/shared/src/recipes/types';
import { P } from '../components/ui';
import { labelValue } from '../onboarding/labels';
import { amount, local } from './format';

/** A recipe's ingredients, scaled to `portions`, one line each. */
export function IngredientList({ recipe, portions }: { recipe: Recipe; portions: number }) {
  const { t, i18n } = useTranslation();
  const scale = scaleFor(recipe, portions);
  return (
    <>
      <P muted>{t('recipe.forPortions', { count: portions })}</P>
      {recipe.ingredients.map((ri) => {
        const ing = CATALOG.get(ri.id);
        const name = ing ? local(ing.name, i18n.language) : ri.id;
        const label = ri.optional ? t('recipe.optionalItem', { name }) : name;
        return <P key={ri.id}>{labelValue(t, label, amount(t, ri.qty * scale, ri.unit))}</P>;
      })}
    </>
  );
}
