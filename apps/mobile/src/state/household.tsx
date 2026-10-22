import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { emptyHousehold, type Household } from '../domain/household';

// The profile stays on the device. Allergies and children's ages are sensitive
// (CLAUDE.md), so nothing here is sent anywhere.
const STORAGE_KEY = 'makeat.household.v1';

type Stored = { version: 1; household: Household; completed: boolean };

type HouseholdContext = {
  ready: boolean;
  household: Household;
  completed: boolean;
  update: (fn: (h: Household) => Household) => void;
  complete: () => void;
  reset: () => void;
};

const Ctx = createContext<HouseholdContext | null>(null);

function parse(raw: string | null): Stored | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<Stored>;
    if (data?.version !== 1 || typeof data.household !== 'object' || !data.household) return null;
    // Fill fields added after the profile was saved.
    return { version: 1, household: { ...emptyHousehold(), ...data.household }, completed: !!data.completed };
  } catch {
    return null;
  }
}

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<Stored>({ version: 1, household: emptyHousehold(), completed: false });
  const loaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        const stored = parse(raw);
        if (stored) setState(stored);
      })
      .catch(() => undefined)
      .finally(() => {
        loaded.current = true;
        setReady(true);
      });
  }, []);

  useEffect(() => {
    // Never overwrite a saved profile with the defaults before it has loaded.
    if (!loaded.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => undefined);
  }, [state]);

  const update = useCallback((fn: (h: Household) => Household) => {
    setState((s) => ({ ...s, household: fn(s.household) }));
  }, []);
  const complete = useCallback(() => setState((s) => ({ ...s, completed: true })), []);
  const reset = useCallback(() => setState({ version: 1, household: emptyHousehold(), completed: false }), []);

  const value = useMemo(
    () => ({ ready, household: state.household, completed: state.completed, update, complete, reset }),
    [ready, state, update, complete, reset],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useHousehold(): HouseholdContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useHousehold must be used inside HouseholdProvider');
  return ctx;
}
