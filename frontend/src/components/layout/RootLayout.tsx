import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, Users, Calendar, MessageCircle, Heart, User } from 'lucide-react';

export function RootLayout() {
  const location = useLocation();
  
  const navItems = [
    { path: '/dashboard', label: 'Home', icon: Home },
    { path: '/people', label: 'People', icon: Users },
    { path: '/activities', label: 'Events', icon: Calendar },
    { path: '/ai-companion', label: 'Saathi', icon: MessageCircle },
    { path: '/family', label: 'Family', icon: Heart },
  ];

  const hideNav = ['/', '/login', '/register', '/onboarding'].includes(location.pathname);

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 pb-24 md:pb-0 font-sans">
      {!hideNav && (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50 p-4 shadow-sm">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <Link to="/dashboard" className="text-2xl font-bold text-brand-600 flex items-center gap-3">
              <span className="w-12 h-12 bg-brand-600 text-white rounded-2xl flex items-center justify-center text-3xl shadow-sm">S</span>
              <span className="hidden sm:inline">Saathi</span>
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-2 lg:gap-6">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-colors font-bold text-lg ${
                      isActive 
                        ? 'bg-brand-50 text-brand-700' 
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className={`w-6 h-6 ${isActive ? 'fill-brand-100' : ''}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <Link to="/profile" className="p-3 rounded-full hover:bg-gray-100 flex items-center gap-2 transition-colors">
              <span className="hidden sm:inline font-bold text-gray-700 text-lg">Profile</span>
              <User className="w-8 h-8 text-gray-700 bg-gray-100 rounded-full p-1 border-2 border-gray-200" />
            </Link>
          </div>
        </header>
      )}

      <main className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
        <Outlet />
      </main>

      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-2 pb-safe md:relative md:border-t-0 md:bg-transparent md:p-0 z-50">
          <div className="max-w-4xl mx-auto flex justify-around items-center h-16 md:hidden">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center justify-center w-16 h-full gap-1 ${
                    isActive ? 'text-brand-600' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`w-7 h-7 ${isActive ? 'fill-brand-100' : ''}`} />
                  <span className="text-[11px] font-bold">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
