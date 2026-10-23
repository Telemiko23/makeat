import { router } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Button, Chip, Chips, H1, H2, P, Screen } from '../components/ui';
import { CATALOG, RECIPES } from '../../../../packages/shared/src/content';
import { shoppingList, type ShoppingItem } from '../../../../packages/shared/src/plan/shopping';
import { joinList, labelValue } from '../onboarding/labels';
import { buyAmount, local } from '../plan/format';
import { usePlan } from '../state/plan';
import { useShopping } from '../state/shopping';
import { spacing } from '../theme/tokens';

const recipeById = new Map(RECIPES.map((r) => [r.id, r]));

export default function Shopping() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { ready: planReady, plan } = usePlan();
  const { ready: marksReady, marks, toggle, clear } = useShopping();

  const items = useMemo(() => {
    if (!plan) return [];
    const name = (i: ShoppingItem) => local(CATALOG.get(i.id)!.name, lang);
    return shoppingList(plan, RECIPES, CATALOG).sort((a, b) => name(a).localeCompare(name(b), lang));
  }, [plan, lang]);

  if (!planReady || !marksReady) return null;
  const back = <Button kind="link" label={t('common.back')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/plan'))} />;

  if (!items.length) {
    return (
      <Screen footer={back}>
        <H1>{t('shopping.title')}</H1>
        <P muted>{t('shopping.empty')}</P>
      </Screen>
    );
  }

  const toBuy = items.filter((i) => !i.pantry);
  const pantry = items.filter((i) => i.pantry);
  const left = toBuy.filter((i) => !marks[i.id]).length;

  const row = (item: ShoppingItem) => {
    const name = local(CATALOG.get(item.id)!.name, lang);
    const label = item.optional ? `${name} (${t('recipe.optional')})` : name;
    const amount = joinList(t, item.amounts.map((a) => buyAmount(t, a.qty, a.unit)));
    const usedIn = joinList(t, item.recipeIds.map((id) => recipeById.get(id)).filter((r) => !!r).map((r) => local(r.title, lang)));
    return (
      <View key={item.id} style={{ gap: spacing.xs }}>
        <P>{labelValue(t, label, amount)}</P>
        <P muted>{t('shopping.usedIn', { recipes: usedIn })}</P>
        <Chips>
          <Chip
            label={t('shopping.have')}
            accessibilityLabel={t('shopping.haveLabel', { item: name })}
            selected={marks[item.id] === 'have'}
            onPress={() => toggle(item.id, 'have')}
          />
          <Chip
            label={t('shopping.bought')}
            accessibilityLabel={t('shopping.boughtLabel', { item: name })}
            selected={marks[item.id] === 'bought'}
            onPress={() => toggle(item.id, 'bought')}
          />
        </Chips>
      </View>
    );
  };

  return (
    <Screen
      footer={
        <>
          <Button kind="secondary" label={t('shopping.clear')} onPress={clear} />
          {back}
        </>
      }
    >
      <H1>{t('shopping.title')}</H1>
      <P muted>{t('shopping.hint')}</P>
      <P>{left ? t('shopping.left', { count: left }) : t('shopping.done')}</P>

      {toBuy.length ? (
        <View style={{ gap: spacing.md }}>
          <H2>{t('shopping.toBuy')}</H2>
          {toBuy.map(row)}
        </View>
      ) : null}
      {pantry.length ? (
        <View style={{ gap: spacing.md }}>
          <H2>{t('shopping.pantry')}</H2>
          <P muted>{t('shopping.pantryHint')}</P>
          {pantry.map(row)}
        </View>
      ) : null}
    </Screen>
  );
}
