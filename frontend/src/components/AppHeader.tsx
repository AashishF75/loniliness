import React, { useState, useRef, useEffect } from 'react';
import { Bell, ShieldAlert, Mic, Moon, Sun, Type, Heart, Globe, ChevronDown } from 'lucide-react';

interface AppHeaderProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  largeFont: boolean;
  setLargeFont: (v: boolean) => void;
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  unreadCount?: number;
}

import { useTranslation } from 'react-i18next';

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentScreen,
  onNavigate,
  largeFont,
  setLargeFont,
  darkMode,
  setDarkMode,
  unreadCount = 2,
}) => {
  const { t, i18n } = useTranslation();
  const [showLangMenu, setShowLangMenu] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setShowLangMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const titles: Record<string, string> = {
    splash: 'Saathi',
    onboarding: t('header.titles.onboarding', 'Welcome to Saathi'),
    login: t('header.titles.login', 'Login'),
    register: t('header.titles.register', 'Create Profile'),
    home: t('header.titles.home', 'Saathi Home'),
    companions: t('header.titles.companions', 'Nearby Friends'),
    activities: t('header.titles.activities', 'Community Activities'),
    'activity-details': t('header.titles.activityDetails', 'Activity Details'),
    calls: t('header.titles.calls', 'Voice & Video Calls'),
    reminders: t('header.titles.reminders', 'Reminders & Health'),
    family: t('header.titles.family', 'Family Connect'),
    volunteers: t('header.titles.volunteers', 'NGO & Volunteers'),
    notifications: t('header.titles.notifications', 'Notifications'),
    profile: t('header.titles.profile', 'My Profile'),
    settings: t('header.titles.settings', 'App Settings'),
    sos: t('header.titles.sos', 'Emergency SOS'),
    'ai-voice': t('header.titles.aiVoice', 'AI Voice Companion'),
    'empty-states': 'Empty State Samples',
    'success-screens': 'Success Screen Samples',
    'error-screens': 'Error State Samples',
  };

  const title = titles[currentScreen] || 'Saathi';

  // Hide top header on splash screen or onboarding if desired, or keep simplified
  if (currentScreen === 'splash') return null;

  return (
    <header className={`px-4 py-3 sticky top-0 z-30 transition-colors border-b ${
      darkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-green-100 text-gray-900'
    }`}>
      <div className="flex items-center justify-between">
        {/* Brand / Screen Title */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate('home')}
            className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-bold text-xl shadow-md hover:scale-105 transition-transform"
            title="Go to Home"
          >
            <Heart className="w-6 h-6 fill-amber-300 text-amber-300" />
          </button>
          <div>
            <h1 className={`font-extrabold tracking-tight text-emerald-800 dark:text-emerald-400 ${largeFont ? 'text-2xl' : 'text-xl'}`}>
              {title}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              {t('header.subtitle', "India's Elder Community")}
            </p>
          </div>
        </div>

        {/* Quick Accessibility Controls */}
        <div className="flex items-center gap-1.5">
          <div className="relative" ref={langMenuRef}>
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all border outline-none ${
                darkMode ? 'bg-gray-800 text-gray-200 border-gray-700 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
              }`}
              title="Change Language"
            >
              <Globe className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <span className="hidden sm:inline">
                {{'en':'English', 'hi':'हिन्दी', 'te':'తెలుగు', 'ml':'മലയാളം', 'bho':'भोजपुरी'}[i18n.language || 'en']}
              </span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>

            {showLangMenu && (
              <div className={`absolute right-0 mt-2 w-32 rounded-xl shadow-xl overflow-hidden border z-50 ${
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
              }`}>
                {[
                  { code: 'en', name: 'English' },
                  { code: 'hi', name: 'हिन्दी' },
                  { code: 'te', name: 'తెలుగు' },
                  { code: 'ml', name: 'മലയാളം' },
                  { code: 'bho', name: 'भोजपुरी' }
                ].map((lang) => (
                  <button
                    key={lang.code}
                    className={`w-full text-left px-4 py-3 text-sm font-semibold transition-colors ${
                      (i18n.language || 'en') === lang.code
                        ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                        : darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      i18n.changeLanguage(lang.code);
                      localStorage.setItem('saathi_language', lang.code);
                      setShowLangMenu(false);
                    }}
                  >
                    {lang.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Toggle Large Font */}
          <button
            onClick={() => setLargeFont(!largeFont)}
            className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              largeFont
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200'
            }`}
            title="Toggle Large Font Mode"
          >
            <Type className="w-4 h-4" />
            <span className="hidden sm:inline">{largeFont ? 'Large On' : 'Font'}</span>
          </button>

          {/* Toggle Dark Mode */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="Toggle Theme"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

          {/* Notifications */}
          <button
            onClick={() => onNavigate('notifications')}
            className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white text-[11px] font-extrabold rounded-full flex items-center justify-center animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>

          {/* AI Voice Assistant Trigger */}
          <button
            onClick={() => onNavigate('ai-voice')}
            className="p-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-emerald-600 text-white font-semibold shadow-sm hover:opacity-95 transition-opacity flex items-center gap-1"
            title="AI Voice Assistant"
          >
            <Mic className="w-4 h-4 animate-pulse" />
            <span className="text-xs font-bold hidden md:inline">Bol Saathi</span>
          </button>
        </div>
      </div>
    </header>
  );
};
