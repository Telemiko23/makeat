import { Fredoka_500Medium, Fredoka_600SemiBold } from '@expo-google-fonts/fredoka';
import { Rubik_400Regular, Rubik_700Bold } from '@expo-google-fonts/rubik';
import { useFonts } from 'expo-font';

// Loads the brand fonts named in tokens.fontFamily. Returns true once they are usable.
// The fonts ship inside the app bundle, so a load error means a broken build: the app
// then still renders rather than staying blank, but in the regular system font
// (styles set families, not weights), so headings lose their emphasis.
export function useBrandFonts(): boolean {
  const [loaded, error] = useFonts({
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Rubik_400Regular,
    Rubik_700Bold,
  });
  return loaded || error != null;
}
