import '../i18n';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { HouseholdProvider } from '../state/household';
import { useBrandFonts } from '../theme/fonts';
import { useTheme } from '../theme/useTheme';

export default function RootLayout() {
  const { c, rtl } = useTheme();
  // The household profile starts loading at once; screens wait for the brand fonts.
  const fontsReady = useBrandFonts();
  return (
    <HouseholdProvider>
      <View style={{ flex: 1, direction: rtl ? 'rtl' : 'ltr', backgroundColor: c.background }}>
        <StatusBar style="auto" />
        {fontsReady ? (
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.background } }} />
        ) : null}
      </View>
    </HouseholdProvider>
  );
}
