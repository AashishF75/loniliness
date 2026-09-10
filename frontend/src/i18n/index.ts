import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enCommon from './locales/en/common.json';
import hiCommon from './locales/hi/common.json';
import teCommon from './locales/te/common.json';
import mlCommon from './locales/ml/common.json';
import bhoCommon from './locales/bho/common.json';

const resources = {
  en: {
    translation: enCommon
  },
  hi: {
    translation: hiCommon
  },
  te: {
    translation: teCommon
  },
  ml: {
    translation: mlCommon
  },
  bho: {
    translation: bhoCommon
  }
};

const savedLanguage = localStorage.getItem('saathi_language') || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

if (import.meta.hot) {
  import.meta.hot.accept([
    './locales/en/common.json',
    './locales/hi/common.json',
    './locales/te/common.json',
    './locales/ml/common.json',
    './locales/bho/common.json'
  ], ([newEn, newHi, newTe, newMl, newBho]) => {
    if (newEn) i18n.addResourceBundle('en', 'translation', (newEn as any).default || newEn, true, true);
    if (newHi) i18n.addResourceBundle('hi', 'translation', (newHi as any).default || newHi, true, true);
    if (newTe) i18n.addResourceBundle('te', 'translation', (newTe as any).default || newTe, true, true);
    if (newMl) i18n.addResourceBundle('ml', 'translation', (newMl as any).default || newMl, true, true);
    if (newBho) i18n.addResourceBundle('bho', 'translation', (newBho as any).default || newBho, true, true);
    i18n.emit('loaded');
  });
}

export default i18n;
