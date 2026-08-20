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

export default i18n;
