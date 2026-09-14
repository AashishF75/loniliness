import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  AlertTriangle,
  CheckCircle,
  Activity,
  Calendar,
  Link2,
  Search,
  ShieldCheck,
  Eye,
  X,
  Check,
  Clock,
  UserCheck,
  AlertCircle,
  Sparkles,
  RefreshCw,
  FileText
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { adminService } from '../services/adminService';
import { useNavigate } from 'react-router-dom';
import { userService } from '../services/userService';
import { useTranslation } from 'react-i18next';

export function AdminDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview, users, reports, verifications, events
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, ACTIVE, SUSPENDED

  // Senior Verification Moderation State
  const [verificationRequests, setVerificationRequests] = useState<any[]>([]);
  const [verificationFilter, setVerificationFilter] = useState('ALL'); // ALL, PENDING, NEEDS_REVIEW, VERIFIED, REJECTED
  const [loadingVerifications, setLoadingVerifications] = useState(false);
  const [selectedDocPreview, setSelectedDocPreview] = useState<{ id: string; type: 'document' | 'selfie'; url: string; userName: string } | null>(null);
  const [reviewModal, setReviewModal] = useState<{ id: string; action: 'APPROVE' | 'REJECT' | 'REQUEST_REVIEW'; userName: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const user = await userService.getUser();
        if (user.role !== 'ADMIN') {
          navigate('/dashboard');
        } else {
          loadData();
        }
      } catch (err) {
        navigate('/login');
      }
    };
    checkAdmin();
  }, [navigate]);

  const loadData = async () => {
    try {
      const [statsData, usersData, reportsData, eventsData, verifData] = await Promise.all([
        adminService.getDashboardStats(),
        adminService.getUsers(),
        adminService.getReports(),
        adminService.getEvents(),
        adminService.getVerificationRequests('ALL').catch(() => [])
      ]);
      setStats(statsData);
      setUsers(usersData);
      setReports(reportsData);
      setEvents(eventsData);
      setVerificationRequests(verifData || []);
    } catch (err) {
      console.error('Failed to load admin data', err);
      setError(t('admin.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const loadVerificationRequests = async (status = verificationFilter) => {
    try {
      setLoadingVerifications(true);
      const reqs = await adminService.getVerificationRequests(status);
      setVerificationRequests(reqs || []);
    } catch (err) {
      console.error('Failed to load verification requests', err);
    } finally {
      setLoadingVerifications(false);
    }
  };

  const handleResolveReport = async (id: string, status: string) => {
    try {
      await adminService.resolveReport(id, status);
      setReports(reports.map(r => r.id === id ? { ...r, status } : r));
      loadData(); // reload stats
    } catch (err) {
      alert('Failed to resolve report');
    }
  };

  const handleSuspendUser = async (id: string, name: string) => {
    if (window.confirm(t('admin.suspendConfirm', { name }))) {
      try {
        await adminService.suspendUser(id);
        setUsers(users.map(u => u.id === id ? { ...u, status: 'SUSPENDED' } : u));
      } catch (err) {
        alert('Failed to suspend user.');
      }
    }
  };

  const handleActivateUser = async (id: string) => {
    try {
      await adminService.activateUser(id);
      setUsers(users.map(u => u.id === id ? { ...u, status: 'ACTIVE' } : u));
    } catch (err) {
      alert('Failed to activate user.');
    }
  };

  const handleRemoveEvent = async (id: string, title: string) => {
    if (window.confirm(t('admin.removeEventConfirm', { title }))) {
      try {
        await adminService.removeEvent(id);
        setEvents(events.map(e => e.id === id ? { ...e, status: 'REMOVED' } : e));
      } catch (err) {
        alert('Failed to remove event.');
      }
    }
  };

  const handleViewDoc = async (reqId: string, type: 'document' | 'selfie', userName: string) => {
    try {
      const url = await adminService.getDocumentBlobUrl(reqId, type);
      setSelectedDocPreview({ id: reqId, type, url, userName });
    } catch (err: any) {
      alert('Unable to load document: ' + (err.message || 'File may have been purged per retention policy or access denied.'));
    }
  };

  const handleReviewSubmit = async () => {
    if (!reviewModal) return;
    try {
      setActionLoading(true);
      await adminService.reviewVerificationRequest(
        reviewModal.id,
        reviewModal.action,
        reviewModal.action === 'REJECT' ? rejectionReason : undefined,
        reviewNotes
      );
      await loadVerificationRequests(verificationFilter);
      const updatedStats = await adminService.getDashboardStats();
      setStats(updatedStats);
      setReviewModal(null);
      setRejectionReason('');
      setReviewNotes('');
    } catch (err: any) {
      alert('Failed to review request: ' + (err.message || 'Server error'));
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || u.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center py-20 gap-4">
        <AlertTriangle className="w-16 h-16 text-red-500" />
        <p className="text-xl text-gray-700 font-bold">{error}</p>
        <Button onClick={() => { setLoading(true); setError(null); loadData(); }}>{t('admin.tryAgain')}</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-8">
      {/* Header */}
      <div className="bg-slate-800 p-6 md:p-8 rounded-3xl shadow-sm border border-slate-700 text-white flex justify-between items-center">
        <div>
          <h1 className="text-3xl md:text-5xl font-extrabold mb-3 flex items-center gap-3">
            <Shield className="w-8 h-8 md:w-12 md:h-12 text-brand-400" />
            {t('admin.adminDashboard')}
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 font-medium">{t('admin.platformModeration')}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-hide">
        <Button
          variant={activeTab === 'overview' ? 'primary' : 'outline'}
          onClick={() => setActiveTab('overview')}
          className="whitespace-nowrap"
        >
          {t('admin.overview')}
        </Button>
        <Button
          variant={activeTab === 'users' ? 'primary' : 'outline'}
          onClick={() => setActiveTab('users')}
          className="whitespace-nowrap"
        >
          {t('admin.manageUsers')}
        </Button>
        <Button
          variant={activeTab === 'verifications' ? 'primary' : 'outline'}
          onClick={() => { setActiveTab('verifications'); loadVerificationRequests(); }}
          className="whitespace-nowrap"
        >
          Senior Verifications
          {stats?.pendingVerifications > 0 && (
            <span className="ml-2 bg-amber-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">
              {stats.pendingVerifications}
            </span>
          )}
        </Button>
        <Button
          variant={activeTab === 'reports' ? 'primary' : 'outline'}
          onClick={() => setActiveTab('reports')}
          className="whitespace-nowrap"
        >
          {t('admin.reports')}{' '}
          {stats?.pendingReports > 0 && (
            <span className="ml-2 bg-red-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">
              {stats.pendingReports}
            </span>
          )}
        </Button>
        <Button
          variant={activeTab === 'events' ? 'primary' : 'outline'}
          onClick={() => setActiveTab('events')}
          className="whitespace-nowrap"
        >
          {t('admin.eventModeration')}
        </Button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card className="p-6 bg-white border-l-4 border-l-brand-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 font-bold mb-1">{t('admin.totalUsers')}</p>
                <h3 className="text-3xl font-extrabold text-gray-900">{stats?.totalUsers}</h3>
              </div>
              <div className="p-3 bg-brand-50 rounded-xl"><Users className="w-6 h-6 text-brand-600" /></div>
            </div>
            <p className="text-sm text-green-600 font-medium mt-4">{t('admin.inLast7Days', { count: stats?.newUsers })}</p>
          </Card>

          <Card
            className="p-6 bg-white border-l-4 border-l-amber-500 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => { setActiveTab('verifications'); loadVerificationRequests(); }}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 font-bold mb-1">Senior Verifications</p>
                <h3 className="text-3xl font-extrabold text-gray-900">{stats?.pendingVerifications ?? 0}</h3>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl"><ShieldCheck className="w-6 h-6 text-amber-600" /></div>
            </div>
            <p className="text-sm text-amber-700 font-medium mt-4">Awaiting Review</p>
          </Card>

          <Card className="p-6 bg-white border-l-4 border-l-red-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 font-bold mb-1">{t('admin.pendingReports')}</p>
                <h3 className="text-3xl font-extrabold text-gray-900">{stats?.pendingReports}</h3>
              </div>
              <div className="p-3 bg-red-50 rounded-xl"><AlertTriangle className="w-6 h-6 text-red-600" /></div>
            </div>
            <p className="text-sm text-gray-500 font-medium mt-4">{t('admin.resolvedTotal', { count: stats?.resolvedReports })}</p>
          </Card>

          <Card className="p-6 bg-white border-l-4 border-l-blue-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 font-bold mb-1">{t('admin.connections')}</p>
                <h3 className="text-3xl font-extrabold text-gray-900">{stats?.totalConnections}</h3>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl"><Link2 className="w-6 h-6 text-blue-600" /></div>
            </div>
            <p className="text-sm text-gray-500 font-medium mt-4">{t('admin.activeFriendships')}</p>
          </Card>

          <Card className="p-6 bg-white border-l-4 border-l-emerald-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 font-bold mb-1">{t('admin.events')}</p>
                <h3 className="text-3xl font-extrabold text-gray-900">{stats?.totalEvents}</h3>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl"><Calendar className="w-6 h-6 text-emerald-600" /></div>
            </div>
            <p className="text-sm text-gray-500 font-medium mt-4">{t('admin.totalParticipants', { count: stats?.eventParticipants })}</p>
          </Card>
        </div>
      )}

      {/* Senior Verifications Moderation Tab */}
      {activeTab === 'verifications' && (
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-gray-100 pb-5">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <ShieldCheck className="w-7 h-7 text-brand-600" />
                Senior Citizen Verification Requests
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Review submitted identity documents, verify declared age matches ID document OCR, and grant verified status.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={verificationFilter}
                onChange={(e) => {
                  setVerificationFilter(e.target.value);
                  loadVerificationRequests(e.target.value);
                }}
                className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-gray-700 bg-white text-sm font-semibold"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="NEEDS_REVIEW">Needs Review</option>
                <option value="VERIFIED">Verified</option>
                <option value="REJECTED">Rejected</option>
              </select>
              <Button
                variant="outline"
                onClick={() => loadVerificationRequests(verificationFilter)}
                className="h-9 px-3 text-xs flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingVerifications ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {loadingVerifications ? (
            <div className="flex justify-center items-center py-16">
              <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : verificationRequests.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="font-semibold text-gray-700">No verification requests found.</p>
              <p className="text-sm text-gray-400 mt-1">Requests matching the current filter will appear here.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {verificationRequests.map(req => {
                const isPendingOrReview = req.status === 'PENDING' || req.status === 'NEEDS_REVIEW';
                const declaredDobStr = req.declaredDob ? new Date(req.declaredDob).toLocaleDateString() : 'None';
                const extractedDobStr = req.extractedDob ? new Date(req.extractedDob).toLocaleDateString() : 'Not detected';

                return (
                  <div
                    key={req.id}
                    className={`border-2 rounded-2xl p-5 transition-colors ${
                      req.status === 'PENDING'
                        ? 'border-blue-200 bg-blue-50/20'
                        : req.status === 'NEEDS_REVIEW'
                        ? 'border-amber-200 bg-amber-50/20'
                        : req.status === 'VERIFIED'
                        ? 'border-emerald-200 bg-emerald-50/10'
                        : 'border-red-200 bg-red-50/10'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row justify-between gap-5">
                      {/* Left: User & Submission Details */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                              req.status === 'VERIFIED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : req.status === 'NEEDS_REVIEW'
                                ? 'bg-amber-100 text-amber-800'
                                : req.status === 'PENDING'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {req.status.replace('_', ' ')}
                          </span>
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700">
                            ID: {req.documentType?.replace('_', ' ')}
                          </span>
                          {req.selfieFilename && (
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-purple-100 text-purple-700 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> Selfie Attached
                            </span>
                          )}
                          <span className="text-xs text-gray-400">
                            Submitted: {new Date(req.createdAt).toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-baseline gap-2 mb-1">
                          <h3 className="text-xl font-extrabold text-gray-900">{req.user?.name}</h3>
                          <span className="text-sm text-gray-500">({req.user?.email})</span>
                        </div>
                        <p className="text-xs text-gray-500 mb-3">
                          Location: {req.user?.city || 'Not specified'} • Declared Age: {req.user?.age || '50+'}
                        </p>

                        {/* OCR Comparison Card */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3.5 rounded-xl border border-gray-200 text-xs mt-2">
                          <div>
                            <span className="text-gray-500 block">Declared DOB:</span>
                            <span className="font-bold text-gray-900 text-sm">{declaredDobStr}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">OCR Extracted DOB:</span>
                            <span className={`font-bold text-sm ${req.dobMatch ? 'text-emerald-700' : 'text-amber-700'}`}>
                              {extractedDobStr}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">DOB Match & Confidence:</span>
                            <span className="font-bold text-sm flex items-center gap-1">
                              {req.dobMatch ? (
                                <span className="text-emerald-600 flex items-center gap-0.5">
                                  <Check className="w-3.5 h-3.5" /> Match
                                </span>
                              ) : (
                                <span className="text-amber-600 flex items-center gap-0.5">
                                  <Clock className="w-3.5 h-3.5" /> Review Needed
                                </span>
                              )}
                              <span className="text-gray-400 font-normal ml-1">
                                (Conf: {req.ocrConfidence || 0}%)
                              </span>
                            </span>
                          </div>
                        </div>

                        {req.rejectionReason && (
                          <div className="mt-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                            <strong>Rejection Reason:</strong> {req.rejectionReason}
                          </div>
                        )}
                        {req.reviewNotes && (
                          <div className="mt-2 text-xs text-gray-500">
                            <strong>Review Notes:</strong> {req.reviewNotes}
                          </div>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex lg:flex-col justify-start lg:justify-center gap-2.5 shrink-0 border-t lg:border-t-0 lg:border-l border-gray-200 pt-4 lg:pt-0 lg:pl-5">
                        {/* View Documents */}
                        <div className="flex flex-wrap gap-2 mb-2">
                          <Button
                            variant="outline"
                            className="text-xs h-9 px-3 flex items-center gap-1.5 border-brand-300 text-brand-700 hover:bg-brand-50"
                            onClick={() => handleViewDoc(req.id, 'document', req.user?.name)}
                          >
                            <Eye className="w-3.5 h-3.5" /> View ID Document
                          </Button>
                          {req.selfieFilename && (
                            <Button
                              variant="outline"
                              className="text-xs h-9 px-3 flex items-center gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-50"
                              onClick={() => handleViewDoc(req.id, 'selfie', req.user?.name)}
                            >
                              <Eye className="w-3.5 h-3.5" /> View Selfie
                            </Button>
                          )}
                        </div>

                        {/* Review Decisions */}
                        {isPendingOrReview && (
                          <div className="flex flex-col gap-2">
                            <Button
                              onClick={() => setReviewModal({ id: req.id, action: 'APPROVE', userName: req.user?.name })}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-9 px-4 flex items-center justify-center gap-1.5 shadow-xs"
                            >
                              <Check className="w-4 h-4" /> Approve Senior
                            </Button>
                            {req.status === 'PENDING' && (
                              <Button
                                variant="outline"
                                onClick={() => setReviewModal({ id: req.id, action: 'REQUEST_REVIEW', userName: req.user?.name })}
                                className="border-amber-400 text-amber-700 hover:bg-amber-50 text-xs h-9 px-4"
                              >
                                Mark Needs Review
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              onClick={() => setReviewModal({ id: req.id, action: 'REJECT', userName: req.user?.name })}
                              className="border-red-400 text-red-600 hover:bg-red-50 text-xs h-9 px-4"
                            >
                              Reject Request
                            </Button>
                          </div>
                        )}
                        {!isPendingOrReview && (
                          <div className="text-xs text-gray-400 font-medium">
                            Reviewed on {req.reviewedAt ? new Date(req.reviewedAt).toLocaleDateString() : 'N/A'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <h2 className="text-2xl font-bold text-gray-900">{t('admin.platformUsers')}</h2>
            <div className="flex gap-3 w-full sm:w-auto">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-gray-700 bg-white"
              >
                <option value="ALL">{t('admin.allStatus')}</option>
                <option value="ACTIVE">{t('admin.active')}</option>
                <option value="SUSPENDED">{t('admin.suspended')}</option>
              </select>
              <div className="relative flex-1 sm:w-64">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('admin.searchUsers')}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="p-3 font-semibold">{t('admin.user')}</th>
                  <th className="p-3 font-semibold">{t('admin.role')}</th>
                  <th className="p-3 font-semibold">{t('admin.status')}</th>
                  <th className="p-3 font-semibold">{t('admin.joined')}</th>
                  <th className="p-3 font-semibold">{t('admin.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3">
                      <div className="font-bold text-gray-900">{u.name}</div>
                      <div className="text-sm text-gray-500">{u.email}</div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-brand-100 text-brand-700'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center w-fit gap-1 ${u.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        {u.status === 'ACTIVE' ? t('admin.active') : t('admin.suspended')}
                      </span>
                    </td>
                    <td className="p-3 text-gray-600">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {u.role !== 'ADMIN' && (
                          u.status === 'ACTIVE' ? (
                            <Button variant="outline" className="border-red-500 text-red-600 hover:bg-red-50 py-1 h-8 text-xs" onClick={() => handleSuspendUser(u.id, u.name)}>
                              {t('admin.suspend')}
                            </Button>
                          ) : (
                            <Button variant="outline" className="border-green-500 text-green-600 hover:bg-green-50 py-1 h-8 text-xs" onClick={() => handleActivateUser(u.id)}>
                              {t('admin.activate')}
                            </Button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-gray-900 px-2">{t('admin.moderationReports')}</h2>
          {reports.length === 0 ? (
            <Card className="p-8 text-center text-gray-500">{t('admin.noReportsFound')}</Card>
          ) : (
            reports.map(report => (
              <Card key={report.id} className={`p-6 border-l-4 ${report.status === 'PENDING' ? 'border-l-red-500 bg-red-50/20' : 'border-l-green-500 bg-white'}`}>
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${report.status === 'PENDING' ? 'bg-red-100 text-red-700' : report.status === 'DISMISSED' ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700'}`}>
                        {report.status}
                      </span>
                      <span className="text-gray-400 text-sm">{new Date(report.createdAt).toLocaleString()}</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{t('admin.reasonLabel', { reason: report.reason })}</h3>
                    <p className="text-gray-700 mb-4">{report.description || t('admin.noDescription')}</p>

                    <div className="text-sm bg-white p-3 rounded-xl border border-gray-200 inline-block">
                      <span className="text-gray-500">{t('admin.reportedUser')} </span>
                      <span className="font-bold text-gray-900 mr-4">{report.reportedUser?.name}</span>
                      <span className="text-gray-500">{t('admin.reporter')} </span>
                      <span className="font-bold text-gray-900">{report.reporter?.name}</span>
                    </div>
                  </div>

                  <div className="flex md:flex-col gap-2 shrink-0 self-start md:self-stretch justify-center">
                    {report.status === 'PENDING' && (
                      <>
                        <Button onClick={() => handleResolveReport(report.id, 'RESOLVED')} className="bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white shadow-sm py-1 h-auto text-sm">
                          {t('admin.resolve')}
                        </Button>
                        <Button variant="outline" onClick={() => handleResolveReport(report.id, 'DISMISSED')} className="py-1 h-auto text-sm">
                          {t('admin.dismiss')}
                        </Button>
                      </>
                    )}
                    <Button variant="outline" className="border-red-500 text-red-600 hover:bg-red-50 py-1 h-auto text-sm mt-auto" onClick={() => handleSuspendUser(report.reportedUser?.id, report.reportedUser?.name)}>
                      {t('admin.suspendUser')}
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Events Tab */}
      {activeTab === 'events' && (
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <h2 className="text-2xl font-bold text-gray-900">{t('admin.eventModeration')}</h2>
          </div>

          <div className="flex flex-col gap-4">
            {events.length === 0 ? (
              <div className="text-center text-gray-500 py-8">{t('admin.noEventsFound')}</div>
            ) : (
              events.map(event => (
                <div key={event.id} className="border border-gray-200 rounded-xl p-4 flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-1 text-xs font-bold rounded-lg ${event.status === 'REMOVED' ? 'bg-red-100 text-red-700' : event.status === 'CANCELLED' ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700'}`}>
                        {event.status}
                      </span>
                      <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded-lg">{event.category}</span>
                      <span className="text-gray-500 text-sm">{new Date(event.date).toLocaleDateString()} at {event.startTime}</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{event.title}</h3>
                    <div className="text-sm text-gray-600 mb-2 flex items-center gap-2">
                      <span>{t('admin.by')}<span className="font-bold">{event.creator?.name}</span></span>
                      <span>•</span>
                      <span>{event.location}</span>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2">{event.description}</p>
                    <div className="mt-3 text-xs font-bold text-gray-500">
                      {t('admin.participantsCount', { count: event._count?.participants, max: event.maxParticipants })}
                    </div>
                  </div>
                  <div className="flex md:flex-col justify-end md:justify-center shrink-0">
                    {event.status !== 'REMOVED' ? (
                      <Button variant="outline" className="border-red-500 text-red-600 hover:bg-red-50 text-sm" onClick={() => handleRemoveEvent(event.id, event.title)}>
                        {t('admin.removeEvent')}
                      </Button>
                    ) : (
                      <span className="text-sm font-bold text-red-500 bg-red-50 px-4 py-2 rounded-xl text-center">
                        {t('admin.removed')}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Document / Selfie Viewer Modal */}
      {selectedDocPreview && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base">
                  {selectedDocPreview.type === 'document' ? 'Identity Document' : 'Live Selfie'}: {selectedDocPreview.userName}
                </h3>
                <p className="text-xs text-slate-300">Protected administrative view. Image streams securely with no public URL.</p>
              </div>
              <button
                onClick={() => setSelectedDocPreview(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-slate-100">
              <img
                src={selectedDocPreview.url}
                alt={selectedDocPreview.type}
                className="max-h-[70vh] w-auto max-w-full rounded-xl object-contain shadow-md"
              />
            </div>
            <div className="p-4 bg-white border-t border-gray-100 flex justify-end">
              <Button onClick={() => setSelectedDocPreview(null)} variant="primary">
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Review Decision Modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">
                {reviewModal.action === 'APPROVE' && 'Approve Senior Verification'}
                {reviewModal.action === 'REJECT' && 'Reject Senior Verification'}
                {reviewModal.action === 'REQUEST_REVIEW' && 'Flag for Deeper Review'}
              </h3>
              <button
                onClick={() => setReviewModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600">
              User: <strong>{reviewModal.userName}</strong>
            </p>

            {reviewModal.action === 'APPROVE' && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Approving will assign the verified badge to this user, allow senior-to-senior connection requests, and purge the uploaded document from disk for privacy.
                </span>
              </div>
            )}

            {reviewModal.action === 'REJECT' && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-700">Select Rejection Reason:</label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-red-500 outline-none"
                >
                  <option value="">-- Choose reason --</option>
                  <option value="Date of birth on document does not match declared birth date or does not meet 50+ age requirement.">
                    DOB does not match / Not 50+
                  </option>
                  <option value="The identity document is blurred, cropped, or illegible. Please submit a clearer photo.">
                    Document is blurred or unreadable
                  </option>
                  <option value="The name on the identity document does not match the account name.">
                    Name mismatch with document
                  </option>
                  <option value="The uploaded file does not appear to be a recognized government or senior identity card.">
                    Unrecognized document type
                  </option>
                  <option value="Selfie does not match photo on document.">
                    Selfie face mismatch
                  </option>
                </select>
                <label className="text-xs font-bold text-gray-700 mt-2">Or Custom Reason:</label>
                <textarea
                  rows={2}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why the document was rejected..."
                  className="w-full p-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-gray-700">Internal Admin Notes (optional):</label>
              <input
                type="text"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Audit notes..."
                className="w-full mt-1 p-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 mt-2">
              <Button
                variant="outline"
                onClick={() => setReviewModal(null)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReviewSubmit}
                disabled={actionLoading || (reviewModal.action === 'REJECT' && !rejectionReason.trim())}
                className={
                  reviewModal.action === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold'
                    : reviewModal.action === 'REJECT'
                    ? 'bg-red-600 hover:bg-red-700 text-white font-bold'
                    : 'bg-amber-600 hover:bg-amber-700 text-white font-bold'
                }
              >
                {actionLoading ? 'Processing...' : `Confirm ${reviewModal.action}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
