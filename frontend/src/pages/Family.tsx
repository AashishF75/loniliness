import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users,
  UserPlus,
  Heart,
  Shield,
  ShieldAlert,
  MapPin,
  Activity,
  CheckCircle,
  XCircle,
  Trash2,
  Send,
  Clock,
  Radio,
  Check
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { familyService, type FamilyRelationship } from '../services/familyService';
import { userService } from '../services/userService';

export function Family() {
  const { t } = useTranslation();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Parent state
  const [members, setMembers] = useState<FamilyRelationship[]>([]);
  const [outgoingInvites, setOutgoingInvites] = useState<FamilyRelationship[]>([]);

  // Family member state
  const [parents, setParents] = useState<FamilyRelationship[]>([]);
  const [incomingInvites, setIncomingInvites] = useState<FamilyRelationship[]>([]);

  // Invitation form
  const [inviteIdentifier, setInviteIdentifier] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Active action states
  const [updatingPermId, setUpdatingPermId] = useState<string | null>(null);

  const loadFamilyData = async () => {
    setLoading(true);
    try {
      const user = await userService.getUser();
      setCurrentUser(user);

      // Fetch invitations (incoming & outgoing)
      const inviteRes = await familyService.getInvitations();
      if (inviteRes && inviteRes.success) {
        setIncomingInvites(inviteRes.incoming || []);
        setOutgoingInvites(inviteRes.outgoing || []);
      }

      // Fetch connected members (for senior)
      const membersRes = await familyService.getFamilyMembers();
      if (membersRes && membersRes.success) {
        setMembers(membersRes.members || []);
      }

      // Fetch connected parents (for family member)
      const parentsRes = await familyService.getConnectedParents();
      if (parentsRes && parentsRes.success) {
        setParents(parentsRes.parents || []);
      }
    } catch (err) {
      console.error('Error loading family data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFamilyData();
  }, []);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteIdentifier.trim()) return;

    setInviting(true);
    setInviteMessage(null);

    try {
      const res = await familyService.inviteFamilyMember(inviteIdentifier.trim());
      if (res && res.success) {
        setInviteMessage({ type: 'success', text: t('family.inviteSuccess') });
        setInviteIdentifier('');
        loadFamilyData();
      } else {
        setInviteMessage({ type: 'error', text: res?.message || 'Failed to send invitation' });
      }
    } catch (err: any) {
      setInviteMessage({ type: 'error', text: err?.message || 'Error sending invitation' });
    } finally {
      setInviting(false);
    }
  };

  const handleAcceptInvite = async (relationshipId: string) => {
    try {
      const res = await familyService.acceptInvitation(relationshipId);
      if (res && res.success) {
        loadFamilyData();
      }
    } catch (err) {
      console.error('Accept invite error:', err);
    }
  };

  const handleRejectInvite = async (relationshipId: string) => {
    try {
      const res = await familyService.rejectInvitation(relationshipId);
      if (res && res.success) {
        loadFamilyData();
      }
    } catch (err) {
      console.error('Reject invite error:', err);
    }
  };

  const handleRemoveMember = async (relationshipId: string) => {
    if (!window.confirm(t('family.removeConfirm'))) return;

    try {
      const res = await familyService.removeFamilyMember(relationshipId);
      if (res && res.success) {
        loadFamilyData();
      }
    } catch (err) {
      console.error('Remove member error:', err);
    }
  };

  const handleTogglePermission = async (
    relationshipId: string,
    key: 'shareActivities' | 'shareLiveLocation' | 'isLocationSharingActive',
    currentVal: boolean,
    perms: any
  ) => {
    setUpdatingPermId(relationshipId);
    try {
      let updatedPayload: any = {
        shareActivities: perms?.shareActivities ?? false,
        shareLiveLocation: perms?.shareLiveLocation ?? false,
        isLocationSharingActive: perms?.isLocationSharingActive ?? false
      };

      updatedPayload[key] = !currentVal;

      // If disabling live location, force active state to false
      if (key === 'shareLiveLocation' && currentVal === true) {
        updatedPayload.isLocationSharingActive = false;
      }

      const res = await familyService.updatePermissions(relationshipId, updatedPayload);
      if (res && res.success) {
        setMembers((prev) =>
          prev.map((m) => (m.id === relationshipId ? { ...m, permissions: res.permissions } : m))
        );
      }
    } catch (err) {
      console.error('Toggle permission error:', err);
    } finally {
      setUpdatingPermId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Card className="p-10 text-center bg-brand-50/50 border-brand-100 flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-2xl font-bold text-brand-800">Loading family access...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 md:gap-8 pb-8">
      {/* Header */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-2">{t('family.family')}</h1>
          <p className="text-xl text-gray-600 font-medium">{t('family.familyAccessDesc')}</p>
        </div>
        <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
          <Heart className="w-8 h-8" />
        </div>
      </div>

      {/* Incoming Invitations Banner (For family member / recipient) */}
      {incomingInvites.length > 0 && (
        <Card className="bg-purple-50 border-purple-200 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="w-8 h-8 text-purple-600" />
            <h2 className="text-2xl font-extrabold text-purple-900">{t('family.pendingInvitations')}</h2>
          </div>
          <div className="flex flex-col gap-4">
            {incomingInvites.map((inv) => (
              <div key={inv.id} className="bg-white p-5 rounded-2xl border border-purple-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{inv.parent?.name || 'Senior Parent'}</h3>
                  <p className="text-lg text-gray-500">{inv.parent?.email || inv.parent?.phone || ''}</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Button
                    onClick={() => handleAcceptInvite(inv.id)}
                    className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 flex-1 sm:flex-initial"
                  >
                    <CheckCircle className="w-5 h-5" /> {t('family.accept')}
                  </Button>
                  <Button
                    onClick={() => handleRejectInvite(inv.id)}
                    variant="outline"
                    className="border-gray-300 text-gray-700 hover:bg-gray-100 font-bold px-6 py-3 rounded-xl flex items-center gap-2 flex-1 sm:flex-initial"
                  >
                    <XCircle className="w-5 h-5" /> {t('family.reject')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Invite Family Member Section (Parent View) */}
      <Card className="p-6 md:p-8 border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <UserPlus className="w-7 h-7 text-brand-600" />
          <h2 className="text-2xl font-extrabold text-gray-900">{t('family.inviteFamilyMember')}</h2>
        </div>
        <form onSubmit={handleSendInvite} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={inviteIdentifier}
            onChange={(e) => setInviteIdentifier(e.target.value)}
            placeholder={t('family.enterIdentifier')}
            className="flex-1 px-5 py-4 text-xl rounded-2xl border-2 border-gray-200 focus:border-brand-500 focus:outline-none"
          />
          <Button
            type="submit"
            disabled={inviting || !inviteIdentifier.trim()}
            className="bg-brand-600 hover:bg-brand-700 text-white text-xl font-bold px-8 py-4 rounded-2xl flex items-center justify-center gap-2"
          >
            {inviting ? (
              <span>{t('family.sending')}</span>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>{t('family.sendInvite')}</span>
              </>
            )}
          </Button>
        </form>

        {inviteMessage && (
          <div className={`mt-4 p-4 rounded-xl text-lg font-bold ${
            inviteMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {inviteMessage.text}
          </div>
        )}

        {/* Outgoing pending invites */}
        {outgoingInvites.length > 0 && (
          <div className="mt-6 border-t border-gray-100 pt-6">
            <h3 className="text-xl font-bold text-gray-700 mb-3">{t('family.pendingInvitations')}</h3>
            <div className="flex flex-col gap-3">
              {outgoingInvites.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <p className="text-xl font-bold text-gray-900">{inv.member?.name || inv.member?.email || 'Invited Family Member'}</p>
                    <p className="text-sm text-gray-500">{inv.member?.email || inv.member?.phone}</p>
                  </div>
                  <span className="bg-yellow-100 text-yellow-800 text-base font-bold px-4 py-1.5 rounded-full">
                    {t('family.statusPending')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Connected Family Members (Parent View) */}
      <div className="flex flex-col gap-6">
        <h2 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
          <Users className="w-8 h-8 text-brand-600" />
          {t('family.parentControls')}
        </h2>

        {members.length === 0 ? (
          <Card className="p-10 text-center text-gray-500 text-xl font-medium border-dashed border-2 border-gray-200">
            {t('family.noFamilyMembers')}
          </Card>
        ) : (
          members.map((rel) => {
            const perms = rel.permissions || {
              shareActivities: false,
              shareLiveLocation: false,
              isLocationSharingActive: false
            };

            return (
              <Card key={rel.id} className="p-6 md:p-8 flex flex-col gap-6 border-gray-200 shadow-sm">
                {/* Family member user info */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-brand-100 text-brand-700 rounded-2xl flex items-center justify-center text-2xl font-bold border-2 border-brand-200">
                      {rel.member?.name ? rel.member.name[0].toUpperCase() : 'F'}
                    </div>
                    <div>
                      <h3 className="text-2xl font-extrabold text-gray-900">{rel.member?.name || 'Family Member'}</h3>
                      <p className="text-lg text-gray-500 font-medium">{rel.member?.email || rel.member?.phone}</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleRemoveMember(rel.id)}
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50 p-3 rounded-xl"
                    title={t('family.remove')}
                  >
                    <Trash2 className="w-6 h-6" />
                  </Button>
                </div>

                {/* Permissions controls */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Activity Sharing Toggle */}
                  <div className={`p-5 rounded-2xl border-2 transition-all flex flex-col justify-between gap-4 ${
                    perms.shareActivities ? 'bg-brand-50 border-brand-300' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Activity className={`w-6 h-6 ${perms.shareActivities ? 'text-brand-600' : 'text-gray-400'}`} />
                        <span className="text-xl font-bold text-gray-900">{t('family.shareActivities')}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <span className={`text-base font-extrabold ${perms.shareActivities ? 'text-brand-700' : 'text-gray-500'}`}>
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
                    perms.shareLiveLocation ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <MapPin className={`w-6 h-6 ${perms.shareLiveLocation ? 'text-blue-600' : 'text-gray-400'}`} />
                        <span className="text-xl font-bold text-gray-900">{t('family.shareLiveLocation')}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <span className={`text-base font-extrabold ${perms.shareLiveLocation ? 'text-blue-700' : 'text-gray-500'}`}>
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
                    perms.isLocationSharingActive ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'
                  } ${!perms.shareLiveLocation ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Radio className={`w-6 h-6 ${perms.isLocationSharingActive ? 'text-green-600 animate-pulse' : 'text-gray-400'}`} />
                        <span className="text-xl font-bold text-gray-900">{t('family.locationActive')}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <span className={`text-base font-extrabold ${perms.isLocationSharingActive ? 'text-green-700' : 'text-gray-500'}`}>
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
          })
        )}
      </div>

      {/* Connected Parents View (For Family Member user account) */}
      {parents.length > 0 && (
        <div className="flex flex-col gap-6 mt-6">
          <h2 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
            <Heart className="w-8 h-8 text-purple-600" />
            {t('family.familyMemberView')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {parents.map((rel) => {
              const perms = rel.permissions || {
                shareActivities: false,
                shareLiveLocation: false,
                isLocationSharingActive: false
              };

              return (
                <Card key={rel.id} className="p-6 flex flex-col gap-4 border-gray-200 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center text-xl font-bold">
                      {rel.parent?.name ? rel.parent.name[0].toUpperCase() : 'P'}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">{rel.parent?.name || 'Parent Senior'}</h3>
                      <p className="text-lg text-gray-500">{rel.parent?.city || rel.parent?.email}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-medium text-gray-600">{t('family.shareActivities')}</span>
                      <span className={`text-base font-bold px-3 py-1 rounded-full ${
                        perms.shareActivities ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {perms.shareActivities ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-lg font-medium text-gray-600">{t('family.shareLiveLocation')}</span>
                      <span className={`text-base font-bold px-3 py-1 rounded-full ${
                        perms.shareLiveLocation ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {perms.shareLiveLocation ? 'Authorized' : 'Not Authorized'}
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
