import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, MapPin, Calendar, Users, MessageCircle, Heart, Sparkles, Activity } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { userService } from '../services/userService';

export function Dashboard() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState({ name: 'User', city: '', area: 'Location not set' });
  const [mood, setMood] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const user = await userService.getUser();
      if (user) {
        setUserData({
          name: user.name || 'User',
          city: '',
          area: user.city || 'Location not set'
        });
      }
    };
    fetchData();
  }, []);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="flex flex-col gap-6 md:gap-8 pb-8">
      {/* Header Profile Section */}
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex flex-col">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">Good Morning, {userData.name}</h1>
          <p className="text-xl text-gray-500 mt-1 font-medium">{today}</p>
          <div className="flex items-center gap-2 mt-4 text-brand-700 font-bold text-xl">
            <MapPin className="w-6 h-6" />
            {userData.area}
          </div>
        </div>
        <div className="w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center shrink-0 border-4 border-brand-50 shadow-inner">
          <User className="w-10 h-10 text-brand-600" />
        </div>
      </div>

      {/* Mood Section */}
      <Card className="bg-brand-50/70 border-brand-100 p-6 md:p-8">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">How are you feeling today?</h2>
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => setMood('Good')}
            className={`flex flex-col items-center justify-center p-4 rounded-2xl border-4 transition-all ${
              mood === 'Good' ? 'bg-white border-brand-500 shadow-md scale-105' : 'bg-white border-transparent hover:border-brand-200'
            }`}
          >
            <span className="text-5xl md:text-6xl mb-3">😊</span>
            <span className="text-xl font-bold text-gray-700">Good</span>
          </button>
          
          <button
            onClick={() => setMood('Okay')}
            className={`flex flex-col items-center justify-center p-4 rounded-2xl border-4 transition-all ${
              mood === 'Okay' ? 'bg-white border-yellow-500 shadow-md scale-105' : 'bg-white border-transparent hover:border-yellow-200'
            }`}
          >
            <span className="text-5xl md:text-6xl mb-3">😐</span>
            <span className="text-xl font-bold text-gray-700">Okay</span>
          </button>

          <button
            onClick={() => setMood('Lonely')}
            className={`flex flex-col items-center justify-center p-4 rounded-2xl border-4 transition-all ${
              mood === 'Lonely' ? 'bg-white border-blue-500 shadow-md scale-105' : 'bg-white border-transparent hover:border-blue-200'
            }`}
          >
            <span className="text-5xl md:text-6xl mb-3">😔</span>
            <span className="text-xl font-bold text-gray-700">Lonely</span>
          </button>
        </div>

        {mood === 'Lonely' && (
          <div className="mt-8 p-6 md:p-8 bg-blue-50 border border-blue-200 rounded-3xl text-center shadow-sm">
            <p className="text-2xl font-bold text-blue-900 mb-6 leading-relaxed">
              "I'm here with you. Let Saathi help you find someone nearby."
            </p>
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-xl h-16 w-full sm:w-auto px-8" onClick={() => navigate('/people')}>
              <Users className="w-7 h-7 mr-3" /> Find a Companion
            </Button>
          </div>
        )}
      </Card>

      {/* Main Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
        
        {/* Ask Saathi */}
        <Card 
          className="col-span-1 sm:col-span-2 bg-gradient-to-r from-brand-600 to-brand-800 text-white border-none cursor-pointer hover:shadow-lg transition-all p-8"
          onClick={() => navigate('/ai-companion')}
        >
          <div className="flex items-center justify-between">
            <div className="pr-4">
              <h2 className="text-3xl font-extrabold mb-3 flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-brand-200" />
                Ask Saathi
              </h2>
              <p className="text-brand-100 text-xl leading-relaxed">Your personal AI companion is ready to chat or answer questions.</p>
            </div>
            <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center shrink-0 shadow-inner">
              <MessageCircle className="w-10 h-10 text-white" />
            </div>
          </div>
        </Card>

        {/* People Near You */}
        <Card 
          className="cursor-pointer border-gray-200 hover:border-brand-400 hover:shadow-md transition-all flex flex-col justify-between p-6"
          onClick={() => navigate('/people')}
        >
          <div className="flex justify-between items-start mb-8">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
              <Users className="w-8 h-8" />
            </div>
            <span className="bg-blue-100 text-blue-800 text-lg font-bold px-4 py-1.5 rounded-full">
              Nearby
            </span>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">People Near You</h3>
            <p className="text-xl text-gray-600">Find companions sharing your interests.</p>
          </div>
        </Card>

        {/* Today's Activities */}
        <Card 
          className="cursor-pointer border-gray-200 hover:border-brand-400 hover:shadow-md transition-all flex flex-col justify-between p-6"
          onClick={() => navigate('/activities')}
        >
          <div className="flex justify-between items-start mb-8">
            <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center">
              <Calendar className="w-8 h-8" />
            </div>
            <span className="bg-orange-100 text-orange-800 text-lg font-bold px-4 py-1.5 rounded-full">
              4:00 PM
            </span>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Today's Activities</h3>
            <p className="text-xl text-gray-600">Evening Yoga at Local Park.</p>
          </div>
        </Card>

        {/* My Connections */}
        <Card 
          className="cursor-pointer border-gray-200 hover:border-brand-400 hover:shadow-md transition-all flex flex-col justify-between p-6"
          onClick={() => navigate('/connections')}
        >
          <div className="w-16 h-16 bg-pink-100 text-pink-600 rounded-2xl flex items-center justify-center mb-8">
            <Heart className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">My Connections</h3>
            <p className="text-xl text-gray-600">View your saved friends and chats.</p>
          </div>
        </Card>

        {/* Family Updates */}
        <Card 
          className="cursor-pointer border-gray-200 hover:border-brand-400 hover:shadow-md transition-all flex flex-col justify-between p-6"
          onClick={() => navigate('/family')}
        >
          <div className="flex justify-between items-start mb-8">
            <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center">
              <Activity className="w-8 h-8" />
            </div>
            <span className="w-5 h-5 bg-red-500 rounded-full border-2 border-white shadow-sm"></span>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Family Updates</h3>
            <p className="text-xl text-gray-600">New message from your daughter.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
