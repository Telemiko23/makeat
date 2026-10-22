import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fontFamily, fontSize, lineHeight, radius, spacing } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

const STEPS = ['plan', 'compare', 'cook'] as const;
const LOGO = {
  light: require('../../assets/brand/lockup-light.png'),
  dark: require('../../assets/brand/lockup-dark.png'),
};

export default function Welcome() {
  const { t } = useTranslation();
  const { c, scheme, text: align } = useTheme();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Image
          source={LOGO[scheme]}
          accessibilityRole="image"
          accessibilityLabel={t('brand')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={[styles.tagline, { color: c.text }, align]}>{t('welcome.tagline')}</Text>
        <Text style={[styles.body, { color: c.muted }, align]}>{t('welcome.intro')}</Text>

        <View style={styles.steps}>
          {STEPS.map((step, i) => (
            <View key={step} style={[styles.step, { backgroundColor: c.surface, borderColor: c.line }]}>
              <View style={[styles.badge, { backgroundColor: c.accent }]}>
                <Text style={[styles.badgeText, { color: c.onAccent }]}>{i + 1}</Text>
              </View>
              <Text style={[styles.stepText, { color: c.text }, align]}>{t(`welcome.steps.${step}`)}</Text>
            </View>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/onboarding')}
          style={({ pressed }) => [styles.cta, { backgroundColor: c.accent, opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={[styles.ctaText, { color: c.onAccent }]}>{t('welcome.start')}</Text>
        </Pressable>
        <Text style={[styles.caption, { color: c.muted }]}>{t('welcome.freeMonth')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
  // Lockup artwork is 498x120 (3x); shown at 40dp high. alignSelf start = right in RTL.
  logo: { width: 166, height: 40, alignSelf: 'flex-start', marginTop: spacing.xl },
  tagline: { fontFamily: fontFamily.display, fontSize: fontSize.heading, lineHeight: lineHeight.heading },
  body: { fontFamily: fontFamily.body, fontSize: fontSize.body, lineHeight: lineHeight.body },
  steps: { gap: spacing.sm, marginTop: spacing.sm },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badge: { width: 28, height: 28, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: fontFamily.display },
  stepText: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.body },
  cta: { marginTop: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center' },
  ctaText: { fontFamily: fontFamily.display, fontSize: fontSize.subtitle },
  caption: { fontFamily: fontFamily.body, fontSize: fontSize.caption, textAlign: 'center' },
});
