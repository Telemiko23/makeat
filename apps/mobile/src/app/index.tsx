import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, H2, P } from '../components/ui';
import { weeklyPortions } from '../domain/portions';
import { useHousehold } from '../state/household';
import { fontSize, radius, spacing } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

const STEPS = ['plan', 'compare', 'cook'] as const;

export default function Welcome() {
  const { t } = useTranslation();
  const { c, text: align } = useTheme();
  const { ready, saved, edit } = useHousehold();

  const onPress = () => {
    if (!saved) return router.push('/onboarding/household');
    edit();
    router.push('/onboarding/summary');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.brand, { color: c.accent }, align]}>{t('brand')}</Text>
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

        {saved ? (
          <Card>
            <H2>{t('welcome.profileTitle')}</H2>
            <P>{t('welcome.profileMembers', { count: saved.members.length })}</P>
            <P muted>{t('welcome.profilePortions', { total: weeklyPortions(saved).total })}</P>
          </Card>
        ) : null}

        {/* Disabled until the saved profile has loaded, so the right flow opens. */}
        <View style={styles.cta}>
          <Button disabled={!ready} label={t(saved ? 'welcome.editProfile' : 'welcome.start')} onPress={onPress} />
        </View>
        <Text style={[styles.caption, { color: c.muted }]}>{t('welcome.freeMonth')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
  brand: { fontSize: fontSize.title, fontWeight: '800', marginTop: spacing.xl },
  tagline: { fontSize: fontSize.subtitle, fontWeight: '700' },
  body: { fontSize: fontSize.body, lineHeight: 26 },
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
  badgeText: { fontWeight: '700' },
  stepText: { flex: 1, fontSize: fontSize.body },
  cta: { marginTop: spacing.lg },
  caption: { fontSize: fontSize.caption, textAlign: 'center' },
});
