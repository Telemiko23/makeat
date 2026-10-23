import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, Vibration, View } from 'react-native';
import { Button, Card, P } from '../components/ui';
import { fontFamily, fontSize, spacing } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

/** "m:ss" for a number of seconds. */
export const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/**
 * A countdown for one step. It counts against the wall clock, so it stays
 * right if the screen is busy or the app was in the background.
 */
export function Timer({ minutes }: { minutes: number }) {
  const { t } = useTranslation();
  const { c } = useTheme();
  const total = Math.round(minutes * 60);
  const [left, setLeft] = useState(total);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const done = useRef(false);

  useEffect(() => {
    if (endsAt === null) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining === 0) {
        setEndsAt(null);
        if (!done.current) {
          done.current = true;
          Vibration.vibrate([0, 400, 200, 400]);
        }
      }
    };
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endsAt]);

  const running = endsAt !== null;
  const finished = left === 0;
  const start = () => {
    done.current = false;
    setEndsAt(Date.now() + (finished ? total : left) * 1000);
    if (finished) setLeft(total);
  };
  const pause = () => setEndsAt(null);
  const reset = () => {
    setEndsAt(null);
    setLeft(total);
  };

  return (
    <Card>
      <P muted>{t('cook.timer', { n: minutes })}</P>
      <Text
        accessibilityRole="timer"
        accessibilityLabel={t('cook.timeLeft', { time: clock(left) })}
        style={{ color: c.text, fontSize: fontSize.title, fontFamily: fontFamily.bodyBold, textAlign: 'center' }}
      >
        {clock(left)}
      </Text>
      {/* Announced once when it changes, so a screen reader hears that time is up. */}
      <View aria-live="polite">{finished ? <P>{t('cook.timeUp')}</P> : null}</View>
      <View style={{ gap: spacing.sm }}>
        {running ? (
          <Button kind="secondary" label={t('cook.pause')} onPress={pause} />
        ) : (
          <Button kind="secondary" label={finished ? t('cook.again') : left < total ? t('cook.resume') : t('cook.startTimer')} onPress={start} />
        )}
        {left < total || running ? <Button kind="link" label={t('cook.reset')} onPress={reset} /> : null}
      </View>
    </Card>
  );
}
