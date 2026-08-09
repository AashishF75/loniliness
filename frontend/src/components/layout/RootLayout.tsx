import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, Users, Calendar, MessageCircle, Heart, User, Bell, Check, CheckCircle2 } from 'lucide-react';
import { notificationService } from '../../services/notificationService';

export function RootLayout() {
  const location = useLocation();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      const token = localStorage.getItem('saathi_auth_token');
      if (!token) return;
      
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
      
      if (showNotifications) {
        const list = await notificationService.getNotifications();
        setNotifications(list);
      }
    };
    
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // polling
    return () => clearInterval(interval);
  }, [showNotifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await notificationService.markAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllAsRead = async () => {
    await notificationService.markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  
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

            <div className="flex items-center gap-4">
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-3 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors relative"
                >
                  <Bell className="w-7 h-7 text-gray-700" />
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-5 h-5 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white border border-gray-200 shadow-xl rounded-2xl overflow-hidden z-[100] flex flex-col max-h-[80vh]">
                    <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
                      <h3 className="font-bold text-lg text-gray-800">Notifications</h3>
                      {unreadCount > 0 && (
                        <button onClick={handleMarkAllAsRead} className="text-sm font-semibold text-brand-600 hover:text-brand-800">
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="overflow-y-auto flex-1 p-2">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-gray-500 font-medium">
                          No notifications yet.
                        </div>
                      ) : (
                        notifications.map((notif: any) => (
                          <div 
                            key={notif.id} 
                            className={`p-4 mb-2 rounded-xl flex gap-3 transition-colors ${
                              notif.isRead ? 'bg-white hover:bg-gray-50' : 'bg-brand-50 hover:bg-brand-100'
                            }`}
                          >
                            <div className="shrink-0 mt-1">
                              {notif.type === 'NEW_CONNECTION_REQUEST' ? <Users className="w-6 h-6 text-brand-600" /> :
                               notif.type === 'CONNECTION_ACCEPTED' ? <CheckCircle2 className="w-6 h-6 text-green-600" /> :
                               notif.type === 'NEW_MESSAGE' ? <MessageCircle className="w-6 h-6 text-blue-600" /> :
                               <Bell className="w-6 h-6 text-gray-500" />
                              }
                            </div>
                            <div className="flex-1">
                              <h4 className="font-bold text-gray-900">{notif.title}</h4>
                              <p className="text-gray-700 text-sm mt-0.5">{notif.message}</p>
                              <span className="text-xs text-gray-500 block mt-2 font-medium">
                                {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            {!notif.isRead && (
                              <button 
                                onClick={(e) => handleMarkAsRead(notif.id, e)}
                                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/50 text-gray-500 hover:text-brand-600"
                                title="Mark as read"
                              >
                                <Check className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Link to="/profile" className="p-2 md:p-3 rounded-full hover:bg-gray-100 flex items-center gap-2 transition-colors">
                <span className="hidden sm:inline font-bold text-gray-700 text-lg">Profile</span>
                <User className="w-8 h-8 text-gray-700 bg-gray-100 rounded-full p-1 border-2 border-gray-200" />
              </Link>
            </div>
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
