import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Calendar, ArrowRight, AlertCircle, MapPin } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { authService } from '../services/authService';
import { useTranslation } from 'react-i18next';

export function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    age: '',
    location: '',
    latitude: '',
    longitude: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [locationMessage, setLocationMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);

  const handleDetectLocation = () => {
    if (detecting) return;
    if (!navigator.geolocation) {
      setLocationMessage('Geolocation is not supported by your browser.');
      return;
    }
    setDetecting(true);
    setLocationMessage('Detecting...');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        let detectedLocationName = '';
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`, {
            headers: { 'Accept-Language': 'en' }
          });
          const data = await response.json();
          if (data && data.address) {
            const city = data.address.city || data.address.town || data.address.village || data.address.county || data.address.state_district;
            const state = data.address.state;
            if (city && state) {
              detectedLocationName = `${city}, ${state}`;
            } else if (city) {
              detectedLocationName = city;
            } else if (state) {
              detectedLocationName = state;
            }
          }
        } catch (err) {
          console.warn('Reverse geocoding failed:', err);
        }

        setFormData(prev => ({
          ...prev,
          latitude: lat.toString(),
          longitude: lon.toString(),
          ...(detectedLocationName ? { location: detectedLocationName } : {})
        }));

        if (detectedLocationName) {
          setLocationMessage('Location detected successfully!');
        } else {
          setLocationMessage('Location detected, but we couldn\'t determine the city. Please enter it manually.');
        }
        setDetecting(false);
      },
      (error) => {
        console.warn(error);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationMessage('Location permission denied. Please enter your location manually.');
        } else {
          setLocationMessage('Location access failed. Please enter your location manually.');
        }
        setDetecting(false);
      },
      { timeout: 10000 }
    );
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password || !formData.age || !formData.location) {
      setError('Please fill in all fields.');
      return;
    }
    if ((formData as any).role !== 'FAMILY' && parseInt(formData.age) < 50) {
      setError('Saathi is designed for senior citizens aged 50 and above.');
      return;
    }

    setError('');
    setLoading(true);

    const res = await authService.register(formData);
    setLoading(false);

    if (res.success) {
      navigate('/language-selection');
    } else {
      setError(res.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-8 max-w-xl mx-auto w-full pt-4 md:pt-12">
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-brand-900 mb-4">{t('auth.createAccount')}</h1>
        <p className="text-xl md:text-2xl text-gray-600 font-medium">Join our community and find companions nearby.</p>
      </div>

      <Card className="p-6 md:p-10 shadow-lg">
        <form onSubmit={handleRegister} className="flex flex-col gap-6">

          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-2xl flex items-center gap-3 border border-red-200">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <p className="text-lg font-medium">{error}</p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <label className="text-xl font-bold text-gray-800">{t('auth.name')}</label>
            <div className="relative">
              <User className="absolute left-5 top-1/2 -translate-y-1/2 w-7 h-7 text-gray-400" />
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Enter your full name"
                className="pl-16 h-16 text-lg sm:text-xl rounded-2xl bg-gray-50 border-2 border-gray-200"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-xl font-bold text-gray-800">Age</label>
            <div className="relative">
              <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-7 h-7 text-gray-400" />
              <Input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({...formData, age: e.target.value})}
                placeholder="Enter your age"
                className="pl-16 h-16 text-lg sm:text-xl rounded-2xl bg-gray-50 border-2 border-gray-200"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-xl font-bold text-gray-800">Location (City or Area)</label>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-7 h-7 text-gray-400" />
                <Input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  placeholder="e.g. Delhi"
                  className="pl-16 h-16 text-lg sm:text-xl rounded-2xl bg-gray-50 border-2 border-gray-200 w-full"
                />
              </div>
              <Button type="button" variant="outline" onClick={handleDetectLocation} disabled={detecting} className="h-16 px-6 text-lg font-bold border-2 shrink-0">
                {detecting ? 'Detecting...' : 'Detect Location'}
              </Button>
            </div>
            {locationMessage && (
              <p className={`text-sm font-medium ${locationMessage.includes('successfully') ? 'text-green-600' : 'text-brand-600'}`}>
                {locationMessage}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-xl font-bold text-gray-800">{t('auth.emailAddress')}</label>
            <div className="relative">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-7 h-7 text-gray-400" />
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="Enter your email"
                className="pl-16 h-16 text-lg sm:text-xl rounded-2xl bg-gray-50 border-2 border-gray-200"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-xl font-bold text-gray-800">{t('auth.password')}</label>
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-7 h-7 text-gray-400" />
              <Input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="Create a password"
                className="pl-16 pr-20 h-16 text-lg sm:text-xl rounded-2xl bg-gray-50 border-2 border-gray-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-brand-600 font-bold text-lg hover:text-brand-800"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <Button type="submit" size="lg" className="h-16 sm:h-[72px] text-xl sm:text-2xl font-bold shadow-md w-full mt-4" disabled={loading}>
            {loading ? '...' : (
              <span className="flex items-center justify-center">
                {t('auth.register')} <ArrowRight className="w-7 h-7 ml-3" />
              </span>
            )}
          </Button>
        </form>
      </Card>

      <div className="text-center">
        <p className="text-xl text-gray-600 font-medium">
          {t('auth.haveAccount')}{' '}
          <button onClick={() => navigate('/login')} className="text-brand-700 font-bold hover:underline">
            {t('auth.login')}
          </button>
        </p>
      </div>
    </div>
  );
}
