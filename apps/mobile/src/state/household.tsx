import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { emptyHousehold, firstProblem, normalizeHousehold, type Household } from '../domain/household';

// The profile stays on the device (ADR 0007). Allergies and children's ages are
// sensitive (CLAUDE.md), so nothing here is sent anywhere.
const STORAGE_KEY = 'makeat.household.v1';
const WRITE_DELAY_MS = 300;

/**
 * `saved` is the confirmed profile the app plans with; `draft` is what the
 * questionnaire edits. Edits reach `saved` only through `save()`, so leaving
 * the questionnaire half-way never breaks a saved profile.
 */
type Stored = { version: 1; saved: Household | null; draft: Household };

type HouseholdContext = {
  ready: boolean;
  saved: Household | null;
  draft: Household;
  update: (fn: (h: Household) => Household) => void;
  /** Starts editing from the saved profile, dropping any unsaved draft. */
  edit: () => void;
  /** Saves the draft if it is complete; returns the first problem otherwise. */
  save: () => string | null;
};

const Ctx = createContext<HouseholdContext | null>(null);

const initial = (): Stored => ({ version: 1, saved: null, draft: emptyHousehold() });

function parse(raw: string | null): Stored | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<Stored>;
    if (data?.version !== 1) return null;
    return {
      version: 1,
      saved: data.saved ? normalizeHousehold(data.saved) : null,
      draft: normalizeHousehold(data.draft ?? data.saved),
    };
  } catch {
    return null;
  }
}

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<Stored>(initial);
  const stateRef = useRef(state);
  const lastWritten = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Writes run one after another, so a slow write never lands after a newer one.
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const write = useCallback((s: Stored) => {
    const json = JSON.stringify(s);
    if (json === lastWritten.current) return;
    lastWritten.current = json;
    queue.current = queue.current.then(() => AsyncStorage.setItem(STORAGE_KEY, json)).catch(() => undefined);
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        const stored = parse(raw);
        if (stored) {
          // Already on disk: no need to write it straight back.
          lastWritten.current = JSON.stringify(stored);
          setState(stored);
        }
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    // Never overwrite a saved profile with the defaults before it has loaded.
    if (!ready) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => write(stateRef.current), WRITE_DELAY_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [ready, state, write]);

  const update = useCallback((fn: (h: Household) => Household) => {
    setState((s) => ({ ...s, draft: fn(s.draft) }));
  }, []);

  const edit = useCallback(() => {
    setState((s) => (s.saved ? { ...s, draft: s.saved } : s));
  }, []);

  const save = useCallback(() => {
    const current = stateRef.current;
    const problem = firstProblem(current.draft);
    if (problem) return problem.error;
    const next: Stored = { ...current, saved: current.draft };
    stateRef.current = next;
    setState(next);
    write(next); // Saving is explicit, so persist it right away.
    return null;
  }, [write]);

  const value = useMemo(
    () => ({ ready, saved: state.saved, draft: state.draft, update, edit, save }),
    [ready, state, update, edit, save],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useHousehold(): HouseholdContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useHousehold must be used inside HouseholdProvider');
  return ctx;
}
