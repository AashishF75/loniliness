import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users,
  UserPlus,
  Heart,
  MapPin,
  Activity,
  CheckCircle,
  XCircle,
  Trash2,
  Send,
  Clock,
  Radio,
  AlertTriangle,
  ShieldCheck,
  Eye,
  EyeOff,
  Calendar
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusPill } from '../components/ui/StatusPill';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { SectionHeader } from '../components/ui/SectionHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/LoadingState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { familyService, type FamilyRelationship, type FamilyMemberUser } from '../services/familyService';
import { userService } from '../services/userService';
import { FamilyMap } from '../components/FamilyMap';

function FamilyEventsViewerModal({ targetUser, onClose }: { targetUser: FamilyMemberUser; onClose: () => void }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'organized'>('upcoming');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventsData, setEventsData] = useState<{ upcoming: any[]; past: any[]; organized: any[] }>({
    upcoming: [],
    past: [],
    organized: []
  });

  useEffect(() => {
    fetchEvents();
  }, [targetUser?.id]);

  const fetchEvents = async () => {
    if (!targetUser?.id || targetUser.id === 'undefined') {
      setError('Invalid user selected for viewing events');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await familyService.getMemberEvents(targetUser.id);
      if (res.success && res.events) {
        setEventsData({
          upcoming: res.events.upcoming || [],
          past: res.events.past || [],
          organized: res.events.organized || []
        });
      } else {
        setError(res.message || 'Failed to load events');
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching events');
    } finally {
      setLoading(false);
    }
  };

  const currentList = eventsData[activeTab] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <Card className="w-full max-w-2xl max-h-[85vh] flex flex-col bg-white rounded-3xl shadow-2xl overflow-hidden border-none">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-brand-700 to-brand-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-7 h-7 text-brand-200 shrink-0" />
            <div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-white">{targetUser.name}'s Events</h3>
              <p className="text-xs sm:text-sm text-brand-100 font-medium">Activity & Event Participation Overview</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-gray-100 bg-gray-50/50 p-2 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'upcoming'
                ? 'bg-brand-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-200/60'
            }`}
          >
            <Clock className="w-4 h-4" />
            Upcoming ({eventsData.upcoming.length})
          </button>

          <button
            onClick={() => setActiveTab('past')}
            className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'past'
                ? 'bg-brand-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-200/60'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            Past ({eventsData.past.length})
          </button>

          <button
            onClick={() => setActiveTab('organized')}
            className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'organized'
                ? 'bg-brand-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-200/60'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Organized ({eventsData.organized.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {loading ? (
            <LoadingState message="Loading event details..." />
          ) : error ? (
            <div className="p-4 bg-red-50 text-red-700 rounded-2xl font-bold border border-red-200 text-center">
              {error}
            </div>
          ) : currentList.length === 0 ? (
            <EmptyState
              title={`No ${activeTab} events found`}
              description={`This user currently has no ${activeTab} events listed.`}
            />
          ) : (
            currentList.map((ev: any) => (
              <div
                key={ev.id}
                className="p-4 sm:p-5 rounded-2xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:border-brand-300 hover:shadow-md transition-all space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-100 text-brand-800 mb-1">
                      {ev.category}
                    </span>
                    <h4 className="text-lg font-extrabold text-gray-900">{ev.title}</h4>
                  </div>
                  <Badge variant={ev.dynamicStatus === 'COMPLETED' ? 'secondary' : ev.dynamicStatus === 'CANCELLED' ? 'amber' : 'primary'}>
                    {ev.dynamicStatus || 'UPCOMING'}
                  </Badge>
                </div>

                <p className="text-sm text-gray-600 line-clamp-2">{ev.description}</p>

                <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm font-semibold text-gray-500 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 text-gray-700">
                    <Calendar className="w-4 h-4 text-brand-600" />
                    {new Date(ev.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-700">
                    <Clock className="w-4 h-4 text-brand-600" />
                    {ev.startTime} - {ev.endTime}
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-700">
                    <MapPin className="w-4 h-4 text-brand-600" />
                    {ev.location}
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-700">
                    <Users className="w-4 h-4 text-brand-600" />
                    {ev.participantCount || 0} participants
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <Button onClick={onClose} variant="secondary" className="px-6 py-2.5 font-bold rounded-xl">
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
}

function ParentLocationViewer({ rel, onOpenEvents }: { rel: FamilyRelationship; onOpenEvents?: (user: FamilyMemberUser) => void }) {
  const { t } = useTranslation();
  const [showMap, setShowMap] = useState(false);

  const perms = rel.permissions || {
    shareActivities: false,
    shareLiveLocation: false,
    isLocationSharingActive: false
  };

  const isAuthorized = perms.shareLiveLocation && perms.isLocationSharingActive;

  return (
    <Card className="p-5 sm:p-7 flex flex-col gap-6 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      {/* Parent Header Card */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <Avatar name={rel.parent?.name || 'Parent Senior'} size="xl" colorScheme="purple" />
          <div className="flex flex-col">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl sm:text-2xl font-extrabold text-gray-900">{rel.parent?.name || 'Parent Senior'}</h3>
              <Badge variant="purple">{t('family.roleMember')}</Badge>
            </div>
            <p className="text-sm sm:text-base text-gray-500 font-medium">{rel.parent?.city || rel.parent?.email}</p>
          </div>
        </div>

        <StatusPill
          status={isAuthorized ? 'live' : 'offline'}
          label={isAuthorized ? t('family.liveLocationOn') : t('family.liveLocationOff')}
          size="md"
        />
      </div>

      {/* Permission Summary Indicators */}
      <div className="grid grid-cols-2 gap-3 text-sm font-semibold text-gray-600">
        <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 flex items-center justify-between">
          <span className="flex items-center gap-2 text-gray-700">
            <Activity className="w-4 h-4 text-purple-600" />
            {t('family.shareActivities')}
          </span>
          <StatusPill
            status={perms.shareActivities ? 'active' : 'disabled'}
            label={perms.shareActivities ? 'ON' : 'OFF'}
            size="sm"
            showDot={false}
          />
        </div>
        <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 flex items-center justify-between">
          <span className="flex items-center gap-2 text-gray-700">
            <MapPin className="w-4 h-4 text-blue-600" />
            {t('family.shareLiveLocation')}
          </span>
          <StatusPill
            status={perms.shareLiveLocation ? 'connected' : 'disabled'}
            label={perms.shareLiveLocation ? 'ON' : 'OFF'}
            size="sm"
            showDot={false}
          />
        </div>
      </div>

      {/* Action Buttons: Current Location & View Events */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button
          onClick={() => setShowMap(!showMap)}
          variant={showMap ? 'outline' : 'primary'}
          className={`py-3.5 text-base font-extrabold rounded-2xl flex items-center justify-center gap-2 transition-all ${
            showMap ? 'border-gray-300 text-gray-700 hover:bg-gray-100' : 'bg-brand-600 text-white hover:bg-brand-700 shadow-md'
          }`}
        >
          {showMap ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          {showMap ? t('family.hideLiveLocation') : 'View Current Location'}
        </Button>

        <Button
          onClick={() => rel.parent && onOpenEvents && onOpenEvents(rel.parent)}
          variant="outline"
          className="py-3.5 text-base font-extrabold rounded-2xl flex items-center justify-center gap-2 border-brand-300 text-brand-700 hover:bg-brand-50"
        >
          <Calendar className="w-5 h-5 text-brand-600" />
          View Events
        </Button>
      </div>

      {/* Embedded Map or Location Unavailable Notice */}
      {showMap && (
        <div className="mt-1">
          {isAuthorized ? (
            <FamilyMap
              parentId={rel.parentId}
              parentName={rel.parent?.name || 'Parent Senior'}
              isSharingActive={true}
              onClose={() => setShowMap(false)}
            />
          ) : (
            <div className="p-5 bg-amber-50/80 border border-amber-200 text-amber-900 rounded-2xl text-base font-bold flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-amber-950 mb-1">{t('family.permissionDenied')}</p>
                <p className="text-sm font-medium text-amber-800">{t('family.parentLocationUnavailable')}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export function Family() {
  const { t } = useTranslation();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Senior state
  const [members, setMembers] = useState<FamilyRelationship[]>([]);
  const [outgoingInvites, setOutgoingInvites] = useState<FamilyRelationship[]>([]);

  // Family Member state
  const [parents, setParents] = useState<FamilyRelationship[]>([]);
  const [incomingInvites, setIncomingInvites] = useState<FamilyRelationship[]>([]);

  // Invitation Form
  const [inviteIdentifier, setInviteIdentifier] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Viewing Events Modal state
  const [viewingEventsUser, setViewingEventsUser] = useState<FamilyMemberUser | null>(null);

  // Permission update tracking
  const [updatingPermId, setUpdatingPermId] = useState<string | null>(null);

  // Remove confirm dialog state
  const [removeDialogState, setRemoveDialogState] = useState<{ isOpen: boolean; relId: string | null; memberName: string }>({
    isOpen: false,
    relId: null,
    memberName: ''
  });
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    loadData();

    const handleConnectionsUpdated = () => {
      loadData();
    };

    window.addEventListener('connections_updated', handleConnectionsUpdated);
    return () => {
      window.removeEventListener('connections_updated', handleConnectionsUpdated);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const user = await userService.getUser();
      setCurrentUser(user);

      const [membersRes, invRes, parentsRes] = await Promise.all([
        familyService.getFamilyMembers(),
        familyService.getInvitations(),
        familyService.getConnectedParents()
      ]);

      if (membersRes.success) {
        setMembers(membersRes.members || membersRes.data || []);
      }
      if (invRes.success) {
        setOutgoingInvites(invRes.outgoing || invRes.data?.outgoing || []);
        setIncomingInvites(invRes.incoming || invRes.data?.incoming || []);
      }
      if (parentsRes.success) {
        setParents(parentsRes.parents || parentsRes.data || []);
      }
    } catch (err) {
      console.error('Error loading family data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteIdentifier.trim()) return;

    setInviting(true);
    setInviteMessage(null);

    const res = await familyService.inviteFamilyMember(inviteIdentifier.trim());
    setInviting(false);

    if (res.success) {
      setInviteMessage({ type: 'success', text: t('family.inviteSuccess') });
      setInviteIdentifier('');
      const invRes = await familyService.getInvitations();
      if (invRes.success) {
        setOutgoingInvites(invRes.outgoing || invRes.data?.outgoing || []);
      }
    } else {
      setInviteMessage({ type: 'error', text: res.error || 'Failed to send invitation' });
    }
  };

  const handleRespondInvite = async (relationshipId: string, accept: boolean) => {
    const res = accept
      ? await familyService.acceptInvitation(relationshipId)
      : await familyService.rejectInvitation(relationshipId);
    if (res.success) {
      loadData();
      window.dispatchEvent(new Event('connections_updated'));
    }
  };

  const confirmRemoveMember = (relId: string, name: string) => {
    setRemoveDialogState({
      isOpen: true,
      relId,
      memberName: name
    });
  };

  const handleExecuteRemoveMember = async () => {
    if (!removeDialogState.relId) return;
    setIsRemoving(true);
    const res = await familyService.removeFamilyMember(removeDialogState.relId);
    setIsRemoving(false);
    setRemoveDialogState({ isOpen: false, relId: null, memberName: '' });

    if (res.success) {
      loadData();
      window.dispatchEvent(new Event('connections_updated'));
    }
  };

  const handleTogglePermission = async (
    relationshipId: string,
    key: 'shareActivities' | 'shareLiveLocation' | 'isLocationSharingActive',
    currentVal: boolean,
    currentPerms: any
  ) => {
    setUpdatingPermId(relationshipId);

    const updated = {
      shareActivities: currentPerms.shareActivities,
      shareLiveLocation: currentPerms.shareLiveLocation,
      isLocationSharingActive: currentPerms.isLocationSharingActive,
      [key]: !currentVal
    };

    if (key === 'shareLiveLocation' && currentVal) {
      updated.isLocationSharingActive = false;
    }

    const res = await familyService.updatePermissions(relationshipId, updated);
    setUpdatingPermId(null);

    if (res.success && (res.permissions || res.data)) {
      const newPerms = res.permissions || res.data;
      setMembers((prev) =>
        prev.map((m) => (m.id === relationshipId ? { ...m, permissions: newPerms } : m))
      );
    }
  };

  if (loading) {
    return <LoadingState message={t('family.sending')} />;
  }

  const isSeniorSharingLiveLocation = members.some(
    (m) => m.permissions?.shareLiveLocation && m.permissions?.isLocationSharingActive
  );

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-8 pb-12 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Heart className="w-9 h-9 text-brand-600 fill-brand-600" />
            {t('family.title')}
          </h1>
          <p className="text-base sm:text-lg text-gray-600 font-medium mt-1">
            {t('family.subtitle')}
          </p>
        </div>
      </div>

      {/* Incoming Invitations Notice */}
      {incomingInvites.length > 0 && (
        <Card className="p-6 bg-gradient-to-r from-amber-500 to-amber-600 text-white border-none shadow-md rounded-3xl">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-amber-100" />
              <h2 className="text-xl font-bold">{t('family.incomingInvitations')}</h2>
              <Badge variant="amber">{incomingInvites.length}</Badge>
            </div>
            <p className="text-amber-100 text-sm font-medium">
              {t('family.incomingInvitationsDesc')}
            </p>

            <div className="flex flex-col gap-3 mt-1">
              {incomingInvites.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-4 bg-white/10 rounded-2xl backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <Avatar name={inv.parent?.name || inv.member?.name || 'User'} size="md" colorScheme="amber" />
                    <div>
                      <p className="font-bold text-white">{inv.parent?.name || inv.member?.name || 'Family Connection Request'}</p>
                      <p className="text-xs text-amber-100">{inv.parent?.email || inv.member?.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleRespondInvite(inv.id, true)}
                      className="bg-white text-amber-900 hover:bg-amber-100 font-extrabold px-4 py-2 text-sm rounded-xl"
                    >
                      <CheckCircle className="w-4 h-4 mr-1 text-green-600 inline" />
                      {t('family.accept')}
                    </Button>
                    <Button
                      onClick={() => handleRespondInvite(inv.id, false)}
                      className="bg-amber-700/60 text-white hover:bg-amber-700 font-bold px-3 py-2 text-sm rounded-xl"
                    >
                      <XCircle className="w-4 h-4 mr-1 inline" />
                      {t('family.reject')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* SENIOR VIEW: Family Overview Bar */}
      {currentUser?.role === 'SENIOR' && (
        <Card className="p-6 md:p-8 bg-gradient-to-r from-brand-700 to-brand-900 text-white border-none shadow-lg rounded-3xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white">{t('family.familyOverview')}</h2>
                <Badge variant="purple" size="md">
                  {t('family.connectedMembersCount', { count: members.length })}
                </Badge>
              </div>
              <p className="text-brand-100 text-base sm:text-lg font-medium">
                {isSeniorSharingLiveLocation
                  ? t('family.liveLocationSharingDesc')
                  : t('family.parentSharingNotice')}
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-4">
              <StatusPill
                status={isSeniorSharingLiveLocation ? 'live' : 'offline'}
                label={isSeniorSharingLiveLocation ? t('family.liveSharingGlobalOn') : t('family.liveSharingGlobalOff')}
                size="lg"
                className="bg-white/10 text-white border-white/20"
              />
              {isSeniorSharingLiveLocation && (
                <Button
                  onClick={async () => {
                    for (const m of members) {
                      if (m.permissions?.isLocationSharingActive) {
                        await familyService.updatePermissions(m.id, {
                          shareActivities: m.permissions.shareActivities,
                          shareLiveLocation: m.permissions.shareLiveLocation,
                          isLocationSharingActive: false
                        });
                      }
                    }
                    loadData();
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white font-extrabold px-6 py-2.5 rounded-2xl text-base shadow-md"
                >
                  {t('family.stopSharingButton')}
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Invite Family Member Section */}
      <Card className="p-6 md:p-8 flex flex-col gap-6 border-gray-200 shadow-sm rounded-3xl">
        <SectionHeader
          title={t('family.inviteFamilyMember')}
          icon={<UserPlus className="w-7 h-7 text-brand-600" />}
        />

        <form onSubmit={handleSendInvite} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={inviteIdentifier}
            onChange={(e) => setInviteIdentifier(e.target.value)}
            placeholder={t('family.enterIdentifier')}
            className="flex-1 px-5 py-3.5 text-base sm:text-lg rounded-2xl border-2 border-gray-200 focus:border-brand-500 focus:ring-0 outline-none font-medium transition-colors"
            disabled={inviting}
          />
          <Button
            type="submit"
            disabled={inviting || !inviteIdentifier.trim()}
            className="bg-brand-600 hover:bg-brand-700 text-white font-extrabold px-8 py-3.5 rounded-2xl text-base sm:text-lg flex items-center justify-center gap-2 shadow-md shrink-0"
          >
            <Send className="w-5 h-5" />
            {inviting ? t('family.sending') : t('family.sendInvite')}
          </Button>
        </form>

        {inviteMessage && (
          <div className={`p-4 rounded-2xl text-base font-bold flex items-center gap-2 ${
            inviteMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {inviteMessage.type === 'success' ? <CheckCircle className="w-5 h-5 text-green-600 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />}
            {inviteMessage.text}
          </div>
        )}

        {/* Outgoing pending invites */}
        {outgoingInvites.length > 0 && (
          <div className="mt-2 border-t border-gray-100 pt-6 flex flex-col gap-3">
            <h3 className="text-lg font-bold text-gray-700">{t('family.pendingInvitations')}</h3>
            <div className="flex flex-col gap-3">
              {outgoingInvites.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <Avatar name={inv.member?.name || inv.parent?.name || 'User'} size="md" colorScheme="amber" />
                    <div>
                      <p className="text-lg font-bold text-gray-900">{inv.member?.name || inv.parent?.name || inv.member?.email || 'Invited User'}</p>
                      <p className="text-sm text-gray-500">{inv.member?.email || inv.parent?.email || inv.member?.phone}</p>
                    </div>
                  </div>
                  <StatusPill status="pending" label={t('family.statusPending')} size="sm" />
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Persistent Connected Family Members Section (For Senior Role) */}
      {currentUser?.role === 'SENIOR' && (
        <div className="flex flex-col gap-6">
          <SectionHeader
            title={t('family.connectedFamily')}
            subtitle={t('family.parentControls')}
            icon={<Users className="w-8 h-8 text-brand-600" />}
            badge={<Badge variant="primary">{members.length}</Badge>}
          />

          {members.length === 0 ? (
            <EmptyState
              title={t('family.noFamilyMembers')}
              description={t('family.familyAccessDesc')}
              icon={<Users className="w-8 h-8 text-brand-600" />}
            />
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {members.map((rel) => {
                const perms = rel.permissions || {
                  shareActivities: false,
                  shareLiveLocation: false,
                  isLocationSharingActive: false
                };

                return (
                  <Card key={rel.id} className="p-6 md:p-8 flex flex-col gap-6 border-gray-200 shadow-sm rounded-3xl hover:shadow-md transition-all">
                    {/* Member Details Bar */}
                    <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                      <div className="flex items-center gap-4">
                        <Avatar name={rel.member?.name || 'Family Member'} size="xl" colorScheme="brand" />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-2xl font-extrabold text-gray-900">{rel.member?.name || 'Family Member'}</h3>
                            <StatusPill status="connected" label={t('family.statusAccepted')} size="sm" />
                          </div>
                          <p className="text-base text-gray-500 font-medium">{rel.member?.email || rel.member?.phone}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          onClick={() => rel.member && setViewingEventsUser(rel.member)}
                          variant="outline"
                          className="border-brand-200 text-brand-700 hover:bg-brand-50 px-4 py-2.5 rounded-2xl font-bold flex items-center gap-2"
                        >
                          <Calendar className="w-4 h-4 text-brand-600" />
                          View Member's Events
                        </Button>
                        <Button
                          onClick={() => confirmRemoveMember(rel.id, rel.member?.name || 'Family Member')}
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50 p-3 rounded-2xl shrink-0"
                          title={t('family.remove')}
                        >
                          <Trash2 className="w-6 h-6" />
                        </Button>
                      </div>
                    </div>

                    {/* Granular Permission Toggles */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Share Activities Toggle */}
                      <div className={`p-5 rounded-2xl border-2 transition-all flex flex-col justify-between gap-4 ${
                        perms.shareActivities ? 'bg-green-50/70 border-green-300' : 'bg-gray-50 border-gray-200'
                      }`}>
                        <div className="flex items-center gap-3">
                          <Activity className={`w-6 h-6 ${perms.shareActivities ? 'text-green-600' : 'text-gray-400'}`} />
                          <span className="text-lg font-bold text-gray-900">{t('family.shareActivities')}</span>
                        </div>
                        <div className="flex items-center justify-between pt-2">
                          <span className={`text-sm font-extrabold ${perms.shareActivities ? 'text-green-700' : 'text-gray-500'}`}>
                            {perms.shareActivities ? t('family.activitiesShared') : t('family.activitiesPrivate')}
                          </span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={perms.shareActivities}
                              disabled={updatingPermId === rel.id}
                              onChange={() => handleTogglePermission(rel.id, 'shareActivities', perms.shareActivities, perms)}
                            />
                            <div className="w-14 h-8 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-brand-600"></div>
                          </label>
                        </div>
                      </div>

                      {/* Live Location Permission Toggle */}
                      <div className={`p-5 rounded-2xl border-2 transition-all flex flex-col justify-between gap-4 ${
                        perms.shareLiveLocation ? 'bg-blue-50/70 border-blue-300' : 'bg-gray-50 border-gray-200'
                      }`}>
                        <div className="flex items-center gap-3">
                          <MapPin className={`w-6 h-6 ${perms.shareLiveLocation ? 'text-blue-600' : 'text-gray-400'}`} />
                          <span className="text-lg font-bold text-gray-900">{t('family.shareLiveLocation')}</span>
                        </div>
                        <div className="flex items-center justify-between pt-2">
                          <span className={`text-sm font-extrabold ${perms.shareLiveLocation ? 'text-blue-700' : 'text-gray-500'}`}>
                            {perms.shareLiveLocation ? t('family.liveLocationOn') : t('family.liveLocationOff')}
                          </span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={perms.shareLiveLocation}
                              disabled={updatingPermId === rel.id}
                              onChange={() => handleTogglePermission(rel.id, 'shareLiveLocation', perms.shareLiveLocation, perms)}
                            />
                            <div className="w-14 h-8 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      </div>

                      {/* Location Active State Toggle */}
                      <div className={`p-5 rounded-2xl border-2 transition-all flex flex-col justify-between gap-4 ${
                        perms.isLocationSharingActive ? 'bg-green-50/70 border-green-300' : 'bg-gray-50 border-gray-200'
                      } ${!perms.shareLiveLocation ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div className="flex items-center gap-3">
                          <Radio className={`w-6 h-6 ${perms.isLocationSharingActive ? 'text-green-600 animate-pulse' : 'text-gray-400'}`} />
                          <span className="text-lg font-bold text-gray-900">{t('family.locationActive')}</span>
                        </div>
                        <div className="flex items-center justify-between pt-2">
                          <span className={`text-sm font-extrabold ${perms.isLocationSharingActive ? 'text-green-700' : 'text-gray-500'}`}>
                            {perms.isLocationSharingActive ? t('family.startSharing') : t('family.stopSharing')}
                          </span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={perms.isLocationSharingActive}
                              disabled={updatingPermId === rel.id || !perms.shareLiveLocation}
                              onChange={() => handleTogglePermission(rel.id, 'isLocationSharingActive', perms.isLocationSharingActive, perms)}
                            />
                            <div className="w-14 h-8 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-green-600"></div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Persistent Connected Parents View (For Family Member user account) */}
      {currentUser?.role === 'FAMILY' && (
        <div className="flex flex-col gap-6">
          <SectionHeader
            title={t('family.yourFamily')}
            subtitle={t('family.familyMemberView')}
            icon={<ShieldCheck className="w-8 h-8 text-purple-600" />}
            badge={<Badge variant="purple">{parents.length}</Badge>}
          />

          {parents.length === 0 ? (
            <EmptyState
              title={t('family.noFamilyMembers')}
              description={t('family.familyAccessDesc')}
              icon={<Users className="w-8 h-8 text-purple-600" />}
            />
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {parents.map((rel) => (
                <ParentLocationViewer key={rel.id} rel={rel} onOpenEvents={setViewingEventsUser} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* View Events Modal */}
      {viewingEventsUser && (
        <FamilyEventsViewerModal
          targetUser={viewingEventsUser}
          onClose={() => setViewingEventsUser(null)}
        />
      )}

      {/* Confirm Remove Member Dialog */}
      <ConfirmDialog
        isOpen={removeDialogState.isOpen}
        title={t('family.removeMemberTitle')}
        description={t('family.removeMemberDesc', { name: removeDialogState.memberName })}
        confirmText={t('family.remove')}
        cancelText={t('profile.cancel')}
        variant="danger"
        isLoading={isRemoving}
        onConfirm={handleExecuteRemoveMember}
        onCancel={() => setRemoveDialogState({ isOpen: false, relId: null, memberName: '' })}
      />
    </div>
  );
}
