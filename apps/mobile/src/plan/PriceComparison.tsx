import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { CATALOG, PRODUCTS } from '../../../../packages/shared/src/content';
import type { ShoppingItem } from '../../../../packages/shared/src/plan/shopping';
import { quoteStores } from '../../../../packages/shared/src/prices/quote';
import { Button, Card, H2, P } from '../components/ui';
import { joinList } from '../onboarding/labels';
import { useHousehold } from '../state/household';
import { FEED_CHAIN, usePrices } from '../state/prices';
import type { Mark } from '../state/shopping';
import { spacing } from '../theme/tokens';
import { local } from './format';

/** Branches shown before "show all". */
const FIRST = 3;

/** "2026-10-23T11:00:05" (Israel local time, as published) as date and time parts, without time-zone shifts. */
function feedTime(at: string): { date: string; time: string } | null {
  const m = at.match(/^\d{4}-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  return m ? { date: `${m[2]}.${m[1]}`, time: `${m[3]}:${m[4]}` } : null;
}

/**
 * The shopping list priced at every branch of the household's chains we have
 * data for (decision 0012). Pantry staples and items marked "have it" are left
 * out. Shelf prices only, with each branch's data time.
 */
export function PriceComparison({ items, marks }: { items: readonly ShoppingItem[]; marks: Record<string, Mark> }) {
  const { t, i18n } = useTranslation();
  const { saved } = useHousehold();
  const { file, status, refresh } = usePrices();
  const [all, setAll] = useState(false);

  const basket = useMemo(() => items.filter((i) => !i.pantry && marks[i.id] !== 'have'), [items, marks]);
  const feeds = useMemo(() => (saved?.chains ?? []).map((c) => FEED_CHAIN[c]).filter((c) => !!c), [saved]);
  const quotes = useMemo(() => {
    const stores = file?.stores.filter((s) => feeds.includes(s.chain)) ?? [];
    return quoteStores(basket, PRODUCTS, CATALOG, stores);
  }, [file, feeds, basket]);

  const chainName = (feed: string) => {
    const id = Object.keys(FEED_CHAIN).find((c) => FEED_CHAIN[c] === feed);
    return id ? t(`chains.${id}`) : feed;
  };

  let body;
  if (!feeds.length) body = <P muted>{t('prices.noChains', { chains: joinList(t, Object.keys(FEED_CHAIN).map((c) => t(`chains.${c}`))) })}</P>;
  else if (!basket.length) body = <P muted>{t('prices.nothingToPrice')}</P>;
  else if (!file) body = <P muted>{status === 'loading' ? t('prices.loading') : t('prices.offline')}</P>;
  else if (!quotes.length) body = <P muted>{t('prices.noStores')}</P>;
  else {
    body = (
      <>
        {(all ? quotes : quotes.slice(0, FIRST)).map((q) => {
          const at = q.store.publishedAt ? feedTime(q.store.publishedAt) : null;
          const missing = q.missing.map((id) => CATALOG.get(id)).filter((ing) => !!ing).map((ing) => local(ing.name, i18n.language));
          return (
            <Card key={`${q.store.chain}/${q.store.storeId}`}>
              <View style={{ gap: spacing.xs }}>
                <P>{t('prices.store', { chain: chainName(q.store.chain), name: q.store.name })}</P>
                <H2>{t('prices.total', { amount: q.total.toFixed(2) })}</H2>
                <P muted>{t('prices.coverage', { priced: q.lines.length, total: basket.length })}</P>
                {missing.length ? <P muted>{t('prices.missing', { items: joinList(t, missing) })}</P> : null}
                <P muted>{at ? t('prices.updated', at) : t('prices.updatedUnknown')}</P>
              </View>
            </Card>
          );
        })}
        {quotes.length > FIRST ? (
          <Button kind="link" label={all ? t('prices.showFewer') : t('prices.showAll', { count: quotes.length })} onPress={() => setAll((v) => !v)} />
        ) : null}
        {status === 'offline' ? <P muted>{t('prices.stale')}</P> : null}
      </>
    );
  }

  return (
    <View style={{ gap: spacing.md }}>
      <H2>{t('prices.title')}</H2>
      <P muted>{saved?.shoppingMode === 'online' ? t('prices.hintOnline') : t('prices.hint')}</P>
      {body}
      {status === 'offline' ? <Button kind="secondary" label={t('prices.retry')} onPress={refresh} /> : null}
    </View>
  );
}
