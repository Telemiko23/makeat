import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CATALOG, RECIPES } from '../../../../packages/shared/src/content';
import { buildWeekPlan, rng, swapSlot, type PlanInput, type WeekPlan } from '../../../../packages/shared/src/plan/plan';
import { SHOW_DRAFT_RECIPES } from '../config';
import type { Household } from '../domain/household';
import { portionFactor } from '../domain/portions';
import { useHousehold } from './household';

// The week plan stays on the device with the profile (ADR 0007).
const STORAGE_KEY = 'makeat.plan.v1';
const GATE = { includeDrafts: SHOW_DRAFT_RECIPES };

type Stored = { version: 1; basedOn: string; plan: WeekPlan };

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

/** Stable seed for a profile, so the automatic plan for a profile is always the same. */
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
  // A plan belongs to the profile it was built from; editing the profile starts a new one.
  const basedOn = useMemo(() => (saved ? JSON.stringify(saved) : ''), [saved]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        const data = raw ? (JSON.parse(raw) as Stored) : null;
        if (data?.version === 1 && Array.isArray(data.plan?.slots)) setStored(data);
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  const current = useMemo<WeekPlan | null>(() => {
    if (!loaded || !input) return null;
    if (stored?.basedOn === basedOn) return stored.plan;
    return buildWeekPlan(input, RECIPES, CATALOG, seedOf(basedOn), GATE);
  }, [loaded, input, stored, basedOn]);

  // Persist whatever plan is current, including a freshly built one.
  useEffect(() => {
    if (!current || stored?.plan === current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, basedOn, plan: current })).catch(() => undefined);
  }, [current, stored, basedOn]);

  const save = useCallback((next: Stored) => {
    setStored(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
  }, []);

  const regenerate = useCallback(() => {
    if (input) save({ version: 1, basedOn, plan: buildWeekPlan(input, RECIPES, CATALOG, newSeed(), GATE) });
  }, [input, basedOn, save]);

  const swap = useCallback(
    (index: number) => {
      if (!input || !current) return;
      save({ version: 1, basedOn, plan: swapSlot(current, index, input, RECIPES, CATALOG, rng(newSeed()), GATE) });
    },
    [input, current, basedOn, save],
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
