import React, { useState, useEffect } from 'react';
import { User, LogOut, Settings, Bell, Heart, Edit3, X, Save, Globe } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { userService } from '../services/userService';
import { authService } from '../services/authService';
import { safetyService } from '../services/safetyService';
import { useNavigate } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { useTranslation } from 'react-i18next';

export function Profile() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [showBlockedUsers, setShowBlockedUsers] = useState(false);

  useEffect(() => {
    userService.getUser().then(data => setUser(data));
    safetyService.getBlockedUsers().then(data => setBlockedUsers(data));
  }, []);

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const handleEditClick = () => {
    setEditData({
      name: user.name || '',
      age: user.age || '',
      city: user.city || '',
      locality: user.locality || user.area || '',
      interests: (user.interests || (user.hobbies ? user.hobbies.map((h: any) => h.name || h) : [])).join(', '),
      bio: user.bio || '',
      eventReminder: user.eventReminder || '1_DAY'
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const interestsArray = (editData.interests || '').split(',').map((i: string) => i.trim()).filter(Boolean);
    try {
      const updated = await userService.updateUser({
        name: editData.name,
        age: parseInt(editData.age) || undefined,
        city: editData.city,
        locality: editData.locality,
        interests: interestsArray,
        bio: editData.bio,
        eventReminder: editData.eventReminder
      });
      setUser(updated);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrivacyToggle = async (field: string, value: boolean) => {
    try {
      const updated = await userService.updateUser({ [field]: value });
      setUser(updated);
    } catch (err) {
      alert('Failed to update privacy settings.');
    }
  };

  const handleUnblock = async (userId: string) => {
    try {
      await safetyService.unblockUser(userId);
      setBlockedUsers(blockedUsers.filter(b => b.blocked.id !== userId));
      alert('User unblocked successfully.');
    } catch (err) {
      alert('Failed to unblock user.');
    }
  };

  const displayInterests = user?.interests || (user?.hobbies ? user.hobbies.map((h: any) => h.name || h) : []);

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
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 break-words">{user.name}</h1>
            <Button variant="outline" className="border-gray-200" onClick={handleEditClick}>
              <Edit3 className="w-5 h-5 mr-2" /> {t('profile.editProfile')}
            </Button>
          </div>
          <p className="text-2xl text-gray-500 font-medium">{t('profile.age')} {user.age} • {user.city}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <Heart className="w-7 h-7 text-brand-600" />
            {t('profile.interests')}
          </h2>
          <div className="flex flex-wrap gap-3">
            {displayInterests.map((interest: string) => (
              <span key={interest} className="px-4 py-2 bg-brand-50 text-brand-800 rounded-xl font-medium text-lg border border-brand-200">
                {interest}
              </span>
            ))}
            {displayInterests.length === 0 && (
              <p className="text-gray-500 text-lg">No interests added yet.</p>
            )}
          </div>
        </Card>

        <Card className="p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <Settings className="w-7 h-7 text-gray-600" />
            {t('profile.settings')}
          </h2>
          <div className="flex flex-col gap-4">
            <Button variant="outline" className="justify-start h-16 text-base sm:text-xl bg-gray-50 border-gray-200 hover:bg-gray-100 min-w-0">
              <Bell className="w-5 h-5 sm:w-6 sm:h-6 mr-3 sm:mr-4 text-gray-600 shrink-0" /> <span className="truncate">Notifications</span>
            </Button>
            <Button variant="outline" className="justify-start h-16 text-base sm:text-xl bg-gray-50 border-gray-200 hover:bg-gray-100 min-w-0">
              <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6 mr-3 sm:mr-4 text-gray-600 shrink-0" /> <span className="truncate">Privacy & Safety</span>
            </Button>
            <Button variant="outline" className="justify-start h-16 text-base sm:text-xl bg-gray-50 border-gray-200 hover:bg-gray-100 min-w-0" onClick={() => setShowBlockedUsers(true)}>
              <User className="w-5 h-5 sm:w-6 sm:h-6 mr-3 sm:mr-4 text-gray-600 shrink-0" /> <span className="truncate">Blocked Users ({blockedUsers.length})</span>
            </Button>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4">{t('profile.privacy')}</h3>

              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <span className="text-lg font-medium text-gray-700">Show my age</span>
                  <Button
                    variant={user.showAge !== false ? "primary" : "outline"}
                    onClick={() => handlePrivacyToggle('showAge', user.showAge === false)}
                    className="w-24"
                  >
                    {user.showAge !== false ? 'ON' : 'OFF'}
                  </Button>
                </div>

                <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <span className="text-lg font-medium text-gray-700">{t('profile.locationVisibility')}</span>
                  <Button
                    variant={user.showLocation !== false ? "primary" : "outline"}
                    onClick={() => handlePrivacyToggle('showLocation', user.showLocation === false)}
                    className="w-24"
                  >
                    {user.showLocation !== false ? 'ON' : 'OFF'}
                  </Button>
                </div>

                <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <span className="text-lg font-medium text-gray-700">Show my interests</span>
                  <Button
                    variant={user.showInterests !== false ? "primary" : "outline"}
                    onClick={() => handlePrivacyToggle('showInterests', user.showInterests === false)}
                    className="w-24"
                  >
                    {user.showInterests !== false ? 'ON' : 'OFF'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Globe className="w-6 h-6 text-brand-600" />
                {t('language.changeLanguage')}
              </h3>
              <p className="text-gray-600 mb-4">{t('language.subtitle')}</p>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 relative">
                <select
                  className="w-full bg-white border border-gray-300 text-gray-800 text-lg rounded-xl focus:ring-brand-500 focus:border-brand-500 block p-3 appearance-none cursor-pointer"
                  value={i18n.language || 'en'}
                  onChange={(e) => {
                    const lang = e.target.value;
                    i18n.changeLanguage(lang);
                    localStorage.setItem('saathi_language', lang);
                  }}
                >
                  <option value="en">🇬🇧 {t('language.english')} (English)</option>
                  <option value="hi">🇮🇳 {t('language.hindi')} (Hindi)</option>
                  <option value="te">🇮🇳 {t('language.telugu')} (Telugu)</option>
                  <option value="ml">🇮🇳 {t('language.malayalam')} (Malayalam)</option>
                  <option value="bho">🇮🇳 {t('language.bhojpuri')} (Bhojpuri)</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center px-2 text-gray-700">
                  <svg className="fill-current h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <Button size="lg" variant="outline" className="w-full h-16 text-xl text-red-600 border-red-200 bg-red-50 hover:bg-red-100" onClick={handleLogout}>
          <LogOut className="w-6 h-6 mr-2" /> Log Out
        </Button>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold text-gray-900">{t('profile.editProfile')}</h2>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                <X className="w-6 h-6" />
              </Button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <Input value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.age')}</label>
                <Input type="number" value={editData.age} onChange={e => setEditData({...editData, age: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <Input value={editData.city} onChange={e => setEditData({...editData, city: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Locality / Area</label>
                <Input value={editData.locality} onChange={e => setEditData({...editData, locality: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.interests')} (comma separated)</label>
                <Input value={editData.interests} onChange={e => setEditData({...editData, interests: e.target.value})} placeholder="Reading, Gardening, Walking" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.bio')}</label>
                <textarea
                  value={editData.bio}
                  onChange={e => setEditData({...editData, bio: e.target.value})}
                  className="flex w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-transparent min-h-[100px]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Reminders</label>
                <select
                  value={editData.eventReminder}
                  onChange={e => setEditData({...editData, eventReminder: e.target.value})}
                  className="flex w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-transparent"
                >
                  <option value="1_DAY">1 Day Before</option>
                  <option value="1_HOUR">1 Hour Before</option>
                  <option value="NONE">Disable Reminders</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setIsEditing(false)}>{t('profile.cancel')}</Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? '...' : <><Save className="w-5 h-5 mr-2" /> {t('profile.saveChanges')}</>}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Blocked Users Modal */}
      {showBlockedUsers && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold text-gray-900">Blocked Users</h2>
              <Button variant="outline" size="sm" onClick={() => setShowBlockedUsers(false)}>
                <X className="w-6 h-6" />
              </Button>
            </div>

            <div className="flex flex-col gap-4">
              {blockedUsers.length === 0 ? (
                <p className="text-gray-500 text-lg">You have no blocked users.</p>
              ) : (
                blockedUsers.map(block => (
                  <div key={block.id} className="flex justify-between items-center border border-gray-200 p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-brand-600" />
                      </div>
                      <span className="text-lg font-semibold">{block.blocked.name}</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleUnblock(block.blocked.id)}>
                      Unblock
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}

// Temporary import for icon
import { ShieldAlert } from 'lucide-react';
