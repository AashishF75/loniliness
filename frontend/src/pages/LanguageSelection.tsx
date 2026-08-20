import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, ArrowRight } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

export function LanguageSelection() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const languages = [
    { code: 'en', name: t('language.english'), native: 'English', flag: '🇬🇧' },
    { code: 'hi', name: t('language.hindi'), native: 'हिन्दी', flag: '🇮🇳' },
    { code: 'te', name: t('language.telugu'), native: 'తెలుగు', flag: '🇮🇳' },
    { code: 'ml', name: t('language.malayalam'), native: 'മലയാളം', flag: '🇮🇳' },
    { code: 'bho', name: t('language.bhojpuri'), native: 'भोजपुरी', flag: '🇮🇳' }
  ];

  const handleSelect = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('saathi_language', code);
    navigate('/onboarding');
  };

  return (
    <div className="flex flex-col gap-8 pb-8 max-w-2xl mx-auto w-full pt-4 md:pt-12">
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-brand-900 mb-4">{t('language.title')}</h1>
        <p className="text-xl md:text-2xl text-gray-600 font-medium">{t('language.subtitle')}</p>
      </div>

      <Card className="p-6 md:p-10 shadow-lg">
        <div className="flex flex-col gap-4">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className="flex items-center justify-between p-5 md:p-6 rounded-2xl border-4 border-gray-100 hover:border-brand-300 hover:bg-brand-50 transition-all text-left group"
              aria-label={`Select ${lang.native}`}
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl md:text-4xl">{lang.flag}</span>
                <span className="text-2xl md:text-3xl font-bold text-gray-800">{lang.native}</span>
              </div>
              <ArrowRight className="w-8 h-8 text-gray-300 group-hover:text-brand-500 transition-colors" />
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
