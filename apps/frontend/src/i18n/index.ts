import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './en.json';
import uk from './uk.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      uk: { translation: uk }
    },
    // Force Ukrainian as the only language in the UI
    fallbackLng: 'uk',
    interpolation: { escapeValue: false },
    detection: {
      // Prefer stored choice but default to Ukrainian; no auto-switching to English
      order: ['localStorage','htmlTag','navigator'],
      caches: ['localStorage'],
    },
    react: { useSuspense: false },
  });

// keep <html lang> in sync
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng?.startsWith('uk') ? 'uk' : 'en';
});

// Ensure Ukrainian is selected on boot
if (!i18n.language || !i18n.language.startsWith('uk')) {
  i18n.changeLanguage('uk');
}

export default i18n;
