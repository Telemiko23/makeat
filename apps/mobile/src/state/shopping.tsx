import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CATALOG, RECIPES } from '../../../../packages/shared/src/content';
import { shoppingList, type ShoppingItem } from '../../../../packages/shared/src/plan/shopping';
import { usePlan } from './plan';
import { useStorageWriter } from './storage';

// What the user marked on the shopping list stays on the device (ADR 0007).
const STORAGE_KEY = 'makeat.shopping.v1';

export type Mark = 'have' | 'bought';

/** Marks by ingredient id. */
type Marks = Record<string, Mark>;
/**
 * Marks belong to one week's plan (its seed). A new plan or a new profile
 * starts a clean list; a swap keeps the marks of items still on the list.
 */
type Stored = { version: 2; week: number; marks: Marks };

type ShoppingContext = {
  ready: boolean;
  /** The current plan's shopping list; empty without a plan. */
  items: ShoppingItem[];
  /** Marks of items on the current list only. */
  marks: Marks;
  /** Sets a mark, or clears it when the item already has that mark. */
  toggle: (id: string, mark: Mark) => void;
  clear: () => void;
};

const Ctx = createContext<ShoppingContext | null>(null);

export function ShoppingProvider({ children }: { children: ReactNode }) {
  const { ready: planReady, plan } = usePlan();
  const [loaded, setLoaded] = useState(false);
  const [stored, setStored] = useState<Stored | null>(null);
  const { write, onDisk } = useStorageWriter(STORAGE_KEY);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        const data = raw ? (JSON.parse(raw) as Stored) : null;
        if (data?.version !== 2 || typeof data.week !== 'number' || typeof data.marks !== 'object' || !data.marks) return;
        const marks: Marks = {};
        for (const [id, m] of Object.entries(data.marks)) if (m === 'have' || m === 'bought') marks[id] = m;
        onDisk(data);
        setStored({ version: 2, week: data.week, marks });
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, [onDisk]);

  const items = useMemo(() => (plan ? shoppingList(plan, RECIPES, CATALOG) : []), [plan]);

  // Marks from another week, or for items that left the list, do not count.
  const marks = useMemo<Marks>(() => {
    if (!plan || stored?.week !== plan.seed) return {};
    const onList: Marks = {};
    for (const item of items) if (stored.marks[item.id]) onList[item.id] = stored.marks[item.id];
    return onList;
  }, [plan, stored, items]);

  // The newest marks, so taps faster than a render build on each other.
  const latest = useRef<Marks>({});
  useEffect(() => {
    latest.current = marks;
  }, [marks]);

  const save = useCallback(
    (next: Marks) => {
      if (!plan) return;
      latest.current = next;
      const data: Stored = { version: 2, week: plan.seed, marks: next };
      setStored(data);
      write(data);
    },
    [plan, write],
  );

  const toggle = useCallback(
    (id: string, mark: Mark) => {
      const next = { ...latest.current };
      if (next[id] === mark) delete next[id];
      else next[id] = mark;
      save(next);
    },
    [save],
  );

  const clear = useCallback(() => save({}), [save]);

  const value = useMemo(
    () => ({ ready: loaded && planReady, items, marks, toggle, clear }),
    [loaded, planReady, items, marks, toggle, clear],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useShopping(): ShoppingContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useShopping must be used inside ShoppingProvider');
  return ctx;
}
