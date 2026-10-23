import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fontFamily, fontSize, lineHeight, radius, spacing, touchTarget } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

export function Screen({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  const { c } = useTheme();
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {footer ? <View style={[styles.footer, { borderTopColor: c.line, backgroundColor: c.background }]}>{footer}</View> : null}
    </SafeAreaView>
  );
}

export function H1({ children }: { children: ReactNode }) {
  const { c, text } = useTheme();
  return (
    <Text accessibilityRole="header" style={[styles.h1, { color: c.text }, text]}>
      {children}
    </Text>
  );
}

export function H2({ children }: { children: ReactNode }) {
  const { c, text } = useTheme();
  return (
    <Text accessibilityRole="header" aria-level={2} style={[styles.h2, { color: c.text }, text]}>
      {children}
    </Text>
  );
}

export function P({ children, muted }: { children: ReactNode; muted?: boolean }) {
  const { c, text } = useTheme();
  return <Text style={[styles.p, { color: muted ? c.muted : c.text }, text]}>{children}</Text>;
}

export function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <H2>{title}</H2>
      {hint ? <P muted>{hint}</P> : null}
      {children}
    </View>
  );
}

export function Button({
  label,
  onPress,
  kind = 'primary',
  disabled,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'link';
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const { c } = useTheme();
  const bg = kind === 'primary' ? c.accent : 'transparent';
  const fg = kind === 'primary' ? c.onAccent : c.accent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      aria-disabled={!!disabled}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        kind === 'link' ? styles.link : styles.button,
        { backgroundColor: bg, borderColor: c.accent, borderWidth: kind === 'secondary' ? 1.5 : 0 },
        { opacity: disabled ? 0.4 : pressed ? 0.85 : 1 },
      ]}
    >
      <Text style={[kind === 'link' ? styles.linkText : styles.buttonText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Chips({ children }: { children: ReactNode }) {
  return <View style={styles.chips}>{children}</View>;
}

/** A selectable chip. `single` makes it behave like a radio option. */
export function Chip({
  label,
  selected,
  onPress,
  single,
  accessibilityLabel,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  single?: boolean;
  accessibilityLabel?: string;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole={single ? 'radio' : 'checkbox'}
      aria-checked={selected}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: selected ? c.accent : c.line, backgroundColor: selected ? c.accent : c.surface },
      ]}
    >
      <View style={styles.chipRow}>
        {/* Icons, not text: the state is announced through aria-checked. */}
        {selected && !single ? <Text aria-hidden style={{ color: c.onAccent, fontSize: fontSize.body, fontFamily: fontFamily.bodyBold }}>✓</Text> : null}
        <Text style={{ color: selected ? c.onAccent : c.text, fontSize: fontSize.body, fontFamily: selected ? fontFamily.bodyBold : fontFamily.body }}>{label}</Text>
      </View>
    </Pressable>
  );
}

/** A tag with a remove action, e.g. a typed-in dislike. */
export function RemovableTag({ label, removeLabel, onRemove }: { label: string; removeLabel: string; onRemove: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={removeLabel}
      onPress={onRemove}
      style={[styles.chip, { borderColor: c.line, backgroundColor: c.surface }]}
    >
      <View style={styles.chipRow}>
        <Text style={{ color: c.text, fontSize: fontSize.body, fontFamily: fontFamily.body }}>{label}</Text>
        <Text aria-hidden style={{ color: c.muted, fontSize: fontSize.body, fontFamily: fontFamily.body }}>✕</Text>
      </View>
    </Pressable>
  );
}

export function Counter({
  label,
  value,
  min,
  max,
  onChange,
  format = String,
  decLabel,
  incLabel,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  format?: (n: number) => string;
  decLabel: string;
  incLabel: string;
}) {
  const { c, text } = useTheme();
  const { t } = useTranslation();
  return (
    <View style={styles.counter} accessibilityLabel={t('format.labelValue', { label, value: format(value) })}>
      <Text style={[styles.counterLabel, { color: c.text }, text]}>{label}</Text>
      <View style={styles.counterControls}>
        <Stepper sign="−" label={`${decLabel} ${label}`} disabled={value <= min} onPress={() => onChange(value - 1)} />
        <Text style={[styles.counterValue, { color: c.text }]}>{format(value)}</Text>
        <Stepper sign="+" label={`${incLabel} ${label}`} disabled={value >= max} onPress={() => onChange(value + 1)} />
      </View>
    </View>
  );
}

function Stepper({ sign, label, disabled, onPress }: { sign: string; label: string; disabled: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      style={[styles.stepper, { borderColor: c.accent, opacity: disabled ? 0.3 : 1 }]}
    >
      <Text style={{ color: c.accent, fontSize: fontSize.subtitle, fontFamily: fontFamily.display }}>{sign}</Text>
    </Pressable>
  );
}

export function Card({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  return <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }]}>{children}</View>;
}

export function Progress({ step, total, label }: { step: number; total: number; label: string }) {
  const { c, text } = useTheme();
  return (
    <View style={styles.progress}>
      <Text style={[{ color: c.muted, fontSize: fontSize.caption, fontFamily: fontFamily.body }, text]}>{label}</Text>
      <View
        accessibilityRole="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={step}
        style={[styles.track, { backgroundColor: c.line }]}
      >
        <View style={[styles.fill, { backgroundColor: c.accent, width: `${(step / total) * 100}%` }]} />
      </View>
    </View>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  const { c, text } = useTheme();
  return (
    <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.error, { color: c.danger }, text]}>
      {children}
    </Text>
  );
}

export function Input(props: TextInputProps) {
  const { c, rtl } = useTheme();
  return (
    <TextInput
      placeholderTextColor={c.muted}
      {...props}
      style={[
        styles.input,
        { color: c.text, borderColor: c.line, backgroundColor: c.surface, textAlign: rtl ? 'right' : 'left' },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl },
  footer: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  h1: { fontFamily: fontFamily.display, fontSize: fontSize.title - 4, marginTop: spacing.md },
  h2: { fontFamily: fontFamily.display, fontSize: fontSize.subtitle },
  p: { fontFamily: fontFamily.body, fontSize: fontSize.body, lineHeight: lineHeight.body },
  section: { gap: spacing.sm },
  button: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: radius.md, alignItems: 'center', minHeight: touchTarget },
  buttonText: { fontFamily: fontFamily.display, fontSize: fontSize.subtitle },
  link: { paddingVertical: spacing.sm, alignSelf: 'flex-start', minHeight: touchTarget, justifyContent: 'center' },
  linkText: { fontFamily: fontFamily.displayMedium, fontSize: fontSize.body },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1.5, minHeight: touchTarget, justifyContent: 'center' },
  counter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  counterLabel: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.body },
  counterControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  counterValue: { minWidth: 72, textAlign: 'center', fontFamily: fontFamily.bodyBold, fontSize: fontSize.body },
  stepper: { width: touchTarget, height: touchTarget, borderRadius: radius.pill, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  card: { padding: spacing.md, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, gap: spacing.sm },
  progress: { gap: spacing.xs },
  track: { height: 6, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: 6, borderRadius: radius.pill },
  error: { fontFamily: fontFamily.bodyBold, fontSize: fontSize.body },
  input: { borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontFamily: fontFamily.body, fontSize: fontSize.body, minHeight: touchTarget },
});
