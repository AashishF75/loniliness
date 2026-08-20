import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { User, MapPin, Sparkles, Check, ArrowLeft, Loader2, Heart } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { userService } from '../services/userService';
import { connectionService } from '../services/connectionService';
import { safetyService } from '../services/safetyService';
import { useTranslation } from 'react-i18next';

export function PublicProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const distance = location.state?.distance; // Distance passed from People page

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Harassment');
  const [reportDescription, setReportDescription] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const [publicProfile, currentUser, connections, outgoing] = await Promise.all([
          userService.getPublicProfile(id),
          userService.getUser(),
          connectionService.getConnections(),
          connectionService.getOutgoingRequests()
        ]);

        if (!publicProfile) {
          setErrorMsg(t('publicProfile.profileNotFound'));
        } else {
          setProfile(publicProfile);
        }

        if (currentUser?.hobbies) {
          setUserInterests(currentUser.hobbies.map((h: any) => h.name));
        } else if (currentUser?.interests) {
          setUserInterests(currentUser.interests);
        }

        const isAccepted = connections.some((c: any) => c.userId === id);
        const isPending = outgoing.includes(id);

        if (isAccepted) setConnectionStatus('CONNECTED');
        else if (isPending) setConnectionStatus('PENDING');

        setIsConnected(isAccepted || isPending);
      } catch (err: any) {
        setErrorMsg(t('publicProfile.profileNotFound'));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleConnect = async () => {
    if (!profile) return;
    setIsSending(true);
    const result = await connectionService.sendConnectionRequest(profile);
    setIsSending(false);
    if (result.success) {
      setIsConnected(true);
      setConnectionStatus('PENDING');
    }
  };

  const handleBlock = async () => {
    if (!profile) return;
    if (window.confirm(t('publicProfile.blockConfirm', { name: profile.name }))) {
      try {
        await safetyService.blockUser(profile.id);
        alert(t('publicProfile.blockSuccess', { name: profile.name }));
        navigate('/people'); // Go back to people list after blocking
      } catch (err) {
        alert(t('publicProfile.blockFailed'));
      }
    }
  };

  const handleReportSubmit = async () => {
    if (!profile) return;
    setIsReporting(true);
    try {
      await safetyService.reportUser(profile.id, reportReason, reportDescription);
      alert(t('publicProfile.reportSuccess'));
      setShowReportModal(false);
      setReportDescription('');
    } catch (err) {
      alert(t('publicProfile.reportFailed'));
    } finally {
      setIsReporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Card className="p-10 text-center bg-brand-50/50 border-brand-100 flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
          <p className="text-2xl font-bold text-brand-800">{t('publicProfile.loadingProfile')}</p>
        </Card>
      </div>
    );
  }

  if (errorMsg || !profile) {
    return (
      <div className="flex flex-col items-center py-20 gap-6">
        <Card className="p-10 text-center bg-red-50 border-red-200">
          <p className="text-2xl font-bold text-red-800">{errorMsg || t('publicProfile.profileNotFound')}</p>
        </Card>
        <Button onClick={() => navigate(-1)} size="lg" variant="outline">
          <ArrowLeft className="w-5 h-5 mr-2" /> {t('publicProfile.goBack')}
        </Button>
      </div>
    );
  }

  // Calculate common interests
  const profileInterests = Array.isArray(profile.hobbies) ? profile.hobbies.map((h:any) => h.name) : [];
  const shared = profileInterests.filter((i: string) => userInterests.includes(i));

  let percent = 55;
  if (shared.length === 1) percent = 70;
  else if (shared.length === 2) percent = 85;
  else if (shared.length >= 3) percent = 95;

  return (
    <div className="max-w-4xl mx-auto pb-10 pt-16 md:pt-0">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-brand-700 hover:text-brand-900 font-bold mb-6 transition-colors"
      >
        <ArrowLeft className="w-6 h-6" />
        {t('publicProfile.backToPeople')}
      </button>

      <Card className="overflow-hidden border-0 shadow-lg bg-white">
        <div className="h-32 md:h-48 bg-gradient-to-r from-brand-500 to-emerald-600"></div>
        <div className="px-6 md:px-12 pb-10 -mt-16 md:-mt-24 relative">
          <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-end">
            <div className="w-32 h-32 md:w-48 md:h-48 bg-brand-50 border-4 border-white shadow-xl rounded-full flex items-center justify-center shrink-0">
              <User className="w-16 h-16 md:w-24 md:h-24 text-brand-600" />
            </div>

            <div className="flex-1 text-center md:text-left pb-2">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight break-words">
                {profile.name}
              </h1>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 sm:gap-4 mt-3">
                <span className="text-base sm:text-xl font-medium text-gray-600 flex items-center gap-1">
                  {profile.age !== null && profile.age !== undefined ? t('publicProfile.ageVal', { age: profile.age }) : t('publicProfile.ageHidden')}
                </span>
                <span className="w-1.5 h-1.5 bg-gray-300 rounded-full"></span>
                <span className="text-base sm:text-xl font-medium text-gray-600 flex items-center gap-1">
                  <MapPin className="w-5 h-5" />
                  {profile.locality || profile.city ? `${profile.locality ? profile.locality + ', ' : ''}${profile.city || ''}` : profile.city === null ? t('publicProfile.locationHidden') : t('publicProfile.locationNotSet')}
                </span>
              </div>
            </div>

            <div className="w-full md:w-auto shrink-0 pb-2">
              <Button
                size="lg"
                className={`w-full md:w-48 h-16 text-xl font-bold shadow-md ${connectionStatus === 'CONNECTED' ? 'bg-green-100 text-green-800 border-2 border-green-500' : isConnected ? 'bg-gray-100 text-gray-800 border-2 border-gray-300' : ''}`}
                onClick={handleConnect}
                disabled={isConnected || isSending}
                variant={connectionStatus === 'CONNECTED' ? 'outline' : isConnected ? 'outline' : 'primary'}
              >
                {isSending ? t('publicProfile.sending') : connectionStatus === 'CONNECTED' ? t('publicProfile.connected') : connectionStatus === 'PENDING' ? t('publicProfile.requestSent') : t('publicProfile.connect')}
              </Button>
              <div className="flex gap-4 mt-2 justify-center md:justify-start">
                <button
                  onClick={() => setShowReportModal(true)}
                  className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors underline"
                >
                  {t('publicProfile.reportUser')}
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={handleBlock}
                  className="text-sm font-medium text-red-500 hover:text-red-700 transition-colors underline"
                >
                  {t('publicProfile.blockUser')}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              {profile.bio && (
                <div className="bg-slate-50 p-6 rounded-3xl border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{t('publicProfile.aboutMe')}</h3>
                  <p className="text-lg text-gray-700 leading-relaxed">{profile.bio}</p>
                </div>
              )}

              <div className="bg-slate-50 p-6 rounded-3xl border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-4">{t('publicProfile.interests')}</h3>
                {profile.hobbies === undefined ? (
                  <p className="text-lg text-gray-500 italic">{t('publicProfile.interestsHidden')}</p>
                ) : profileInterests.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {profileInterests.map((interest: string) => {
                      const isShared = shared.includes(interest);
                      return (
                        <span
                          key={interest}
                          className={`px-4 py-2 rounded-xl text-lg font-medium flex items-center gap-2 ${
                            isShared ? 'bg-brand-600 text-white shadow-sm' : 'bg-white text-gray-700 border border-gray-300'
                          }`}
                        >
                          {interest}
                          {isShared && <Check className="w-5 h-5" />}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-lg text-gray-500 italic">{t('publicProfile.noInterests')}</p>
                )}
              </div>
            </div>

            <div className="space-y-6">
              {(distance !== undefined && distance !== null) && (
                <div className="bg-brand-50 p-6 rounded-3xl border border-brand-100 flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <MapPin className="w-6 h-6 text-brand-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-brand-600 uppercase tracking-wider">{t('publicProfile.distanceLabel')}</p>
                    <p className="text-2xl font-extrabold text-gray-900">{t('publicProfile.distanceKm', { distance })}</p>
                  </div>
                </div>
              )}

              <div className="bg-brand-50 p-6 rounded-3xl border border-brand-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <Sparkles className="w-6 h-6 text-brand-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-brand-600 uppercase tracking-wider">{t('publicProfile.compatibility')}</p>
                    <p className="text-2xl font-extrabold text-gray-900">{profile.hobbies === undefined ? t('publicProfile.hidden') : t('publicProfile.percentMatch', { percent })}</p>
                  </div>
                </div>

                <h4 className="font-bold text-gray-900 mb-2">{t('publicProfile.commonInterests')}</h4>
                {profile.hobbies === undefined ? (
                  <p className="text-gray-600 italic">{t('publicProfile.interestsHidden')}</p>
                ) : shared.length > 0 ? (
                  <ul className="space-y-2">
                    {shared.map((s: string) => (
                      <li key={s} className="flex items-center gap-2 text-lg text-gray-700">
                        <Heart className="w-5 h-5 text-rose-500" /> {s}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-600 italic">{t('publicProfile.gettingToKnow')}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="bg-white w-full max-w-md p-6 flex flex-col gap-4">
            <h2 className="text-2xl font-bold text-gray-900">{t('publicProfile.reportName', { name: profile?.name })}</h2>
            <p className="text-gray-600">{t('publicProfile.reportDesc')}</p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('publicProfile.reason')}</label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <option value="Harassment">{t('publicProfile.harassment')}</option>
                <option value="Spam">{t('publicProfile.spam')}</option>
                <option value="Fake Profile">{t('publicProfile.fakeProfile')}</option>
                <option value="Inappropriate Content">{t('publicProfile.inappropriateContent')}</option>
                <option value="Other">{t('publicProfile.other')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('publicProfile.detailsOptional')}</label>
              <textarea
                value={reportDescription}
                onChange={e => setReportDescription(e.target.value)}
                placeholder={t('publicProfile.provideDetails')}
                className="flex w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 min-h-[100px]"
              />
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setShowReportModal(false)}>{t('publicProfile.cancel')}</Button>
              <Button onClick={handleReportSubmit} disabled={isReporting} className="bg-red-600 hover:bg-red-700 text-white border-red-600">
                {isReporting ? t('publicProfile.submitting') : t('publicProfile.submitReport')}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
