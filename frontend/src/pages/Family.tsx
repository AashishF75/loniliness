import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, Heart, Activity, CheckCircle, Calendar, Users } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { familyService } from '../services/familyService';
import { userService } from '../services/userService';

export function Family() {
  const [isShared, setIsShared] = useState(false);
  const [seniorName, setSeniorName] = useState('Ramesh Kumar');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const user = await userService.getUser();
      if (user) {
        setIsShared(user.familyConsent || false);
        setSeniorName(user.name || 'Ramesh Kumar');
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleToggle = async () => {
    const newVal = !isShared;
    setIsShared(newVal); // optimistic update
    
    const result = await familyService.toggleConsent();
    if (result !== null) {
      setIsShared(result);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Card className="p-10 text-center bg-brand-50/50 border-brand-100 flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-2xl font-bold text-brand-800">Loading family view...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 md:gap-8 pb-8">
      {/* Header */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-2">Family View</h1>
          <p className="text-xl text-gray-600 font-medium">Keep your loved ones updated safely.</p>
        </div>
        <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
          <Heart className="w-8 h-8" />
        </div>
      </div>

      {/* Privacy Section */}
      <Card className="bg-brand-50 border-brand-200 p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-start md:items-center gap-5">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-colors ${
            isShared ? 'bg-brand-100 text-brand-700 border-2 border-brand-200' : 'bg-gray-200 text-gray-600 border-2 border-gray-300'
          }`}>
            {isShared ? <Shield className="w-8 h-8" /> : <ShieldAlert className="w-8 h-8" />}
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 mb-1">Activity Sharing</h2>
            <p className={`text-base sm:text-xl font-bold ${isShared ? 'text-brand-700' : 'text-gray-500'}`}>
              {isShared ? "Your family can see your activity updates." : "Your activity is private."}
            </p>
          </div>
        </div>

        <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-2 md:mt-0">
          <input 
            type="checkbox" 
            className="sr-only peer" 
            checked={isShared}
            onChange={handleToggle}
          />
          <div className="w-20 h-10 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-10 peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-8 after:w-8 after:transition-all peer-checked:bg-brand-600 shadow-inner"></div>
        </label>
      </Card>

      {/* Dashboard View (Mock Data for Dashboard visually) */}
      <div className={`flex flex-col gap-6 transition-all duration-300 ${!isShared ? 'opacity-40 grayscale pointer-events-none' : 'opacity-100'}`}>
        <h2 className="text-3xl font-bold text-gray-900 px-2 mt-4">Senior: {seniorName}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <Card className="p-6 md:p-8 flex flex-col gap-5 border-l-8 border-l-brand-500 shadow-sm">
            <div className="flex items-center gap-3 text-brand-700">
              <Activity className="w-7 h-7" />
              <h3 className="text-2xl font-bold">Today's Activity</h3>
            </div>
            <div className="flex items-start gap-4 bg-brand-50 p-5 rounded-2xl border border-brand-100">
              <CheckCircle className="w-10 h-10 text-brand-600 shrink-0 mt-1" />
              <div>
                <p className="text-2xl font-extrabold text-gray-900 mb-1">Joined Morning Walk</p>
                <p className="text-xl text-gray-600 font-medium">7:00 AM</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 md:p-8 flex flex-col gap-5 shadow-sm">
            <div className="flex items-center gap-3 text-orange-600">
              <Calendar className="w-7 h-7" />
              <h3 className="text-2xl font-bold">Upcoming</h3>
            </div>
            <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100">
              <p className="text-2xl font-extrabold text-gray-900 mb-1">Yoga</p>
              <p className="text-xl text-gray-600 font-medium">Tomorrow at 8:00 AM</p>
            </div>
          </Card>

          <Card className="p-6 md:p-8 flex flex-col gap-5 md:col-span-2 shadow-sm">
            <div className="flex items-center gap-3 text-blue-600">
              <Users className="w-7 h-7" />
              <h3 className="text-2xl font-bold">Community</h3>
            </div>
            <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 flex items-center justify-between">
              <div>
                <p className="text-xl sm:text-2xl font-extrabold text-gray-900 mb-1">Connected with 2 people</p>
                <p className="text-lg sm:text-xl text-gray-600 font-medium">Suresh and Ravi</p>
              </div>
            </div>
          </Card>
          
        </div>
      </div>
      
    </div>
  );
}
