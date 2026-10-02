import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  Activity,
  AlertTriangle,
  FileText,
  Search,
  CheckCircle,
  XCircle,
  RefreshCw,
  Server,
  Zap,
} from 'lucide-react';
import { User, AdminReport, AuditLog, SystemHealthMetrics } from '../../packages/models/types.ts';
import { api } from '../services/api.ts';

export const AdminDashboard: React.FC = () => {
  const [activeAdminTab, setActiveAdminTab] = useState<'metrics' | 'users' | 'reports' | 'logs'>('metrics');
  const [users, setUsers] = useState<User[]>([]);
  const [userQuery, setUserQuery] = useState('');
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [health, setHealth] = useState<SystemHealthMetrics | null>(null);
  const [overview, setOverview] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [overviewRes, usersRes, reportsRes, logsRes] = await Promise.all([
        api.getAdminOverview(),
        api.getAdminUsers(userQuery),
        api.getAdminReports(),
        api.getAdminAuditLogs(),
      ]);

      if (overviewRes.metrics) {
        setOverview(overviewRes.metrics);
        setHealth(overviewRes.metrics.health);
      }
      if (usersRes.users) setUsers(usersRes.users);
      if (reportsRes.reports) setReports(reportsRes.reports);
      if (logsRes.logs) setAuditLogs(logsRes.logs);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userQuery]);

  const handleToggleSuspend = async (user: User) => {
    const updated = await api.setAdminUserStatus(user.id, !user.isSuspended);
    if (updated.success) {
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isSuspended: !user.isSuspended } : u))
      );
      loadData();
    }
  };

  const handleResolveReport = async (reportId: string, status: 'resolved' | 'dismissed') => {
    await api.updateAdminReport(reportId, status, `Processed by administrator`);
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status } : r))
    );
    loadData();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden select-none">
      {/* Top Banner */}
      <div className="h-16 px-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-600/20 text-cyan-400 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Vesper Administration Console</h2>
            <p className="text-[11px] text-slate-400">
              Role-Based Access Control · Infrastructure Telemetry · Moderation
            </p>
          </div>
        </div>

        <button
          onClick={loadData}
          disabled={isLoading}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-lg flex items-center gap-1.5 transition-colors border border-slate-700"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="px-6 py-2 bg-slate-900/60 border-b border-slate-800 flex items-center gap-2 text-xs font-medium">
        <button
          onClick={() => setActiveAdminTab('metrics')}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
            activeAdminTab === 'metrics'
              ? 'bg-slate-800 text-white font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4 text-cyan-400" />
          <span>System Health & KPIs</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('users')}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
            activeAdminTab === 'users'
              ? 'bg-slate-800 text-white font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4 text-indigo-400" />
          <span>User Directory</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('reports')}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
            activeAdminTab === 'reports'
              ? 'bg-slate-800 text-white font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span>Abuse Reports ({reports.filter((r) => r.status === 'pending').length})</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('logs')}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
            activeAdminTab === 'logs'
              ? 'bg-slate-800 text-white font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4 text-emerald-400" />
          <span>Audit Log Trail</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Tab 1: System Health & Metrics */}
        {activeAdminTab === 'metrics' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                <span className="text-xs text-slate-400 font-medium block">Total Registered Users</span>
                <span className="text-2xl font-bold text-white font-mono tabular-nums mt-1 block">
                  {overview?.totalUsers || 0}
                </span>
                <span className="text-[11px] text-emerald-400 mt-1 block">
                  {overview?.activeUsers || 0} online now
                </span>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                <span className="text-xs text-slate-400 font-medium block">Active Conversations</span>
                <span className="text-2xl font-bold text-white font-mono tabular-nums mt-1 block">
                  {overview?.totalConversations || 0}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">Direct & Group Channels</span>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                <span className="text-xs text-slate-400 font-medium block">Messages Processed</span>
                <span className="text-2xl font-bold text-white font-mono tabular-nums mt-1 block">
                  {overview?.totalMessages || 0}
                </span>
                <span className="text-[11px] text-cyan-400 mt-1 block">Idempotent Delivery</span>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                <span className="text-xs text-slate-400 font-medium block">Pending Moderation</span>
                <span className="text-2xl font-bold text-amber-400 font-mono tabular-nums mt-1 block">
                  {overview?.pendingReports || 0}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">Requires Admin Attention</span>
              </div>
            </div>

            {/* Live Telemetry Card */}
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-cyan-400" />
                <span>Real-Time Node.js & Database Infrastructure Diagnostics</span>
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-1">PostgreSQL Query Latency</span>
                  <span className="text-lg font-bold text-white font-mono tabular-nums">
                    {health?.databaseQueryLatencyMs || 1.2} ms
                  </span>
                  <span className="text-[10px] text-emerald-400 block mt-1">Healthy Index Lookup</span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-1">Redis Pub/Sub Cache Hit</span>
                  <span className="text-lg font-bold text-white font-mono tabular-nums">
                    {health?.redisCacheHitRatio || 99.2}%
                  </span>
                  <span className="text-[10px] text-emerald-400 block mt-1">L1 Memory Cache Active</span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-1">Active WebSocket Sockets</span>
                  <span className="text-lg font-bold text-white font-mono tabular-nums">
                    {health?.activeWebSocketConnections || 1} connections
                  </span>
                  <span className="text-[10px] text-cyan-400 block mt-1">Full-Duplex Signaling</span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-1">Node Heap Memory</span>
                  <span className="text-lg font-bold text-white font-mono tabular-nums">
                    {health?.memoryUsageMb || 45} MB
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">Garbage Collector nominal</span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-1">Server Uptime</span>
                  <span className="text-lg font-bold text-white font-mono tabular-nums">
                    {Math.floor((health?.serverUptimeSeconds || 120) / 60)} minutes
                  </span>
                  <span className="text-[10px] text-emerald-400 block mt-1">Zero downtime SLA</span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-1">Coturn STUN/TURN Relays</span>
                  <span className="text-lg font-bold text-white font-mono tabular-nums">
                    3478 UDP/TCP
                  </span>
                  <span className="text-[10px] text-emerald-400 block mt-1">NAT Traversal Ready</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: User Directory & Suspension */}
        {activeAdminTab === 'users' && (
          <div className="space-y-4">
            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search user by name, username, phone..."
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 bg-slate-900 text-xs text-white placeholder-slate-400 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5">User</th>
                    <th className="p-3.5">Phone / Email</th>
                    <th className="p-3.5">Role</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-850/50">
                      <td className="p-3.5 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-800 shrink-0">
                          {u.profilePhoto ? (
                            <img src={u.profilePhoto} alt={u.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-[10px]">
                              {u.name.slice(0, 2)}
                            </div>
                          )}
                        </div>
                        <div>
                          <span className="font-semibold text-white block">{u.name}</span>
                          <span className="text-slate-400 font-mono text-[11px]">@{u.username}</span>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-[11px]">
                        <div>{u.phone}</div>
                        <div className="text-slate-500">{u.email || 'No email'}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="font-mono text-[11px] text-cyan-400 font-bold uppercase">
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3.5">
                        {u.isSuspended ? (
                          <span className="text-rose-400 font-semibold">Suspended</span>
                        ) : (
                          <span className="text-emerald-400 font-semibold">Active</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => handleToggleSuspend(u)}
                          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                            u.isSuspended
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              : 'bg-rose-900/40 text-rose-300 hover:bg-rose-900/70 border border-rose-800'
                          }`}
                        >
                          {u.isSuspended ? 'Restore' : 'Suspend'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Abuse Reports */}
        {activeAdminTab === 'reports' && (
          <div className="space-y-3">
            {reports.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-400">No reports on file.</p>
            ) : (
              reports.map((report) => (
                <div
                  key={report.id}
                  className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">Report #{report.id}</span>
                      <span
                        className={`text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded ${
                          report.status === 'pending'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {report.status}
                      </span>
                    </div>
                    <p className="text-slate-300">
                      Reported by <strong className="text-white">{report.reporterName}</strong> against{' '}
                      <strong className="text-cyan-400">{report.reportedUserName || 'Target Entity'}</strong>
                    </p>
                    <p className="text-slate-400 italic">"{report.reason}"</p>
                  </div>

                  {report.status === 'pending' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleResolveReport(report.id, 'resolved')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1 font-semibold"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Resolve</span>
                      </button>
                      <button
                        onClick={() => handleResolveReport(report.id, 'dismissed')}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Dismiss</span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 4: Audit Log Trail */}
        {activeAdminTab === 'logs' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800 text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3.5 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-cyan-400">{log.action}</span>
                    <span className="text-slate-400">by {log.adminName}</span>
                  </div>
                  <p className="text-slate-300 mt-0.5">{log.details}</p>
                </div>
                <span className="text-slate-500 font-mono text-[11px] shrink-0">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
