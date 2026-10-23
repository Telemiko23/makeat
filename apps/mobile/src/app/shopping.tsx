import { router } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Button, Chip, Chips, H1, H2, P, Screen } from '../components/ui';
import { CATALOG, RECIPES_BY_ID } from '../../../../packages/shared/src/content';
import type { ShoppingItem } from '../../../../packages/shared/src/plan/shopping';
import { joinList, labelValue } from '../onboarding/labels';
import { buyAmount, local } from '../plan/format';
import { useShopping } from '../state/shopping';
import { spacing } from '../theme/tokens';

export default function Shopping() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { ready, items: list, marks, toggle, clear } = useShopping();

  // Names resolved once, then sorted alphabetically in the active language.
  const items = useMemo(
    () =>
      list
        .map((item) => ({ item, name: local(CATALOG.get(item.id)!.name, lang) }))
        .sort((a, b) => a.name.localeCompare(b.name, lang)),
    [list, lang],
  );

  if (!ready) return null;
  const back = <Button kind="link" label={t('common.back')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/plan'))} />;

  if (!items.length) {
    return (
      <Screen footer={back}>
        <H1>{t('shopping.title')}</H1>
        <P muted>{t('shopping.empty')}</P>
      </Screen>
    );
  }

  const toBuy = items.filter(({ item }) => !item.pantry);
  const pantry = items.filter(({ item }) => item.pantry);
  const left = items.filter(({ item }) => !marks[item.id]).length;

  const row = ({ item, name }: { item: ShoppingItem; name: string }) => {
    const label = item.optional ? t('recipe.optionalItem', { name }) : name;
    const amount = joinList(t, item.amounts.map((a) => buyAmount(t, a.qty, a.unit)));
    const usedIn = joinList(t, item.recipeIds.map((id) => RECIPES_BY_ID.get(id)).filter((r) => !!r).map((r) => local(r.title, lang)));
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
