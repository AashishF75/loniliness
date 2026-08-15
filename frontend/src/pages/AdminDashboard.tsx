import React, { useState, useEffect } from 'react';
import { Shield, Users, AlertTriangle, CheckCircle, Activity, Calendar, Link2, Search } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { adminService } from '../services/adminService';
import { useNavigate } from 'react-router-dom';
import { userService } from '../services/userService';

export function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview'); // overview, users, reports
  const [searchTerm, setSearchTerm] = useState('');

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
      const [statsData, usersData, reportsData] = await Promise.all([
        adminService.getDashboardStats(),
        adminService.getUsers(),
        adminService.getReports()
      ]);
      setStats(statsData);
      setUsers(usersData);
      setReports(reportsData);
    } catch (err) {
      console.error('Failed to load admin data');
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

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-8">
      <div className="bg-slate-800 p-6 md:p-8 rounded-3xl shadow-sm border border-slate-700 text-white flex justify-between items-center">
        <div>
          <h1 className="text-3xl md:text-5xl font-extrabold mb-3 flex items-center gap-3">
            <Shield className="w-8 h-8 md:w-12 md:h-12 text-brand-400" />
            Admin Dashboard
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 font-medium">Platform moderation & analytics.</p>
        </div>
      </div>

      <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-hide">
        <Button variant={activeTab === 'overview' ? 'primary' : 'outline'} onClick={() => setActiveTab('overview')} className="whitespace-nowrap">Overview</Button>
        <Button variant={activeTab === 'users' ? 'primary' : 'outline'} onClick={() => setActiveTab('users')} className="whitespace-nowrap">Manage Users</Button>
        <Button variant={activeTab === 'reports' ? 'primary' : 'outline'} onClick={() => setActiveTab('reports')} className="whitespace-nowrap">
          Reports {stats?.pendingReports > 0 && <span className="ml-2 bg-red-500 text-white px-2 py-0.5 rounded-full text-xs">{stats.pendingReports}</span>}
        </Button>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 bg-white border-l-4 border-l-brand-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 font-bold mb-1">Total Users</p>
                <h3 className="text-3xl font-extrabold text-gray-900">{stats?.totalUsers}</h3>
              </div>
              <div className="p-3 bg-brand-50 rounded-xl"><Users className="w-6 h-6 text-brand-600" /></div>
            </div>
            <p className="text-sm text-green-600 font-medium mt-4">+{stats?.newUsers} in last 7 days</p>
          </Card>

          <Card className="p-6 bg-white border-l-4 border-l-red-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 font-bold mb-1">Pending Reports</p>
                <h3 className="text-3xl font-extrabold text-gray-900">{stats?.pendingReports}</h3>
              </div>
              <div className="p-3 bg-red-50 rounded-xl"><AlertTriangle className="w-6 h-6 text-red-600" /></div>
            </div>
            <p className="text-sm text-gray-500 font-medium mt-4">{stats?.resolvedReports} resolved total</p>
          </Card>

          <Card className="p-6 bg-white border-l-4 border-l-blue-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 font-bold mb-1">Connections</p>
                <h3 className="text-3xl font-extrabold text-gray-900">{stats?.totalConnections}</h3>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl"><Link2 className="w-6 h-6 text-blue-600" /></div>
            </div>
            <p className="text-sm text-gray-500 font-medium mt-4">Active friendships</p>
          </Card>

          <Card className="p-6 bg-white border-l-4 border-l-emerald-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 font-bold mb-1">Events</p>
                <h3 className="text-3xl font-extrabold text-gray-900">{stats?.totalEvents}</h3>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl"><Calendar className="w-6 h-6 text-emerald-600" /></div>
            </div>
            <p className="text-sm text-gray-500 font-medium mt-4">{stats?.eventParticipants} total participants</p>
          </Card>
        </div>
      )}

      {activeTab === 'users' && (
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <h2 className="text-2xl font-bold text-gray-900">Platform Users</h2>
            <div className="relative w-full sm:w-64">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search users..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="p-3 font-semibold">User</th>
                  <th className="p-3 font-semibold">Role</th>
                  <th className="p-3 font-semibold">City</th>
                  <th className="p-3 font-semibold">Joined</th>
                  <th className="p-3 font-semibold">Reports</th>
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
                    <td className="p-3 text-gray-600">{u.city || '-'}</td>
                    <td className="p-3 text-gray-600">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="p-3">
                      <span className={`font-bold ${u._count.reportsReceived > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {u._count.reportsReceived}
                      </span>
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
          <h2 className="text-2xl font-bold text-gray-900 px-2">Moderation Reports</h2>
          {reports.length === 0 ? (
            <Card className="p-8 text-center text-gray-500">No reports found.</Card>
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
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Reason: {report.reason}</h3>
                    <p className="text-gray-700 mb-4">{report.description || 'No description provided.'}</p>
                    
                    <div className="text-sm bg-white p-3 rounded-xl border border-gray-200 inline-block">
                      <span className="text-gray-500">Reported User: </span>
                      <span className="font-bold text-gray-900 mr-4">{report.reportedUser?.name}</span>
                      <span className="text-gray-500">Reporter: </span>
                      <span className="font-bold text-gray-900">{report.reporter?.name}</span>
                    </div>
                  </div>
                  
                  {report.status === 'PENDING' && (
                    <div className="flex md:flex-col gap-2 shrink-0 self-start md:self-stretch justify-center">
                      <Button onClick={() => handleResolveReport(report.id, 'RESOLVED')} className="bg-red-600 hover:bg-red-700 border-red-600 text-white shadow-sm">
                        Take Action / Resolve
                      </Button>
                      <Button variant="outline" onClick={() => handleResolveReport(report.id, 'DISMISSED')}>
                        Dismiss
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
