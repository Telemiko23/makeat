import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CATALOG, RECIPES } from '../../../../packages/shared/src/content';
import { buildWeekPlan, refreshPlan, rng, swapSlot, type PlanInput, type WeekPlan } from '../../../../packages/shared/src/plan/plan';
import { GATE } from '../config';
import type { Household } from '../domain/household';
import { portionFactor } from '../domain/portions';
import { useHousehold } from './household';

// The week plan stays on the device with the profile (ADR 0007).
const STORAGE_KEY = 'makeat.plan.v1';

/**
 * `basedOn` is a hash of the planner's input, never the profile itself, so the
 * plan record holds no copy of allergies or children's ages.
 */
type Stored = { version: 2; basedOn: string; plan: WeekPlan };

type PlanContext = {
  ready: boolean;
  plan: WeekPlan | null;
  input: PlanInput | null;
  /** A new week from a new seed. */
  regenerate: () => void;
  /** Swaps one slot's recipe for another allowed one. */
  swap: (index: number) => void;
};

const Ctx = createContext<PlanContext | null>(null);

export function planInputFor(h: Household): PlanInput {
  return {
    constraints: {
      allergens: h.allergens,
      diets: h.diets,
      kashrut: h.kashrut,
      appliances: h.appliances,
      skill: h.skill,
      dislikes: h.dislikes,
    },
    cookingDays: h.cookingDays,
    mealsAtHome: h.mealsAtHome,
    lunchboxesPerWeekday: h.lunchboxesPerWeekday,
    festive: { fridayDinner: h.festive.fridayDinner, shabbatLunch: h.festive.shabbatLunch },
    portionsPerMeal: Math.round(h.members.reduce((sum, m) => sum + portionFactor(m), 0) * 10) / 10,
  };
}

const newSeed = () => Math.floor(Math.random() * 2 ** 31);

/** Stable hash of the planner's input, so the automatic plan for an input is always the same. */
function seedOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function PlanProvider({ children }: { children: ReactNode }) {
  const { ready: profileReady, saved } = useHousehold();
  const [loaded, setLoaded] = useState(false);
  const [stored, setStored] = useState<Stored | null>(null);

  const input = useMemo(() => (saved ? planInputFor(saved) : null), [saved]);
  // A plan belongs to the planner input it was built from. Profile edits the
  // planner does not read (chains, clubs, shopping mode) keep the plan.
  const basedOn = useMemo(() => (input ? String(seedOf(JSON.stringify(input))) : ''), [input]);

  // Writes run one after another, so a slow write never lands after a newer one.
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const write = useCallback((data: Stored) => {
    const json = JSON.stringify(data);
    queue.current = queue.current.then(() => AsyncStorage.setItem(STORAGE_KEY, json)).catch(() => undefined);
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        const data = raw ? (JSON.parse(raw) as Stored) : null;
        if (data?.version === 2 && typeof data.basedOn === 'string' && typeof data.plan?.seed === 'number' && Array.isArray(data.plan.slots)) {
          setStored(data);
        }
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  const current = useMemo<WeekPlan | null>(() => {
    if (!loaded || !input) return null;
    // A kept plan goes through the gate again: recipes change, and drafts may no longer be shown.
    const kept = stored?.basedOn === basedOn ? refreshPlan(stored.plan, input, RECIPES, CATALOG, GATE) : null;
    return kept ?? buildWeekPlan(input, RECIPES, CATALOG, seedOf(basedOn), GATE);
  }, [loaded, input, stored, basedOn]);

  // The newest plan, including one saved by a tap that has not rendered yet.
  const latest = useRef<WeekPlan | null>(null);
  useEffect(() => {
    latest.current = current;
    // Persist whatever plan is current, including a freshly built or refreshed one.
    if (current && stored?.plan !== current) write({ version: 2, basedOn, plan: current });
  }, [current, stored, basedOn, write]);

  const save = useCallback(
    (plan: WeekPlan) => {
      latest.current = plan;
      const next: Stored = { version: 2, basedOn, plan };
      setStored(next);
      write(next);
    },
    [basedOn, write],
  );

  const regenerate = useCallback(() => {
    if (input) save(buildWeekPlan(input, RECIPES, CATALOG, newSeed(), GATE));
  }, [input, save]);

  const swap = useCallback(
    (index: number) => {
      const plan = latest.current;
      if (input && plan) save(swapSlot(plan, index, input, RECIPES, CATALOG, rng(newSeed()), GATE));
    },
    [input, save],
  );

  const value = useMemo(
    () => ({ ready: loaded && profileReady, plan: current, input, regenerate, swap }),
    [loaded, profileReady, current, input, regenerate, swap],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlan(): PlanContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePlan must be used inside PlanProvider');
  return ctx;
}
