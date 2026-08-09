import React from 'react';
import { Home, Users, Calendar, PhoneCall, ShieldAlert, Sparkles, User } from 'lucide-react';

interface BottomNavProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  largeFont: boolean;
  darkMode: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentScreen,
  onNavigate,
  largeFont,
  darkMode,
}) => {
  // Hide on splash, onboarding, login, register, sos
  const hideNav = ['splash', 'onboarding', 'login', 'register'].includes(currentScreen);
  if (hideNav) return null;

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'companions', label: 'Friends', icon: Users },
    { id: 'activities', label: 'Activities', icon: Calendar },
    { id: 'calls', label: 'Call', icon: PhoneCall },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto px-2 pb-2">
      <div className={`rounded-3xl shadow-2xl border backdrop-blur-md flex items-center justify-around px-2 py-2.5 transition-all ${
        darkMode 
          ? 'bg-gray-900/95 border-gray-800 text-white' 
          : 'bg-white/95 border-emerald-100 text-gray-800'
      }`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-2xl transition-all relative ${
                isActive
                  ? 'text-emerald-700 dark:text-emerald-400 font-extrabold bg-emerald-50 dark:bg-emerald-950/60 scale-105'
                  : 'text-gray-500 dark:text-gray-400 font-medium hover:text-emerald-600'
              }`}
            >
              <Icon className={`transition-transform ${largeFont ? 'w-6 h-6' : 'w-5 h-5'} ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className={`mt-1 tracking-tight leading-none ${largeFont ? 'text-xs' : 'text-[11px]'}`}>
                {item.label}
              </span>
              {isActive && (
                <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full mt-0.5"></span>
              )}
            </button>
          );
        })}

        {/* SOS Floating Action Highlight */}
        <button
          onClick={() => onNavigate('sos')}
          className="ml-1 bg-gradient-to-br from-rose-500 to-red-700 text-white p-2.5 rounded-2xl shadow-lg hover:scale-105 transition-transform flex flex-col items-center justify-center animate-sos"
          title="Emergency SOS"
        >
          <ShieldAlert className="w-5 h-5" />
          <span className="text-[10px] font-extrabold uppercase tracking-wider">SOS</span>
        </button>
      </div>
    </div>
  );
};
