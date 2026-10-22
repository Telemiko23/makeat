import { useColorScheme } from 'react-native';
import { useTranslation } from 'react-i18next';
import { isRTL } from '../i18n';
import { colors, type Palette } from './tokens';

export function useTheme(): { c: Palette; rtl: boolean } {
  const scheme = useColorScheme();
  const { i18n } = useTranslation();
  return { c: scheme === 'dark' ? colors.dark : colors.light, rtl: isRTL(i18n.language) };
}
