import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Heart, User, Bell, Check, CheckCircle2, MessageCircle, Users, Home, Calendar, Link2, XCircle, Shield } from 'lucide-react';
import { notificationService } from '../../services/notificationService';
import { connectionService } from '../../services/connectionService';

export function RootLayout() {
  const location = useLocation();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();
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

  const handleAcceptConnection = async (notif: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (notif.relatedConnectionId) {
      await connectionService.updateConnectionStatus(notif.relatedConnectionId, 'ACCEPTED');
      window.dispatchEvent(new Event('connections_updated'));
      await notificationService.markAsRead(notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true, type: 'CONNECTION_ACCEPTED', message: 'You accepted the connection request.' } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const handleRejectConnection = async (notif: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (notif.relatedConnectionId) {
      await connectionService.updateConnectionStatus(notif.relatedConnectionId, 'REJECTED');
      window.dispatchEvent(new Event('connections_updated'));
      await notificationService.markAsRead(notif.id);
      setNotifications(prev => prev.filter(n => n.id !== notif.id));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const handleNotificationClick = (notif: any) => {
    if (!notif.isRead && notif.type !== 'NEW_CONNECTION_REQUEST') {
      handleMarkAsRead(notif.id, { preventDefault: () => {}, stopPropagation: () => {} } as any);
    }
    
    if (notif.type.startsWith('EVENT_')) {
      setShowNotifications(false);
      navigate('/events');
    }
  };

  const userStr = localStorage.getItem('saathi_onboarding');
  const user = userStr ? JSON.parse(userStr) : null;
  const isAdmin = user?.role === 'ADMIN';

  const navItems = [
    { path: '/dashboard', label: 'Home', icon: Home },
    { path: '/people', label: 'People', icon: Users },
    { path: '/connections', label: 'Connections', icon: Link2 },
    { path: '/events', label: 'Events', icon: Calendar },
    { path: '/activities', label: 'Activities', icon: Calendar },
    { path: '/ai-companion', label: 'Saathi', icon: MessageCircle },
    { path: '/family', label: 'Family', icon: Heart },
  ];

  if (isAdmin) {
    navItems.push({ path: '/admin', label: 'Admin Dashboard', icon: Shield });
  }

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
                  <div className="fixed top-20 left-4 right-4 sm:absolute sm:top-auto sm:left-auto sm:right-0 sm:mt-2 w-auto sm:w-80 md:w-96 bg-white border border-gray-200 shadow-xl rounded-2xl overflow-hidden z-[100] flex flex-col max-h-[70vh] sm:max-h-[80vh]">
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
                            onClick={() => handleNotificationClick(notif)}
                            className={`p-4 mb-2 rounded-xl flex gap-3 transition-colors ${notif.type.startsWith('EVENT_') ? 'cursor-pointer ' : ''}${
                              notif.isRead ? 'bg-white hover:bg-gray-50' : 'bg-brand-50 hover:bg-brand-100'
                            }`}
                          >
                            <div className="shrink-0 mt-1">
                              {notif.type === 'NEW_CONNECTION_REQUEST' ? <Users className="w-6 h-6 text-brand-600" /> :
                               notif.type === 'CONNECTION_ACCEPTED' ? <CheckCircle2 className="w-6 h-6 text-green-600" /> :
                               notif.type === 'NEW_MESSAGE' ? <MessageCircle className="w-6 h-6 text-blue-600" /> :
                               notif.type === 'EVENT_REMINDER' ? <Bell className="w-6 h-6 text-yellow-600" /> :
                               notif.type === 'EVENT_UPDATED' ? <Calendar className="w-6 h-6 text-blue-600" /> :
                               notif.type === 'EVENT_CANCELLED' ? <XCircle className="w-6 h-6 text-red-600" /> :
                               notif.type === 'EVENT_PARTICIPANT_JOINED' ? <Users className="w-6 h-6 text-green-600" /> :
                               <Bell className="w-6 h-6 text-gray-500" />
                              }
                            </div>
                            <div className="flex-1">
                              <h4 className="font-bold text-gray-900">{notif.title}</h4>
                              <p className="text-gray-700 text-sm mt-0.5">{notif.message}</p>
                              <span className="text-xs text-gray-500 block mt-2 font-medium">
                                {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {(notif.type === 'NEW_CONNECTION_REQUEST' && notif.connectionStatus === 'PENDING') && (
                                <div className="flex gap-2 mt-3">
                                  <button onClick={(e) => handleAcceptConnection(notif, e)} className="px-4 py-1.5 bg-brand-600 text-white rounded-lg font-bold text-sm hover:bg-brand-700 transition-colors">Accept</button>
                                  <button onClick={(e) => handleRejectConnection(notif, e)} className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded-lg font-bold text-sm hover:bg-gray-300 transition-colors">Reject</button>
                                </div>
                              )}
                            </div>
                            {!notif.isRead && notif.type !== 'NEW_CONNECTION_REQUEST' && (
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
          <div className="w-full flex justify-between items-center h-16 md:hidden px-0 sm:px-1 gap-0 sm:gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center justify-center flex-1 min-w-0 h-full gap-0.5 sm:gap-1 rounded-xl transition-colors ${
                    isActive ? 'text-brand-600 bg-brand-50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 ${isActive ? 'fill-brand-100' : ''}`} />
                  <span className="text-[9px] sm:text-[10px] md:text-[11px] font-bold text-center leading-tight truncate w-full px-0.5">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
