import '../i18n';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { HouseholdProvider } from '../state/household';
import { PlanProvider } from '../state/plan';
import { ShoppingProvider } from '../state/shopping';
import { useBrandFonts } from '../theme/fonts';
import { useTheme } from '../theme/useTheme';

// Keep the native splash up until the brand fonts are ready, instead of a blank screen.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const { c, rtl } = useTheme();
  // The household profile starts loading at once; screens wait for the brand fonts.
  const fontsReady = useBrandFonts();
  useEffect(() => {
    if (fontsReady) SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsReady]);
  return (
    <HouseholdProvider>
      <PlanProvider>
      <ShoppingProvider>
      <View style={{ flex: 1, direction: rtl ? 'rtl' : 'ltr', backgroundColor: c.background }}>
        <StatusBar style="auto" />
        {fontsReady ? (
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.background } }} />
        ) : null}
      </View>
      </ShoppingProvider>
      </PlanProvider>
    </HouseholdProvider>
  );
}
