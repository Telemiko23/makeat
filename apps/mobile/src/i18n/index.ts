import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';
import { en } from './locales/en';
import { he } from './locales/he';

// Hebrew is the only shipped language for now. Arabic, Russian and English follow.
export const DEFAULT_LANGUAGE = 'he';
const RTL_LANGUAGES = new Set(['he', 'ar']);

export function isRTL(language: string): boolean {
  // Compare the base subtag so 'he-IL' and legacy 'iw' count as Hebrew.
  const base = language.split('-')[0].toLowerCase();
  return RTL_LANGUAGES.has(base === 'iw' ? 'he' : base);
}

const i18n = createInstance();
i18n.use(initReactI18next).init({
  resources: { he: { translation: he }, en: { translation: en } },
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false },
});

// The active language is the single source of layout direction. Native direction
// follows it from the next launch; the root view applies the same value via
// `direction` so the very first launch is already correct.
I18nManager.allowRTL(true);
I18nManager.forceRTL(isRTL(DEFAULT_LANGUAGE));

export default i18n;
