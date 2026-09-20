import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Users,
  UserCheck,
  Shield,
  MessageCircle,
  Calendar,
  MapPin,
  BellRing,
  Plus,
  Settings,
  Trash2,
  AlertCircle,
  CheckCircle2,
  X,
  User,
  Heart
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { circleService, type CircleMember, type AvailableConnection } from '../services/circleService';

export function SaathiCircle() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [members, setMembers] = useState<CircleMember[]>([]);
  const [availableConnections, setAvailableConnections] = useState<AvailableConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<CircleMember | null>(null);

  // Add Member Form
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [selectedRelationship, setSelectedRelationship] = useState('DAUGHTER');
  const [newChat, setNewChat] = useState(true);
  const [newEvents, setNewEvents] = useState(false);
  const [newLocation, setNewLocation] = useState(false);
  const [newEmergency, setNewEmergency] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Edit Permissions Form
  const [editChat, setEditChat] = useState(true);
  const [editEvents, setEditEvents] = useState(false);
  const [editLocation, setEditLocation] = useState(false);
  const [editEmergency, setEditEmergency] = useState(false);
  const [editRelationship, setEditRelationship] = useState('OTHER');
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Notification message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchCircleData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await circleService.getCircle();
      setMembers(data.circleMembers);
      setAvailableConnections(data.availableConnections);
      if (data.availableConnections.length > 0 && !selectedCandidateId) {
        setSelectedCandidateId(data.availableConnections[0].user.id);
      }
    } catch (err: any) {
      console.error('Fetch circle error:', err);
      setError(err?.message || 'Failed to load Saathi Circle');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCircleData();
  }, []);

  const handleOpenManageModal = (member: CircleMember) => {
    setSelectedMember(member);
    setEditChat(member.allowChat);
    setEditEvents(member.allowEvents);
    setEditLocation(member.allowLocation);
    setEditEmergency(member.allowEmergency);
    setEditRelationship(member.relationshipType);
    setShowManageModal(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedMember) return;
    setSubmittingEdit(true);
    try {
      const updated = await circleService.updatePermissions(selectedMember.memberId, {
        allowChat: editChat,
        allowEvents: editEvents,
        allowLocation: editLocation,
        allowEmergency: editEmergency,
        relationshipType: editRelationship
      });
      setMembers(prev => prev.map(m => (m.memberId === selectedMember.memberId ? updated : m)));
      setShowManageModal(false);
      showToast(t('circle.memberUpdated'));
    } catch (err: any) {
      alert(err?.message || 'Failed to update permissions');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedCandidateId) {
      alert(t('circle.selectPerson'));
      return;
    }
    setSubmittingAdd(true);
    try {
      const created = await circleService.addMember({
        memberId: selectedCandidateId,
        relationshipType: selectedRelationship,
        allowChat: newChat,
        allowEvents: newEvents,
        allowLocation: newLocation,
        allowEmergency: newEmergency
      });
      setMembers(prev => [created, ...prev]);
      setAvailableConnections(prev => prev.filter(c => c.user.id !== selectedCandidateId));
      setShowAddModal(false);
      showToast(t('circle.memberAdded'));
      // Reset defaults
      setNewChat(true);
      setNewEvents(false);
      setNewLocation(false);
      setNewEmergency(false);
    } catch (err: any) {
      alert(err?.message || 'Failed to add member to circle');
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleRemoveMember = async (member: CircleMember) => {
    const confirmMsg = t('circle.removeConfirm', { name: member.member.name });
    if (window.confirm(confirmMsg)) {
      try {
        await circleService.removeMember(member.memberId);
        setMembers(prev => prev.filter(m => m.memberId !== member.memberId));
        showToast(t('circle.memberRemoved'));
        fetchCircleData();
      } catch (err: any) {
        alert(err?.message || 'Failed to remove member');
      }
    }
  };

  const getRelationshipLabel = (rel: string) => {
    switch (rel) {
      case 'DAUGHTER':
        return t('circle.daughter');
      case 'SON':
        return t('circle.son');
      case 'SPOUSE':
        return t('circle.spouse');
      case 'FRIEND':
        return t('circle.friend');
      case 'NEIGHBOR':
        return t('circle.neighbor');
      case 'CAREGIVER':
        return t('circle.caregiver');
      default:
        return t('circle.other');
    }
  };

  return (
    <div className="flex flex-col gap-6 md:gap-8 pb-12 max-w-5xl mx-auto">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 bg-brand-700 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-6 h-6 text-brand-200 shrink-0" />
          <span className="font-bold text-lg">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-brand-700 via-brand-600 to-emerald-800 text-white p-6 sm:p-8 rounded-3xl shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 rounded-2xl flex items-center justify-center shadow-inner text-white shrink-0">
            <Users className="w-10 h-10 sm:w-12 sm:h-12" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              {t('circle.title')}
            </h1>
            <p className="text-brand-100 text-lg sm:text-xl font-medium mt-1">
              {t('circle.subtitle')}
            </p>
          </div>
        </div>

        <Button
          size="lg"
          onClick={() => {
            if (availableConnections.length > 0 && !selectedCandidateId) {
              setSelectedCandidateId(availableConnections[0].user.id);
            }
            setShowAddModal(true);
          }}
          className="bg-white text-brand-800 hover:bg-brand-50 text-xl font-extrabold px-6 py-4 rounded-2xl shadow-lg flex items-center gap-3 shrink-0 cursor-pointer transition-transform active:scale-95"
        >
          <Plus className="w-7 h-7 text-brand-600" />
          <span>{t('circle.addToCircle')}</span>
        </Button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="p-12 text-center text-gray-500 font-bold text-xl">
          Loading your Saathi Circle...
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <Card className="p-8 bg-red-50 border-2 border-red-200 text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
          <h3 className="text-2xl font-bold text-red-800 mb-2">Failed to load Circle</h3>
          <p className="text-red-600 text-lg mb-4">{error}</p>
          <Button onClick={fetchCircleData} size="lg" className="bg-red-600 hover:bg-red-700 text-white font-bold">
            Try Again
          </Button>
        </Card>
      )}

      {/* Empty State */}
      {!loading && !error && members.length === 0 && (
        <Card className="p-10 sm:p-14 text-center bg-white border-2 border-dashed border-gray-300 rounded-3xl flex flex-col items-center gap-4">
          <div className="w-24 h-24 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mb-2">
            <Heart className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">{t('circle.noMembers')}</h2>
          <p className="text-xl text-gray-600 max-w-lg leading-relaxed">
            {t('circle.noMembersDesc')}
          </p>
          <Button
            size="lg"
            onClick={() => setShowAddModal(true)}
            className="mt-4 bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xl px-8 py-4 rounded-2xl shadow-md cursor-pointer"
          >
            <Plus className="w-6 h-6 mr-2" />
            {t('circle.addToCircle')}
          </Button>
        </Card>
      )}

      {/* Member Cards Grid */}
      {!loading && !error && members.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {members.map(item => (
            <Card
              key={item.id}
              className={`p-6 sm:p-7 rounded-3xl border-2 shadow-sm transition-all flex flex-col justify-between gap-6 ${
                item.isConnectionActive ? 'border-gray-200 bg-white' : 'border-amber-200 bg-amber-50/50'
              }`}
            >
              {/* Member Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-brand-100 text-brand-700 font-extrabold text-2xl flex items-center justify-center shrink-0 border-2 border-brand-200 shadow-sm">
                    {item.member.avatar ? (
                      <img src={item.member.avatar} alt={item.member.name} className="w-full h-full object-cover rounded-2xl" />
                    ) : (
                      item.member.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h3 className="text-2xl font-extrabold text-gray-900">{item.member.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="bg-brand-100 text-brand-800 text-sm sm:text-base font-bold px-3 py-1 rounded-full">
                        {getRelationshipLabel(item.relationshipType)}
                      </span>
                      {item.isConnectionActive ? (
                        <span className="text-green-700 font-bold text-sm flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          {t('circle.connected')}
                        </span>
                      ) : (
                        <span className="text-amber-700 font-bold text-sm flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                          {t('circle.connectionInactive')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveMember(item)}
                  className="p-2 text-gray-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors"
                  title={t('circle.removeFromCircle')}
                  aria-label={t('circle.removeFromCircle')}
                >
                  <Trash2 className="w-6 h-6" />
                </button>
              </div>

              {/* Permissions Grid */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl grid grid-cols-2 gap-3">
                {/* Chat Permission */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-gray-100 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-brand-600" />
                    <span className="font-bold text-base text-gray-700">{t('circle.chat')}</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-lg text-xs sm:text-sm font-extrabold ${
                    item.allowChat ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {item.allowChat ? t('circle.on') : t('circle.off')}
                  </span>
                </div>

                {/* Events Permission */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-gray-100 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-orange-600" />
                    <span className="font-bold text-base text-gray-700">{t('circle.events')}</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-lg text-xs sm:text-sm font-extrabold ${
                    item.allowEvents ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {item.allowEvents ? t('circle.on') : t('circle.off')}
                  </span>
                </div>

                {/* Location Permission */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-gray-100 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <span className="font-bold text-base text-gray-700">{t('circle.location')}</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-lg text-xs sm:text-sm font-extrabold ${
                    item.allowLocation ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {item.allowLocation ? t('circle.on') : t('circle.off')}
                  </span>
                </div>

                {/* Emergency Notifications */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-gray-100 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <BellRing className="w-5 h-5 text-red-600" />
                    <span className="font-bold text-base text-gray-700">{t('circle.emergency')}</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-lg text-xs sm:text-sm font-extrabold ${
                    item.allowEmergency ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {item.allowEmergency ? t('circle.on') : t('circle.off')}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  size="lg"
                  onClick={() => handleOpenManageModal(item)}
                  className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-bold text-lg py-3 rounded-2xl flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <Settings className="w-5 h-5" />
                  <span>{t('circle.managePermissions')}</span>
                </Button>

                {item.allowChat && item.isConnectionActive && (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate('/connections')}
                    className="border-2 border-brand-500 text-brand-700 hover:bg-brand-50 font-bold text-lg py-3 px-4 rounded-2xl flex items-center justify-center cursor-pointer"
                    title={t('circle.chat')}
                  >
                    <MessageCircle className="w-6 h-6" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ======================================================
          ADD TO SAATHI CIRCLE MODAL
      ======================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border-4 border-brand-500 flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-brand-700 text-white p-6 flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-brand-100" />
                <h3 className="text-2xl font-extrabold">{t('circle.addToCircle')}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-2 text-white/80 hover:text-white rounded-xl hover:bg-white/20 transition-colors"
                aria-label={t('circle.cancel')}
              >
                <X className="w-7 h-7" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex flex-col gap-6">
              {availableConnections.length === 0 ? (
                <div className="p-6 bg-amber-50 border-2 border-amber-200 rounded-2xl text-center">
                  <AlertCircle className="w-10 h-10 text-amber-600 mx-auto mb-2" />
                  <h4 className="text-xl font-bold text-amber-900 mb-1">{t('circle.noEligibleConnections')}</h4>
                  <p className="text-amber-800 text-base">{t('circle.connectFirst')}</p>
                  <Button
                    onClick={() => {
                      setShowAddModal(false);
                      navigate('/people');
                    }}
                    className="mt-4 bg-amber-600 hover:bg-amber-700 text-white font-bold"
                  >
                    Find Connections
                  </Button>
                </div>
              ) : (
                <>
                  {/* Select Connection */}
                  <div>
                    <label className="block text-lg font-extrabold text-gray-800 mb-2">
                      {t('circle.selectPerson')}
                    </label>
                    <select
                      value={selectedCandidateId}
                      onChange={e => setSelectedCandidateId(e.target.value)}
                      className="w-full h-14 px-4 text-lg font-bold border-2 border-gray-300 rounded-2xl bg-gray-50 focus:border-brand-500 focus:bg-white focus:outline-none"
                    >
                      {availableConnections.map(c => (
                        <option key={c.user.id} value={c.user.id}>
                          {c.user.name} ({c.user.city || c.user.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select Relationship */}
                  <div>
                    <label className="block text-lg font-extrabold text-gray-800 mb-2">
                      {t('circle.selectRelationship')}
                    </label>
                    <select
                      value={selectedRelationship}
                      onChange={e => setSelectedRelationship(e.target.value)}
                      className="w-full h-14 px-4 text-lg font-bold border-2 border-gray-300 rounded-2xl bg-gray-50 focus:border-brand-500 focus:bg-white focus:outline-none"
                    >
                      <option value="DAUGHTER">{t('circle.daughter')}</option>
                      <option value="SON">{t('circle.son')}</option>
                      <option value="SPOUSE">{t('circle.spouse')}</option>
                      <option value="FRIEND">{t('circle.friend')}</option>
                      <option value="NEIGHBOR">{t('circle.neighbor')}</option>
                      <option value="CAREGIVER">{t('circle.caregiver')}</option>
                      <option value="OTHER">{t('circle.other')}</option>
                    </select>
                  </div>

                  {/* Permission Toggles */}
                  <div className="flex flex-col gap-3">
                    <span className="text-lg font-extrabold text-gray-800">Permissions</span>

                    {/* Chat */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 border border-gray-200 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <MessageCircle className="w-6 h-6 text-brand-600" />
                        <div>
                          <span className="text-lg font-extrabold text-gray-900 block">{t('circle.chat')}</span>
                          <span className="text-sm text-gray-500">Allow messaging with you</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewChat(!newChat)}
                        className={`w-16 h-10 rounded-full font-bold text-sm transition-colors cursor-pointer ${
                          newChat ? 'bg-brand-600 text-white' : 'bg-gray-300 text-gray-700'
                        }`}
                      >
                        {newChat ? t('circle.on') : t('circle.off')}
                      </button>
                    </div>

                    {/* Events */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 border border-gray-200 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-6 h-6 text-orange-600" />
                        <div>
                          <span className="text-lg font-extrabold text-gray-900 block">{t('circle.events')}</span>
                          <span className="text-sm text-gray-500">Allow viewing your scheduled activities</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewEvents(!newEvents)}
                        className={`w-16 h-10 rounded-full font-bold text-sm transition-colors cursor-pointer ${
                          newEvents ? 'bg-brand-600 text-white' : 'bg-gray-300 text-gray-700'
                        }`}
                      >
                        {newEvents ? t('circle.on') : t('circle.off')}
                      </button>
                    </div>

                    {/* Location */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 border border-gray-200 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <MapPin className="w-6 h-6 text-blue-600" />
                        <div>
                          <span className="text-lg font-extrabold text-gray-900 block">{t('circle.location')}</span>
                          <span className="text-sm text-gray-500">Allow live location sharing</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewLocation(!newLocation)}
                        className={`w-16 h-10 rounded-full font-bold text-sm transition-colors cursor-pointer ${
                          newLocation ? 'bg-brand-600 text-white' : 'bg-gray-300 text-gray-700'
                        }`}
                      >
                        {newLocation ? t('circle.on') : t('circle.off')}
                      </button>
                    </div>

                    {/* Emergency Alerts */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 border border-gray-200 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <BellRing className="w-6 h-6 text-red-600" />
                        <div>
                          <span className="text-lg font-extrabold text-gray-900 block">{t('circle.emergency')}</span>
                          <span className="text-sm text-gray-500">Receive emergency notification alerts</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewEmergency(!newEmergency)}
                        className={`w-16 h-10 rounded-full font-bold text-sm transition-colors cursor-pointer ${
                          newEmergency ? 'bg-brand-600 text-white' : 'bg-gray-300 text-gray-700'
                        }`}
                      >
                        {newEmergency ? t('circle.on') : t('circle.off')}
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <Button
                      size="lg"
                      onClick={handleAddMember}
                      disabled={submittingAdd || !selectedCandidateId}
                      className="flex-1 bg-brand-600 hover:bg-brand-700 text-white text-xl font-bold py-4 rounded-2xl shadow-md cursor-pointer"
                    >
                      {submittingAdd ? 'Adding...' : t('circle.addToCircle')}
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => setShowAddModal(false)}
                      className="text-gray-700 font-bold text-lg px-6 rounded-2xl cursor-pointer"
                    >
                      {t('circle.cancel')}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          MANAGE PERMISSIONS MODAL
      ======================================================= */}
      {showManageModal && selectedMember && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border-4 border-brand-500 flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-brand-700 text-white p-6 flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-3">
                <Settings className="w-8 h-8 text-brand-100" />
                <h3 className="text-2xl font-extrabold">
                  {t('circle.permissionsFor', { name: selectedMember.member.name })}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowManageModal(false)}
                className="p-2 text-white/80 hover:text-white rounded-xl hover:bg-white/20 transition-colors"
                aria-label={t('circle.cancel')}
              >
                <X className="w-7 h-7" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex flex-col gap-6">
              {/* Relationship dropdown */}
              <div>
                <label className="block text-lg font-extrabold text-gray-800 mb-2">
                  {t('circle.selectRelationship')}
                </label>
                <select
                  value={editRelationship}
                  onChange={e => setEditRelationship(e.target.value)}
                  className="w-full h-14 px-4 text-lg font-bold border-2 border-gray-300 rounded-2xl bg-gray-50 focus:border-brand-500 focus:bg-white focus:outline-none"
                >
                  <option value="DAUGHTER">{t('circle.daughter')}</option>
                  <option value="SON">{t('circle.son')}</option>
                  <option value="SPOUSE">{t('circle.spouse')}</option>
                  <option value="FRIEND">{t('circle.friend')}</option>
                  <option value="NEIGHBOR">{t('circle.neighbor')}</option>
                  <option value="CAREGIVER">{t('circle.caregiver')}</option>
                  <option value="OTHER">{t('circle.other')}</option>
                </select>
              </div>

              {/* Toggles */}
              <div className="flex flex-col gap-3">
                <span className="text-lg font-extrabold text-gray-800">Permissions</span>

                {/* Chat */}
                <div className="flex items-center justify-between p-4 bg-slate-50 border border-gray-200 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-6 h-6 text-brand-600" />
                    <div>
                      <span className="text-lg font-extrabold text-gray-900 block">{t('circle.chat')}</span>
                      <span className="text-sm text-gray-500">Messaging access</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditChat(!editChat)}
                    className={`w-16 h-10 rounded-full font-bold text-sm transition-colors cursor-pointer ${
                      editChat ? 'bg-brand-600 text-white' : 'bg-gray-300 text-gray-700'
                    }`}
                  >
                    {editChat ? t('circle.on') : t('circle.off')}
                  </button>
                </div>

                {/* Events */}
                <div className="flex items-center justify-between p-4 bg-slate-50 border border-gray-200 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-6 h-6 text-orange-600" />
                    <div>
                      <span className="text-lg font-extrabold text-gray-900 block">{t('circle.events')}</span>
                      <span className="text-sm text-gray-500">Activity schedule access</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditEvents(!editEvents)}
                    className={`w-16 h-10 rounded-full font-bold text-sm transition-colors cursor-pointer ${
                      editEvents ? 'bg-brand-600 text-white' : 'bg-gray-300 text-gray-700'
                    }`}
                  >
                    {editEvents ? t('circle.on') : t('circle.off')}
                  </button>
                </div>

                {/* Location */}
                <div className="flex items-center justify-between p-4 bg-slate-50 border border-gray-200 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-6 h-6 text-blue-600" />
                    <div>
                      <span className="text-lg font-extrabold text-gray-900 block">{t('circle.location')}</span>
                      <span className="text-sm text-gray-500">Live location sharing</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditLocation(!editLocation)}
                    className={`w-16 h-10 rounded-full font-bold text-sm transition-colors cursor-pointer ${
                      editLocation ? 'bg-brand-600 text-white' : 'bg-gray-300 text-gray-700'
                    }`}
                  >
                    {editLocation ? t('circle.on') : t('circle.off')}
                  </button>
                </div>

                {/* Emergency Notifications */}
                <div className="flex items-center justify-between p-4 bg-slate-50 border border-gray-200 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <BellRing className="w-6 h-6 text-red-600" />
                    <div>
                      <span className="text-lg font-extrabold text-gray-900 block">{t('circle.emergency')}</span>
                      <span className="text-sm text-gray-500">Emergency notifications</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditEmergency(!editEmergency)}
                    className={`w-16 h-10 rounded-full font-bold text-sm transition-colors cursor-pointer ${
                      editEmergency ? 'bg-brand-600 text-white' : 'bg-gray-300 text-gray-700'
                    }`}
                  >
                    {editEmergency ? t('circle.on') : t('circle.off')}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  size="lg"
                  onClick={handleSavePermissions}
                  disabled={submittingEdit}
                  className="flex-1 bg-brand-600 hover:bg-brand-700 text-white text-xl font-bold py-4 rounded-2xl shadow-md cursor-pointer"
                >
                  {submittingEdit ? 'Saving...' : t('circle.saveChanges')}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setShowManageModal(false)}
                  className="text-gray-700 font-bold text-lg px-6 rounded-2xl cursor-pointer"
                >
                  {t('circle.cancel')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
