import React, { useState, useEffect } from 'react';
import { Shield, Users, AlertTriangle, CheckCircle, Activity, Calendar, Link2, Search } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('overview'); // overview, users, reports
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, ACTIVE, SUSPENDED

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
      const [statsData, usersData, reportsData, eventsData] = await Promise.all([
        adminService.getDashboardStats(),
        adminService.getUsers(),
        adminService.getReports(),
        adminService.getEvents()
      ]);
      setStats(statsData);
      setUsers(usersData);
      setReports(reportsData);
      setEvents(eventsData);
    } catch (err) {
      console.error('Failed to load admin data', err);
      setError(t('admin.failedToLoad'));
    } finally {
      setLoading(false);
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
      <div className="bg-slate-800 p-6 md:p-8 rounded-3xl shadow-sm border border-slate-700 text-white flex justify-between items-center">
        <div>
          <h1 className="text-3xl md:text-5xl font-extrabold mb-3 flex items-center gap-3">
            <Shield className="w-8 h-8 md:w-12 md:h-12 text-brand-400" />
            {t('admin.adminDashboard')}
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 font-medium">{t('admin.platformModeration')}</p>
        </div>
      </div>

      <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-hide">
        <Button variant={activeTab === 'overview' ? 'primary' : 'outline'} onClick={() => setActiveTab('overview')} className="whitespace-nowrap">{t('admin.overview')}</Button>
        <Button variant={activeTab === 'users' ? 'primary' : 'outline'} onClick={() => setActiveTab('users')} className="whitespace-nowrap">{t('admin.manageUsers')}</Button>
        <Button variant={activeTab === 'reports' ? 'primary' : 'outline'} onClick={() => setActiveTab('reports')} className="whitespace-nowrap">
          {t('admin.reports')} {stats?.pendingReports > 0 && <span className="ml-2 bg-red-500 text-white px-2 py-0.5 rounded-full text-xs">{stats.pendingReports}</span>}
        </Button>
        <Button variant={activeTab === 'events' ? 'primary' : 'outline'} onClick={() => setActiveTab('events')} className="whitespace-nowrap">{t('admin.eventModeration')}</Button>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
    </div>
  );
}
