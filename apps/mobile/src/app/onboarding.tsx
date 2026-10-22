import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fontSize, radius, spacing } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

export default function Onboarding() {
  const { t } = useTranslation();
  const { c, rtl } = useTheme();
  const align = { textAlign: rtl ? 'right' : 'left', writingDirection: rtl ? 'rtl' : 'ltr' } as const;

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={[styles.title, { color: c.text }, align]}>{t('onboarding.title')}</Text>
      <Text style={[styles.body, { color: c.muted }, align]}>{t('onboarding.body')}</Text>
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={[styles.back, { borderColor: c.accent }]}>
        <Text style={{ color: c.accent, fontSize: fontSize.body, fontWeight: '700' }}>{t('onboarding.back')}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, padding: spacing.lg, gap: spacing.md },
  title: { fontSize: fontSize.title - 6, fontWeight: '800', marginTop: spacing.xl },
  body: { fontSize: fontSize.body, lineHeight: 26 },
  back: { alignSelf: 'flex-start', paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.md, borderWidth: 1.5 },
});
