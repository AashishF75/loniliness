import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Calendar, ArrowRight, AlertCircle, MapPin } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { authService } from '../services/authService';

export function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    age: '',
    location: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password || !formData.age || !formData.location) {
      setError('Please fill in all fields.');
      return;
    }
    if (parseInt(formData.age) < 50) {
      setError('Saathi is designed for senior citizens aged 50 and above.');
      return;
    }

    setError('');
    setLoading(true);

    const res = await authService.register(formData);
    setLoading(false);

    if (res.success) {
      navigate('/onboarding');
    } else {
      setError(res.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-8 max-w-xl mx-auto w-full pt-4 md:pt-12">
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-brand-900 mb-4">Create Account</h1>
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
            <label className="text-xl font-bold text-gray-800">Full Name</label>
            <div className="relative">
              <User className="absolute left-5 top-1/2 -translate-y-1/2 w-7 h-7 text-gray-400" />
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Enter your full name"
                className="pl-16 h-16 text-xl rounded-2xl bg-gray-50 border-2 border-gray-200"
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
                className="pl-16 h-16 text-xl rounded-2xl bg-gray-50 border-2 border-gray-200"
              />
            </div>
          </div>
          
          <div className="flex flex-col gap-3">
            <label className="text-xl font-bold text-gray-800">Location (City or Area)</label>
            <div className="relative">
              <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-7 h-7 text-gray-400" />
              <Input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                placeholder="e.g. Delhi"
                className="pl-16 h-16 text-xl rounded-2xl bg-gray-50 border-2 border-gray-200"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-xl font-bold text-gray-800">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-7 h-7 text-gray-400" />
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="Enter your email"
                className="pl-16 h-16 text-xl rounded-2xl bg-gray-50 border-2 border-gray-200"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-xl font-bold text-gray-800">Password</label>
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-7 h-7 text-gray-400" />
              <Input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="Create a password"
                className="pl-16 pr-20 h-16 text-xl rounded-2xl bg-gray-50 border-2 border-gray-200"
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

          <Button type="submit" size="lg" className="h-18 text-2xl font-bold shadow-md w-full mt-4" disabled={loading}>
            {loading ? 'Creating Account...' : (
              <span className="flex items-center justify-center">
                Register <ArrowRight className="w-7 h-7 ml-3" />
              </span>
            )}
          </Button>
        </form>
      </Card>

      <div className="text-center">
        <p className="text-xl text-gray-600 font-medium">
          Already have an account?{' '}
          <button onClick={() => navigate('/login')} className="text-brand-700 font-bold hover:underline">
            Log in here
          </button>
        </p>
      </div>
    </div>
  );
}
