import React from 'react';
import { Bell, ShieldAlert, Mic, Moon, Sun, Type, Heart } from 'lucide-react';

interface AppHeaderProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  largeFont: boolean;
  setLargeFont: (v: boolean) => void;
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  unreadCount?: number;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentScreen,
  onNavigate,
  largeFont,
  setLargeFont,
  darkMode,
  setDarkMode,
  unreadCount = 2,
}) => {
  const titles: Record<string, string> = {
    splash: 'Saathi',
    onboarding: 'Welcome to Saathi',
    login: 'Login',
    register: 'Create Profile',
    home: 'Saathi Home',
    companions: 'Nearby Friends',
    activities: 'Community Activities',
    'activity-details': 'Activity Details',
    calls: 'Voice & Video Calls',
    reminders: 'Reminders & Health',
    family: 'Family Connect',
    volunteers: 'NGO & Volunteers',
    notifications: 'Notifications',
    profile: 'My Profile',
    settings: 'App Settings',
    sos: 'Emergency SOS',
    'ai-voice': 'AI Voice Companion',
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
              India's Elder Community
            </p>
          </div>
        </div>

        {/* Quick Accessibility Controls */}
        <div className="flex items-center gap-1.5">
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
