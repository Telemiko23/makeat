import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, H2, P } from '../components/ui';
import { weeklyPortions } from '../domain/portions';
import { useHousehold } from '../state/household';
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
  const { ready, saved, edit } = useHousehold();

  const onPress = () => {
    if (!saved) return router.push('/onboarding/household');
    edit();
    router.push('/onboarding/summary');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Image
          accessible
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
  cta: { marginTop: spacing.lg },
  caption: { fontFamily: fontFamily.body, fontSize: fontSize.caption, textAlign: 'center' },
});
