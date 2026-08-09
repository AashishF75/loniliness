import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Users, Calendar, ShieldCheck, MapPin, Sparkles, UserPlus, MessageCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export function Home() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 -m-4 md:-m-6 lg:-m-8">
      {/* Navbar / Header for landing page */}
      <header className="bg-white py-4 px-6 md:px-8 flex justify-between items-center border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-brand-600 text-white rounded-xl flex items-center justify-center font-bold text-2xl shadow-sm">
            S
          </div>
          <span className="text-2xl font-extrabold text-brand-700 tracking-tight">Saathi</span>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/login')}>Login</Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center">
        {/* 1. Hero Section */}
        <section className="w-full px-6 py-16 md:py-24 max-w-4xl mx-auto flex flex-col items-center text-center gap-8">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-100 text-brand-800 rounded-full text-base font-semibold mb-2">
            <Heart className="w-5 h-5 fill-brand-800" />
            Designed exclusively for senior citizens
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 leading-tight">
            No Elder Should <br className="hidden md:block" />
            <span className="text-brand-600">Feel Alone.</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 max-w-2xl leading-relaxed">
            AI-powered hyperlocal companionship for senior citizens. Find friends nearby, join meaningful activities, and stay connected safely.
          </p>
          <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-4 mt-6">
            <Button size="lg" className="text-xl w-full sm:w-auto shadow-lg" onClick={() => navigate('/onboarding')}>
              Get Started
            </Button>
            <Button variant="outline" size="lg" className="text-xl w-full sm:w-auto bg-white" onClick={() => navigate('/family')}>
              I'm a Family Member
            </Button>
          </div>
        </section>

        {/* 2. How Saathi Helps */}
        <section className="w-full bg-white py-16 md:py-24 border-y border-gray-100">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">How Saathi Helps</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="flex flex-col items-center text-center p-8 border-brand-100 bg-brand-50/50">
                <div className="w-20 h-20 bg-brand-100 text-brand-600 rounded-2xl flex items-center justify-center mb-6">
                  <Users className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Find Nearby People</h3>
                <p className="text-gray-600 text-lg leading-relaxed">Connect with other seniors in your neighborhood who share your unique interests.</p>
              </Card>
              <Card className="flex flex-col items-center text-center p-8 border-brand-100 bg-brand-50/50">
                <div className="w-20 h-20 bg-brand-100 text-brand-600 rounded-2xl flex items-center justify-center mb-6">
                  <Calendar className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Discover Activities</h3>
                <p className="text-gray-600 text-lg leading-relaxed">Join local yoga sessions, book clubs, park walks, and other engaging community events.</p>
              </Card>
              <Card className="flex flex-col items-center text-center p-8 border-brand-100 bg-brand-50/50">
                <div className="w-20 h-20 bg-brand-100 text-brand-600 rounded-2xl flex items-center justify-center mb-6">
                  <Sparkles className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">AI Recommendations</h3>
                <p className="text-gray-600 text-lg leading-relaxed">Our smart Saathi AI suggests friends and activities perfectly matched to your lifestyle.</p>
              </Card>
            </div>
          </div>
        </section>

        {/* 4. Simple 3-step explanation */}
        <section className="w-full py-16 md:py-24 bg-slate-50">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-16">How It Works</h2>
            <div className="flex flex-col md:flex-row justify-between items-center gap-12 relative">
              <div className="hidden md:block absolute top-10 left-16 right-16 h-1 bg-brand-200 -z-10 rounded-full"></div>
              
              <div className="flex flex-col items-center bg-slate-50 px-6">
                <div className="w-20 h-20 bg-white border-[6px] border-brand-500 text-brand-600 rounded-full flex items-center justify-center shadow-md mb-6">
                  <MapPin className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">1. Discover</h3>
              </div>
              
              <div className="flex flex-col items-center bg-slate-50 px-6">
                <div className="w-20 h-20 bg-white border-[6px] border-brand-500 text-brand-600 rounded-full flex items-center justify-center shadow-md mb-6">
                  <MessageCircle className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">2. Connect</h3>
              </div>

              <div className="flex flex-col items-center bg-slate-50 px-6">
                <div className="w-20 h-20 bg-white border-[6px] border-brand-500 text-brand-600 rounded-full flex items-center justify-center shadow-md mb-6">
                  <UserPlus className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">3. Participate</h3>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Why Saathi */}
        <section className="w-full bg-brand-900 text-white py-16 md:py-24">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Why Choose Saathi?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <div className="flex items-start gap-6 p-6 rounded-3xl bg-brand-800/80 border border-brand-700">
                <div className="p-4 bg-brand-700 rounded-2xl shrink-0">
                  <Heart className="w-8 h-8 text-brand-100" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">Elder-Friendly</h3>
                  <p className="text-brand-50 text-lg leading-relaxed">Large fonts, simple navigation, and clear instructions designed for ease of use.</p>
                </div>
              </div>
              <div className="flex items-start gap-6 p-6 rounded-3xl bg-brand-800/80 border border-brand-700">
                <div className="p-4 bg-brand-700 rounded-2xl shrink-0">
                  <MapPin className="w-8 h-8 text-brand-100" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">Hyperlocal</h3>
                  <p className="text-brand-50 text-lg leading-relaxed">Focus on people and activities safely within your walking distance or neighborhood.</p>
                </div>
              </div>
              <div className="flex items-start gap-6 p-6 rounded-3xl bg-brand-800/80 border border-brand-700">
                <div className="p-4 bg-brand-700 rounded-2xl shrink-0">
                  <ShieldCheck className="w-8 h-8 text-brand-100" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">Safe Community</h3>
                  <p className="text-brand-50 text-lg leading-relaxed">Verified profiles, family updates, and built-in SOS features keep you safe and secure.</p>
                </div>
              </div>
              <div className="flex items-start gap-6 p-6 rounded-3xl bg-brand-800/80 border border-brand-700">
                <div className="p-4 bg-brand-700 rounded-2xl shrink-0">
                  <Users className="w-8 h-8 text-brand-100" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">Meaningful Connection</h3>
                  <p className="text-brand-50 text-lg leading-relaxed">Move easily from online discovery to real-life, offline participation seamlessly.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 5. Footer */}
      <footer className="w-full bg-gray-900 text-gray-400 py-12 text-center">
        <div className="max-w-4xl mx-auto px-6 flex flex-col items-center gap-6">
          <div className="w-14 h-14 bg-gray-800 text-gray-200 rounded-2xl flex items-center justify-center font-bold text-3xl shadow-inner">
            S
          </div>
          <p className="text-xl">© {new Date().getFullYear()} Saathi. All rights reserved.</p>
          <div className="flex flex-wrap justify-center gap-6 mt-2">
            <button className="text-lg hover:text-white underline underline-offset-4 decoration-gray-600">Privacy Policy</button>
            <button className="text-lg hover:text-white underline underline-offset-4 decoration-gray-600">Terms of Service</button>
            <button className="text-lg hover:text-white underline underline-offset-4 decoration-gray-600">Help Center</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
