import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { User, MapPin, Sparkles, Check, ArrowLeft, Loader2, Heart } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { userService } from '../services/userService';
import { connectionService } from '../services/connectionService';
import { safetyService } from '../services/safetyService';

export function PublicProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
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
          setErrorMsg('Profile not found.');
        } else {
          setProfile(publicProfile);
        }

        if (currentUser?.interests) setUserInterests(currentUser.interests);

        const isAccepted = connections.some((c: any) => c.userId === id);
        const isPending = outgoing.includes(id);

        if (isAccepted) setConnectionStatus('CONNECTED');
        else if (isPending) setConnectionStatus('PENDING');
        
        setIsConnected(isAccepted || isPending);
      } catch (err: any) {
        setErrorMsg('Failed to load profile.');
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
    if (window.confirm(`Are you sure you want to block ${profile.name}? They will no longer be able to message you or see your profile.`)) {
      try {
        await safetyService.blockUser(profile.id);
        alert(`${profile.name} has been blocked.`);
        navigate('/app/people'); // Go back to people list after blocking
      } catch (err) {
        alert('Failed to block user.');
      }
    }
  };

  const handleReportSubmit = async () => {
    if (!profile) return;
    setIsReporting(true);
    try {
      await safetyService.reportUser(profile.id, reportReason, reportDescription);
      alert('Report submitted successfully. Thank you.');
      setShowReportModal(false);
      setReportDescription('');
    } catch (err) {
      alert('Failed to submit report.');
    } finally {
      setIsReporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Card className="p-10 text-center bg-brand-50/50 border-brand-100 flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
          <p className="text-2xl font-bold text-brand-800">Loading profile...</p>
        </Card>
      </div>
    );
  }

  if (errorMsg || !profile) {
    return (
      <div className="flex flex-col items-center py-20 gap-6">
        <Card className="p-10 text-center bg-red-50 border-red-200">
          <p className="text-2xl font-bold text-red-800">{errorMsg || 'Profile not found.'}</p>
        </Card>
        <Button onClick={() => navigate(-1)} size="lg" variant="outline">
          <ArrowLeft className="w-5 h-5 mr-2" /> Go Back
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
    <div className="max-w-4xl mx-auto pb-10">
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center gap-2 text-brand-700 hover:text-brand-900 font-bold mb-6 transition-colors"
      >
        <ArrowLeft className="w-6 h-6" />
        Back to People
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
                  Age {profile.age || 'N/A'}
                </span>
                <span className="w-1.5 h-1.5 bg-gray-300 rounded-full"></span>
                <span className="text-base sm:text-xl font-medium text-gray-600 flex items-center gap-1">
                  <MapPin className="w-5 h-5" />
                  {profile.locality ? `${profile.locality}, ${profile.city}` : profile.city || 'Location not set'}
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
                {isSending ? 'Sending...' : connectionStatus === 'CONNECTED' ? 'Connected' : connectionStatus === 'PENDING' ? 'Request Sent' : 'Connect'}
              </Button>
              <div className="flex gap-4 mt-2 justify-center md:justify-start">
                <button 
                  onClick={() => setShowReportModal(true)}
                  className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors underline"
                >
                  Report User
                </button>
                <span className="text-gray-300">|</span>
                <button 
                  onClick={handleBlock}
                  className="text-sm font-medium text-red-500 hover:text-red-700 transition-colors underline"
                >
                  Block User
                </button>
              </div>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              {profile.bio && (
                <div className="bg-slate-50 p-6 rounded-3xl border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">About Me</h3>
                  <p className="text-lg text-gray-700 leading-relaxed">{profile.bio}</p>
                </div>
              )}
              
              <div className="bg-slate-50 p-6 rounded-3xl border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Interests</h3>
                {profileInterests.length > 0 ? (
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
                  <p className="text-lg text-gray-500 italic">No interests specified yet.</p>
                )}
              </div>
            </div>

            <div className="space-y-6">
              {distance && (
                <div className="bg-brand-50 p-6 rounded-3xl border border-brand-100 flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <MapPin className="w-6 h-6 text-brand-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-brand-600 uppercase tracking-wider">Distance</p>
                    <p className="text-2xl font-extrabold text-gray-900">{distance} km</p>
                  </div>
                </div>
              )}

              <div className="bg-brand-50 p-6 rounded-3xl border border-brand-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <Sparkles className="w-6 h-6 text-brand-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-brand-600 uppercase tracking-wider">Compatibility</p>
                    <p className="text-2xl font-extrabold text-gray-900">{percent}% Match</p>
                  </div>
                </div>
                
                <h4 className="font-bold text-gray-900 mb-2">Common Interests</h4>
                {shared.length > 0 ? (
                  <ul className="space-y-2">
                    {shared.map((s: string) => (
                      <li key={s} className="flex items-center gap-2 text-lg text-gray-700">
                        <Heart className="w-5 h-5 text-rose-500" /> {s}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-600 italic">You're still getting to know each other.</p>
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
            <h2 className="text-2xl font-bold text-gray-900">Report {profile?.name}</h2>
            <p className="text-gray-600">Please let us know why you are reporting this user. We will review this report and take appropriate action.</p>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
              <select 
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <option value="Harassment">Harassment or Bullying</option>
                <option value="Spam">Spam</option>
                <option value="Fake Profile">Fake Profile</option>
                <option value="Inappropriate Content">Inappropriate Content</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Details (Optional)</label>
              <textarea 
                value={reportDescription} 
                onChange={e => setReportDescription(e.target.value)}
                placeholder="Provide additional details..."
                className="flex w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 min-h-[100px]"
              />
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setShowReportModal(false)}>Cancel</Button>
              <Button onClick={handleReportSubmit} disabled={isReporting} className="bg-red-600 hover:bg-red-700 text-white border-red-600">
                {isReporting ? 'Submitting...' : 'Submit Report'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
