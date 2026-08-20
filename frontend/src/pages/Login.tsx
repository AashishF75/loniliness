import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { authService } from '../services/authService';
import { useTranslation } from 'react-i18next';

export function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    const token = localStorage.getItem('saathi_auth_token');
    const userStr = localStorage.getItem('saathi_user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.role === 'ADMIN') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      } catch (e) {}
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);

    const res = await authService.login(email, password);
    setLoading(false);

    if (res.success) {
      if (res.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/dashboard'); // or onboarding if they are new, but for MVP dashboard is fine
      }
    } else {
      setError(res.message || 'Login failed. Please try again.');
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-8 max-w-xl mx-auto w-full pt-4 md:pt-12">
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-brand-900 mb-4">{t('auth.welcomeBack')}</h1>
        <p className="text-xl md:text-2xl text-gray-600 font-medium">Log in to continue your journey with Saathi.</p>
      </div>

      <Card className="p-6 md:p-10 shadow-lg">
        <form onSubmit={handleLogin} className="flex flex-col gap-8">

          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-2xl flex items-center gap-3 border border-red-200">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <p className="text-lg font-medium">{error}</p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <label className="text-xl font-bold text-gray-800">{t('auth.emailAddress')}</label>
            <div className="relative">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-7 h-7 text-gray-400" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
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
                {t('auth.login')} <ArrowRight className="w-7 h-7 ml-3" />
              </span>
            )}
          </Button>
        </form>
      </Card>

      <div className="text-center">
        <p className="text-xl text-gray-600 font-medium">
          {t('auth.dontHaveAccount')}{' '}
          <button onClick={() => navigate('/register')} className="text-brand-700 font-bold hover:underline">
            {t('auth.register')}
          </button>
        </p>
      </div>
    </div>
  );
}
