import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Users, Calendar, ShieldCheck, MapPin, Sparkles, UserPlus, MessageCircle, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { motion, type Variants } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7 } }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 }
  }
};

export function Home() {
  const navigate = useNavigate();
  const { t } = useTranslation();

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
      } catch (e) {
        // invalid JSON
      }
    }
  }, [navigate]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900 -m-4 md:-m-6 lg:-m-8">
      {/* HEADER */}
      <header className="bg-white/90 backdrop-blur-md sticky top-0 z-50 py-3 md:py-4 px-4 sm:px-6 md:px-12 flex justify-between items-center border-b border-slate-200/60 shadow-sm">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-14 md:h-14 bg-brand-600 text-white rounded-xl md:rounded-2xl flex items-center justify-center font-bold text-xl md:text-3xl shadow-md shadow-brand-600/20">
            S
          </div>
          <span className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">{t('home.saathi')}</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col w-full items-center overflow-hidden">
        {/* HERO SECTION */}
        <section className="w-full px-4 sm:px-6 py-12 sm:py-20 md:py-24 lg:py-32 max-w-[1440px] mx-auto flex flex-col items-center text-center gap-6 md:gap-8 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[600px] h-[600px] bg-brand-400/10 blur-[120px] rounded-full pointer-events-none -z-10" />

          <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="flex flex-col items-center gap-6 md:gap-8 w-full max-w-5xl">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 bg-brand-50 text-brand-800 rounded-full text-sm sm:text-base md:text-lg font-semibold border border-brand-100 shadow-sm max-w-full text-left sm:text-center leading-snug">
              <Heart className="w-5 h-5 sm:w-6 sm:h-6 fill-brand-600 text-brand-600 shrink-0" />
              <span>{t('home.designedExclusively')}</span>
            </motion.div>

            <motion.h1 variants={fadeUp} className="font-extrabold text-slate-900 leading-[1.15] tracking-tight w-full" style={{ fontSize: 'clamp(2.5rem, 6vw + 1rem, 5rem)' }}>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-teal-600">{t('home.noElderAlone')}</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-lg sm:text-xl md:text-2xl text-slate-600 max-w-3xl leading-relaxed font-medium px-2">
              {t('home.aiPoweredDescription')}
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row w-full sm:w-auto gap-4 sm:gap-5 mt-6 md:mt-8 px-4 sm:px-0">
              <Button
                className="text-lg sm:text-xl md:text-2xl px-6 sm:px-8 md:px-12 py-5 sm:py-6 md:py-8 shadow-xl shadow-brand-600/20 rounded-2xl w-full sm:w-auto transition-transform hover:scale-[1.02] active:scale-[0.98] h-auto font-bold"
                onClick={() => navigate('/register?role=SENIOR')}
              >
                Senior Citizen <ArrowRight className="ml-2 sm:ml-3 w-6 h-6 sm:w-7 sm:h-7 shrink-0" />
              </Button>
              <Button
                variant="outline"
                className="text-lg sm:text-xl md:text-2xl px-6 sm:px-8 md:px-12 py-5 sm:py-6 md:py-8 shadow-sm rounded-2xl w-full sm:w-auto border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition-transform hover:scale-[1.02] active:scale-[0.98] h-auto font-bold"
                onClick={() => navigate('/register?role=FAMILY')}
              >
                I'm a Family Member
              </Button>
            </motion.div>
          </motion.div>
        </section>

        {/* HOW SAATHI HELPS */}
        <section className="w-full bg-white py-16 sm:py-24 md:py-32 border-y border-slate-200">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer} className="flex flex-col items-center max-w-7xl mx-auto">
              <motion.h2 variants={fadeUp} className="font-bold text-center text-slate-900 mb-12 sm:mb-16 tracking-tight" style={{ fontSize: 'clamp(2rem, 4vw + 1rem, 3rem)' }}>
                {t('home.howSaathiHelps')}
              </motion.h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10 w-full">
                {[
                  { icon: Users, title: t('home.findNearbyPeople'), desc: t('home.connectSeniorsDesc') },
                  { icon: Calendar, title: t('home.discoverActivities'), desc: t('home.discoverActivitiesDesc') },
                  { icon: Sparkles, title: t('home.aiRecommendations'), desc: t('home.aiRecommendationsDesc') }
                ].map((feature, idx) => (
                  <motion.div key={idx} variants={fadeUp} className="flex h-full">
                    <Card className="flex flex-col items-center text-center p-8 sm:p-10 lg:p-12 w-full h-full border-slate-100 bg-slate-50/50 rounded-3xl sm:rounded-[32px] transition-all duration-300 hover:shadow-2xl hover:shadow-brand-900/5 hover:-translate-y-2 group cursor-default">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 bg-brand-100 text-brand-600 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-6 sm:mb-8 transition-transform duration-300 group-hover:scale-110 group-hover:bg-brand-600 group-hover:text-white shadow-inner shrink-0">
                        <feature.icon className="w-10 h-10 sm:w-12 sm:h-12" />
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3 sm:mb-5">{feature.title}</h3>
                      <p className="text-slate-600 text-lg sm:text-xl leading-relaxed">{feature.desc}</p>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="w-full py-16 sm:py-24 md:py-32 bg-slate-50">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer} className="max-w-6xl mx-auto">
              <motion.h2 variants={fadeUp} className="font-bold text-slate-900 mb-16 sm:mb-20 tracking-tight" style={{ fontSize: 'clamp(2rem, 4vw + 1rem, 3rem)' }}>
                {t('home.howItWorks')}
              </motion.h2>

              <div className="flex flex-col md:flex-row justify-between items-start gap-12 sm:gap-16 relative">
                {/* Connecting Line for Desktop */}
                <div className="hidden md:block absolute top-[52px] lg:top-[60px] left-[15%] right-[15%] h-2 bg-slate-200 -z-10 rounded-full"></div>

                {[
                  { icon: MapPin, title: t('home.discover'), desc: t('home.discoverDesc') },
                  { icon: MessageCircle, title: t('home.connect'), desc: t('home.connectDesc') },
                  { icon: UserPlus, title: t('home.participate'), desc: t('home.participateDesc') }
                ].map((step, idx) => (
                  <motion.div key={idx} variants={fadeUp} className="flex flex-col items-center w-full md:w-1/3 px-2 sm:px-4 relative z-10">
                    <div className="w-24 h-24 lg:w-32 lg:h-32 bg-white border-[8px] lg:border-[10px] border-slate-50 ring-4 ring-brand-200 text-brand-600 rounded-full flex items-center justify-center shadow-xl shadow-brand-900/5 mb-6 lg:mb-8 shrink-0">
                      <step.icon className="w-10 h-10 lg:w-14 lg:h-14" />
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3 sm:mb-4">{step.title}</h3>
                    <p className="text-slate-600 text-lg sm:text-xl leading-relaxed max-w-[280px] md:max-w-full">{step.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* WHY SAATHI */}
        <section className="w-full bg-slate-900 text-white py-16 sm:py-24 md:py-32">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer} className="max-w-6xl mx-auto">
              <motion.h2 variants={fadeUp} className="font-bold text-center mb-12 sm:mb-16 tracking-tight text-white" style={{ fontSize: 'clamp(2rem, 4vw + 1rem, 3rem)' }}>
                {t('home.whyChooseSaathi')}
              </motion.h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 w-full">
                {[
                  { icon: Heart, title: t('home.elderFriendly'), desc: t('home.elderFriendlyDesc') },
                  { icon: MapPin, title: t('home.hyperlocal'), desc: t('home.hyperlocalDesc') },
                  { icon: ShieldCheck, title: t('home.safeCommunity'), desc: t('home.safeCommunityDesc') },
                  { icon: Users, title: t('home.meaningfulConnection'), desc: t('home.meaningfulConnectionDesc') }
                ].map((perk, idx) => (
                  <motion.div key={idx} variants={fadeUp} className="flex flex-col sm:flex-row items-start gap-6 sm:gap-8 p-6 sm:p-8 lg:p-10 rounded-3xl sm:rounded-[32px] bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 transition-colors w-full">
                    <div className="p-4 sm:p-5 lg:p-6 bg-brand-500/20 border border-brand-500/30 rounded-2xl sm:rounded-3xl shrink-0">
                      <perk.icon className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-brand-400" />
                    </div>
                    <div>
                      <h3 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 text-white">{perk.title}</h3>
                      <p className="text-slate-300 text-lg sm:text-xl leading-relaxed">{perk.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="w-full bg-slate-950 text-slate-400 py-12 sm:py-16 md:py-20 text-center">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 flex flex-col items-center gap-6 sm:gap-8 md:gap-10">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-800 text-slate-200 rounded-2xl sm:rounded-[32px] flex items-center justify-center font-bold text-3xl sm:text-4xl shadow-inner border border-slate-700 shrink-0">
            S
          </div>
          <p className="text-xl sm:text-2xl">{t('home.copyright', { year: new Date().getFullYear() })}</p>
          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-6 sm:gap-10 mt-2 sm:mt-4">
            <button className="text-lg sm:text-xl font-medium hover:text-white transition-colors">{t('home.privacyPolicy')}</button>
            <button className="text-lg sm:text-xl font-medium hover:text-white transition-colors">{t('home.termsOfService')}</button>
            <button className="text-lg sm:text-xl font-medium hover:text-white transition-colors">{t('home.helpCenter')}</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
