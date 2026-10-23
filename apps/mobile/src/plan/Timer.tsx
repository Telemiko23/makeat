import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, Text, Vibration, View } from 'react-native';
import { Button, Card, P } from '../components/ui';
import { fontFamily, fontSize, spacing } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

/** "m:ss" for a number of milliseconds, rounded up to the second. */
export const clock = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

type TimerState = { totalMs: number; leftMs: number; endsAt: number | null };
export type StepTimer = { totalMs: number; leftMs: number; running: boolean };

/**
 * Countdowns for a recipe's steps, kept for the whole cooking session so a
 * timer keeps running while the cook reads other steps. They count against
 * the wall clock, so the time shown is right after the screen was busy.
 * `onDone` runs once when a timer reaches zero.
 */
export function useStepTimers(onDone: (step: number) => void) {
  const [timers, setTimers] = useState<Record<number, TimerState>>({});
  const [now, setNow] = useState(() => Date.now());
  const latest = useRef(timers);
  const done = useRef(onDone);
  useEffect(() => {
    latest.current = timers;
    done.current = onDone;
  });

  const anyRunning = Object.values(timers).some((t) => t.endsAt !== null);
  useEffect(() => {
    if (!anyRunning) return;
    const id = setInterval(() => {
      const at = Date.now();
      const finished = Object.entries(latest.current).filter(([, t]) => t.endsAt !== null && t.endsAt <= at);
      if (finished.length) {
        const next = { ...latest.current };
        for (const [step, t] of finished) next[Number(step)] = { ...t, leftMs: 0, endsAt: null };
        latest.current = next;
        setTimers(next);
        for (const [step] of finished) done.current(Number(step));
      }
      setNow(at);
    }, 250);
    return () => clearInterval(id);
  }, [anyRunning]);

  const update = useCallback((step: number, change: (t: TimerState) => TimerState, totalMs: number) => {
    const current = latest.current[step] ?? { totalMs, leftMs: totalMs, endsAt: null };
    const next = { ...latest.current, [step]: change(current) };
    latest.current = next;
    setTimers(next);
    setNow(Date.now());
  }, []);

  const get = useCallback(
    (step: number, totalMs: number): StepTimer => {
      const t = timers[step];
      if (!t) return { totalMs, leftMs: totalMs, running: false };
      return { totalMs: t.totalMs, leftMs: t.endsAt === null ? t.leftMs : Math.max(0, t.endsAt - now), running: t.endsAt !== null };
    },
    [timers, now],
  );

  const start = useCallback(
    (step: number, totalMs: number) =>
      update(step, (t) => ({ ...t, endsAt: Date.now() + (t.leftMs > 0 ? t.leftMs : t.totalMs), leftMs: t.leftMs > 0 ? t.leftMs : t.totalMs }), totalMs),
    [update],
  );
  // Pausing keeps the exact milliseconds left, so pause and resume never add time.
  const pause = useCallback(
    (step: number, totalMs: number) => update(step, (t) => ({ ...t, leftMs: Math.max(0, (t.endsAt ?? Date.now()) - Date.now()), endsAt: null }), totalMs),
    [update],
  );
  const reset = useCallback((step: number, totalMs: number) => update(step, (t) => ({ ...t, leftMs: t.totalMs, endsAt: null }), totalMs), [update]);

  /** Steps other than `except` whose timer is running or has just finished. */
  const active = useCallback(
    (except: number) =>
      Object.keys(timers)
        .map(Number)
        .filter((s) => s !== except && (timers[s].endsAt !== null || timers[s].leftMs === 0))
        .sort((a, b) => a - b),
    [timers],
  );

  return { get, start, pause, reset, active };
}

/** Vibrates and tells screen readers (iOS and Android) that a step's time is up. */
export function alertTimeUp(message: string) {
  Vibration.vibrate([0, 400, 200, 400]);
  AccessibilityInfo.announceForAccessibility(message);
}

/** The timer card for the current step. */
export function Timer({
  minutes,
  timer,
  onStart,
  onPause,
  onReset,
}: {
  minutes: number;
  timer: StepTimer;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
}) {
  const { t } = useTranslation();
  const { c } = useTheme();
  const { leftMs, totalMs, running } = timer;
  const finished = leftMs === 0;
  return (
    <Card>
      <P muted>{t('cook.timer', { n: minutes })}</P>
      <Text
        accessibilityRole="timer"
        accessibilityLabel={t('cook.timeLeft', { time: clock(leftMs) })}
        style={{ color: c.text, fontSize: fontSize.title, fontFamily: fontFamily.bodyBold, textAlign: 'center' }}
      >
        {clock(leftMs)}
      </Text>
      {finished ? <P>{t('cook.timeUp')}</P> : null}
      <View style={{ gap: spacing.sm }}>
        {running ? (
          <Button kind="secondary" label={t('cook.pause')} onPress={onPause} />
        ) : (
          <Button kind="secondary" label={finished ? t('cook.again') : leftMs < totalMs ? t('cook.resume') : t('cook.startTimer')} onPress={onStart} />
        )}
        {leftMs < totalMs || running ? <Button kind="link" label={t('cook.reset')} onPress={onReset} /> : null}
      </View>
    </Card>
  );
}
