import '../i18n';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { HouseholdProvider } from '../state/household';
import { useTheme } from '../theme/useTheme';

export default function RootLayout() {
  const { c, rtl } = useTheme();
  return (
    <HouseholdProvider>
      <View style={{ flex: 1, direction: rtl ? 'rtl' : 'ltr', backgroundColor: c.background }}>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.background } }} />
      </View>
    </HouseholdProvider>
  );
}
