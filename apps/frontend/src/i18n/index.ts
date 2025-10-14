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
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage','navigator','htmlTag'],
      caches: ['localStorage'],
    },
    react: { useSuspense: false },
  });

// keep <html lang> in sync
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng?.startsWith('uk') ? 'uk' : 'en';
});

export default i18n;

