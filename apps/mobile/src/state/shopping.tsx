import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

// What the user marked on the shopping list stays on the device (ADR 0007).
const STORAGE_KEY = 'makeat.shopping.v1';

export type Mark = 'have' | 'bought';

/** Marks by ingredient id. Ids no longer on the list are simply ignored. */
type Marks = Record<string, Mark>;
type Stored = { version: 1; marks: Marks };

type ShoppingContext = {
  ready: boolean;
  marks: Marks;
  /** Sets a mark, or clears it when the item already has that mark. */
  toggle: (id: string, mark: Mark) => void;
  clear: () => void;
};

const Ctx = createContext<ShoppingContext | null>(null);

export function ShoppingProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [marks, setMarks] = useState<Marks>({});
  // The newest marks, so taps faster than a render build on each other.
  const latest = useRef<Marks>({});
  // Writes run one after another, so a slow write never lands after a newer one.
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        const data = raw ? (JSON.parse(raw) as Stored) : null;
        if (data?.version !== 1 || typeof data.marks !== 'object' || !data.marks) return;
        const clean: Marks = {};
        for (const [id, m] of Object.entries(data.marks)) if (m === 'have' || m === 'bought') clean[id] = m;
        latest.current = clean;
        setMarks(clean);
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  const save = useCallback((next: Marks) => {
    latest.current = next;
    setMarks(next);
    const json = JSON.stringify({ version: 1, marks: next } satisfies Stored);
    queue.current = queue.current.then(() => AsyncStorage.setItem(STORAGE_KEY, json)).catch(() => undefined);
  }, []);

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

  const value = useMemo(() => ({ ready, marks, toggle, clear }), [ready, marks, toggle, clear]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useShopping(): ShoppingContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useShopping must be used inside ShoppingProvider');
  return ctx;
}
