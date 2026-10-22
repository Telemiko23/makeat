import { Fredoka_500Medium, Fredoka_600SemiBold } from '@expo-google-fonts/fredoka';
import { Rubik_400Regular, Rubik_500Medium, Rubik_700Bold } from '@expo-google-fonts/rubik';
import { useFonts } from 'expo-font';

// Loads the brand fonts named in tokens.fontFamily. Returns true once they are usable;
// on a load error the app still renders with system fonts rather than staying blank.
export function useBrandFonts(): boolean {
  const [loaded, error] = useFonts({
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Rubik_400Regular,
    Rubik_500Medium,
    Rubik_700Bold,
  });
  return loaded || error != null;
}
