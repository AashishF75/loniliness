import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, MapPin, Map, Sun, Sunset, Moon, Shield, AlertCircle } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { userService } from '../services/userService';

const INTERESTS = [
  'Morning Walk', 'Yoga', 'Gardening', 'Bhajan', 
  'Reading', 'Cooking', 'Music', 'Storytelling', 'Spiritual Activities'
];

export function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState({
    city: '',
    area: '',
    interests: [] as string[],
    preferredTimes: [] as string[],
    familyConsent: false
  });

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const toggleInterest = (i: string) => {
    setData(prev => ({
      ...prev,
      interests: prev.interests.includes(i)
        ? prev.interests.filter(x => x !== i)
        : [...prev.interests, i]
    }));
  };

  const toggleTime = (t: string) => {
    setData(prev => ({
      ...prev,
      preferredTimes: prev.preferredTimes.includes(t)
        ? prev.preferredTimes.filter(x => x !== t)
        : [...prev.preferredTimes, t]
    }));
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      await userService.updateUser(data);
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to save profile. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-2xl mx-auto w-full pt-4 md:pt-12 pb-12">
      
      {/* Progress */}
      <div className="flex justify-between items-center mb-4 px-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl border-4 ${
              step >= i ? 'bg-brand-600 text-white border-brand-200 shadow-md' : 'bg-gray-100 text-gray-400 border-gray-50'
            }`}>
              {step > i ? <Check className="w-6 h-6" /> : i}
            </div>
            {i !== 4 && (
              <div className={`flex-1 h-2 mx-2 rounded-full ${
                step > i ? 'bg-brand-500' : 'bg-gray-100'
              }`} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-2xl flex items-center gap-3 border border-red-200">
          <AlertCircle className="w-6 h-6 shrink-0" />
          <p className="text-lg font-medium">{error}</p>
        </div>
      )}

      {/* STEP 1: Location */}
      {step === 1 && (
        <div className="animate-in fade-in slide-in-from-right-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold text-brand-900 mb-3">Where are you?</h1>
            <p className="text-xl text-gray-600">This helps us find friends and activities nearby.</p>
          </div>

          <Card className="p-8 md:p-10 shadow-lg">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <label className="text-xl font-bold text-gray-800">City</label>
                <div className="relative">
                  <Map className="absolute left-5 top-1/2 -translate-y-1/2 w-7 h-7 text-gray-400" />
                  <Input 
                    value={data.city}
                    onChange={e => setData({...data, city: e.target.value})}
                    placeholder="Enter your city" 
                    className="pl-16 h-16 text-lg sm:text-xl rounded-2xl bg-gray-50"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-xl font-bold text-gray-800">Local Area / Colony</label>
                <div className="relative">
                  <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-7 h-7 text-gray-400" />
                  <Input 
                    value={data.area}
                    onChange={e => setData({...data, area: e.target.value})}
                    placeholder="Enter your area" 
                    className="pl-16 h-16 text-lg sm:text-xl rounded-2xl bg-gray-50"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-10">
              <Button size="lg" className="w-full md:w-auto px-12 h-16 text-xl" onClick={handleNext} disabled={!data.city || !data.area}>
                Next Step
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* STEP 2: Interests */}
      {step === 2 && (
        <div className="animate-in fade-in slide-in-from-right-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold text-brand-900 mb-3">What do you enjoy?</h1>
            <p className="text-xl text-gray-600">Select activities you like. We'll match you with similar people.</p>
          </div>

          <Card className="p-8 shadow-lg">
            <div className="flex flex-wrap gap-4">
              {INTERESTS.map(interest => {
                const isSelected = data.interests.includes(interest);
                return (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={`px-4 sm:px-6 py-3 sm:py-4 rounded-2xl text-lg sm:text-xl font-bold transition-all border-4 ${
                      isSelected 
                        ? 'bg-brand-600 text-white border-brand-700 shadow-md scale-105' 
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-brand-300'
                    }`}
                  >
                    {interest}
                    {isSelected && <Check className="inline-block ml-2 w-6 h-6" />}
                  </button>
                )
              })}
            </div>

            <div className="flex justify-between mt-10">
              <Button size="lg" variant="outline" className="px-8 h-16 text-xl bg-gray-50" onClick={handleBack}>Back</Button>
              <Button size="lg" className="px-12 h-16 text-xl" onClick={handleNext} disabled={data.interests.length === 0}>
                Next Step
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* STEP 3: Preferred Times */}
      {step === 3 && (
        <div className="animate-in fade-in slide-in-from-right-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold text-brand-900 mb-3">When are you free?</h1>
            <p className="text-xl text-gray-600">Select your preferred times for activities.</p>
          </div>

          <Card className="p-8 shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { id: 'Morning', icon: <Sun className="w-10 h-10 mb-3" /> },
                { id: 'Afternoon', icon: <Sunset className="w-10 h-10 mb-3" /> },
                { id: 'Evening', icon: <Moon className="w-10 h-10 mb-3" /> }
              ].map(time => {
                const isSelected = data.preferredTimes.includes(time.id);
                return (
                  <button
                    key={time.id}
                    onClick={() => toggleTime(time.id)}
                    className={`flex flex-col items-center justify-center p-6 rounded-3xl border-4 transition-all ${
                      isSelected 
                        ? 'bg-brand-100 text-brand-700 border-brand-500 shadow-md scale-105' 
                        : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-brand-300'
                    }`}
                  >
                    {time.icon}
                    <span className="text-2xl font-bold">{time.id}</span>
                  </button>
                )
              })}
            </div>

            <div className="flex justify-between mt-10">
              <Button size="lg" variant="outline" className="px-8 h-16 text-xl bg-gray-50" onClick={handleBack}>Back</Button>
              <Button size="lg" className="px-12 h-16 text-xl" onClick={handleNext} disabled={data.preferredTimes.length === 0}>
                Next Step
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* STEP 4: Family Consent */}
      {step === 4 && (
        <div className="animate-in fade-in slide-in-from-right-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold text-brand-900 mb-3">Keep Family Updated</h1>
            <p className="text-xl text-gray-600">Would you like your family to see your joined activities?</p>
          </div>

          <Card className="p-8 md:p-10 shadow-lg text-center flex flex-col items-center gap-8">
            <div className="w-24 h-24 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center border-4 border-brand-50 shadow-inner">
              <Shield className="w-12 h-12" />
            </div>
            
            <p className="text-lg sm:text-2xl font-medium text-gray-800 leading-relaxed max-w-lg">
              Allow Saathi to share my activity updates with my family members for safety and peace of mind.
            </p>

            <label className="flex items-center gap-4 cursor-pointer bg-brand-50 p-6 rounded-3xl border-2 border-brand-200 w-full md:w-auto hover:bg-brand-100 transition-colors">
              <div className={`w-10 h-10 rounded-xl border-4 flex items-center justify-center transition-colors ${
                data.familyConsent ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-gray-400'
              }`}>
                {data.familyConsent && <Check className="w-6 h-6" />}
              </div>
              <span className="text-xl sm:text-2xl font-bold text-brand-900">I Agree to Share</span>
              <input 
                type="checkbox" 
                className="hidden"
                checked={data.familyConsent}
                onChange={e => setData({...data, familyConsent: e.target.checked})}
              />
            </label>

            <div className="flex justify-between w-full mt-6">
              <Button size="lg" variant="outline" className="px-8 h-16 text-xl bg-gray-50" onClick={handleBack}>Back</Button>
              <Button size="lg" className="px-12 h-16 text-xl bg-green-600 hover:bg-green-700 shadow-md" onClick={handleFinish} disabled={loading}>
                {loading ? 'Saving...' : 'Finish Setup'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
