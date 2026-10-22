import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';
import { en } from './locales/en';
import { he } from './locales/he';

// Hebrew is the only shipped language for now. Arabic, Russian and English follow.
export const DEFAULT_LANGUAGE = 'he';
const RTL_LANGUAGES = new Set(['he', 'ar']);

export function isRTL(language: string): boolean {
  return RTL_LANGUAGES.has(language);
}

i18n.use(initReactI18next).init({
  resources: { he: { translation: he }, en: { translation: en } },
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false },
});

// Native layout direction. Takes effect on the next app launch; until then the
// root view sets `direction` explicitly so the first launch is RTL as well.
I18nManager.allowRTL(true);
I18nManager.forceRTL(isRTL(DEFAULT_LANGUAGE));

export default i18n;
