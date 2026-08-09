import React, { useState, useEffect } from 'react';
import { User, LogOut, Settings, Bell, Heart, Edit3 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { userService } from '../services/userService';
import { authService } from '../services/authService';
import { useNavigate } from 'react-router-dom';

export function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    userService.getUser().then(data => setUser(data));
  }, []);

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center py-20">
        <Card className="p-10 text-center bg-brand-50/50 border-brand-100 flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-2xl font-bold text-brand-800">Loading profile...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-8">
      {/* Header Profile Section */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center md:items-start gap-8">
        <div className="w-32 h-32 bg-brand-100 rounded-full flex items-center justify-center shrink-0 border-8 border-brand-50 shadow-inner">
          <User className="w-16 h-16 text-brand-600" />
        </div>
        <div className="flex-1 text-center md:text-left flex flex-col gap-2 w-full">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <h1 className="text-4xl font-extrabold text-gray-900">{user.name}</h1>
            <Button variant="outline" className="border-gray-200">
              <Edit3 className="w-5 h-5 mr-2" /> Edit Profile
            </Button>
          </div>
          <p className="text-2xl text-gray-500 font-medium">Age {user.age} • {user.city}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <Heart className="w-7 h-7 text-brand-600" />
            My Interests
          </h2>
          <div className="flex flex-wrap gap-3">
            {(user.interests || []).map((interest: string) => (
              <span key={interest} className="px-4 py-2 bg-brand-50 text-brand-800 rounded-xl font-medium text-lg border border-brand-200">
                {interest}
              </span>
            ))}
            {(!user.interests || user.interests.length === 0) && (
              <p className="text-gray-500 text-lg">No interests added yet.</p>
            )}
          </div>
        </Card>

        <Card className="p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <Settings className="w-7 h-7 text-gray-600" />
            Settings
          </h2>
          <div className="flex flex-col gap-4">
            <Button variant="outline" className="justify-start h-16 text-xl bg-gray-50 border-gray-200 hover:bg-gray-100">
              <Bell className="w-6 h-6 mr-4 text-gray-600" /> Notifications
            </Button>
            <Button variant="outline" className="justify-start h-16 text-xl bg-gray-50 border-gray-200 hover:bg-gray-100">
              <ShieldAlert className="w-6 h-6 mr-4 text-gray-600" /> Privacy & Safety
            </Button>
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <Button size="lg" variant="outline" className="w-full h-16 text-xl text-red-600 border-red-200 bg-red-50 hover:bg-red-100" onClick={handleLogout}>
          <LogOut className="w-6 h-6 mr-2" /> Log Out
        </Button>
      </div>
    </div>
  );
}

// Temporary import for icon
import { ShieldAlert } from 'lucide-react';
