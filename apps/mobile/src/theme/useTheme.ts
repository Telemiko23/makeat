import { useMemo } from 'react';
import { useColorScheme, type TextStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { isRTL } from '../i18n';
import { colors, type Palette } from './tokens';

export function useTheme(): { c: Palette; rtl: boolean; text: TextStyle } {
  const scheme = useColorScheme();
  const { i18n } = useTranslation();
  const rtl = isRTL(i18n.language);
  // Start-aligned text: 'auto' follows the layout direction, so it stays correct
  // whether native RTL is already active or only the root `direction` is set.
  const text = useMemo<TextStyle>(() => ({ textAlign: 'auto', writingDirection: rtl ? 'rtl' : 'ltr' }), [rtl]);
  return { c: scheme === 'dark' ? colors.dark : colors.light, rtl, text };
}
