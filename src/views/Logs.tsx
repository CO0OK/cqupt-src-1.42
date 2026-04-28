import React, { useState, useEffect } from 'react';
import { Terminal, Clock, User, Search, Filter, Download, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getApiErrorMessage } from '../utils/apiError';

interface LogEntry {
  id: number;
  time: string;
  user: string;
  action: string;
  ip: string;
  status: string;
  source?: string;
}

export default function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [fetchedAt, setFetchedAt] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [ipFilter, setIpFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [quickFilter, setQuickFilter] = useState('all');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const sourceLabelMap: Record<string, string> = {
    vulnerability: '漏洞审核',
    points: '积分变更',
    mall: '商城兑换',
    announcement: '公告管理',
    security: '安全审计',
  };

  const sourceBadgeClassMap: Record<string, string> = {
    vulnerability: 'bg-red-500/10 text-red-400 border-red-500/30',
    points: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    mall: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    announcement: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    security: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
  };

  const toDateInput = (date: Date): string => date.toISOString().split('T')[0];

  const getEffectiveDateRange = (): { start?: string; end?: string } => {
    if (quickFilter === 'week') {
      const now = new Date();
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      return { start: toDateInput(weekAgo), end: toDateInput(now) };
    }
    if (quickFilter === 'month') {
      const now = new Date();
      const monthAgo = new Date();
      monthAgo.setMonth(now.getMonth() - 1);
      return { start: toDateInput(monthAgo), end: toDateInput(now) };
    }
    return {
      start: startDate || undefined,
      end: endDate || undefined,
    };
  };

  const { start: effectiveStartDate, end: effectiveEndDate } = getEffectiveDateRange();

  useEffect(() => {
    setPage(1);
  }, [searchTerm, startDate, endDate, userFilter, ipFilter, statusFilter, sourceFilter, quickFilter, pageSize]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        setLoadError('');

        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('pageSize', String(pageSize));
        if (searchTerm.trim()) params.set('keyword', searchTerm.trim());
        if (userFilter.trim()) params.set('user', userFilter.trim());
        if (statusFilter !== 'all') params.set('status', statusFilter);
        if (sourceFilter !== 'all') params.set('source', sourceFilter);
        if (ipFilter.trim()) params.set('ip', ipFilter.trim());
        if (effectiveStartDate) params.set('startDate', effectiveStartDate);
        if (effectiveEndDate) params.set('endDate', effectiveEndDate);

        const res = await fetch(`/api/logs?${params.toString()}`);
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          throw new Error('日志接口未生效，请重启 dev 服务后重试');
        }

        const data = await res.json();

        if (!res.ok || !data?.success) {
          throw new Error(getApiErrorMessage(data, `获取日志失败（${res.status}）`, res.status));
        }

        setLogs(Array.isArray(data.logs) ? data.logs : []);
        setTotal(typeof data.total === 'number' ? data.total : 0);
        setTotalPages(typeof data.totalPages === 'number' ? Math.max(1, data.totalPages) : 1);
        setHasNext(Boolean(data.hasNext));
        setFetchedAt(new Date().toLocaleTimeString());
      } catch (error) {
        console.error('Failed to fetch logs:', error);
        setLoadError(error instanceof Error ? error.message : '日志加载失败，请稍后重试');
        setLogs([]);
        setTotal(0);
        setTotalPages(1);
        setHasNext(false);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchLogs, 200);
    return () => clearTimeout(timer);
  }, [page, pageSize, searchTerm, userFilter, ipFilter, statusFilter, sourceFilter, effectiveStartDate, effectiveEndDate]);

  const handleQuickFilter = (filterId: string) => {
    setQuickFilter(filterId);
    if (filterId !== 'custom') {
      setStartDate('');
      setEndDate('');
    }
  };

  const handleExport = () => {
    const headers = ['TIMESTAMP', 'USER', 'ACTION', 'IP ADDRESS', 'STATUS'];
    const csvContent = [
      headers.join(','),
      ...logs.map(log => [
        log.time,
        log.user,
        `"${log.action.replace(/"/g, '""')}"`,
        log.ip,
        log.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">系统操作日志</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">记录平台所有关键操作，确保安全审计可追溯</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExport}
            className="bg-primary-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20 active:scale-95"
          >
            <Download className="w-4 h-4" /> 导出筛选日志
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索用户、操作、IP 或时间..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
          />
        </div>

        <div className="flex items-center bg-gray-100 dark:bg-slate-800 p-1 rounded-xl">
        {[
          { id: 'all', label: '全部时间' },
          { id: 'week', label: '近一周' },
          { id: 'month', label: '近一个月' }
        ].map(filter => (
          <button
            key={filter.id}
            onClick={() => handleQuickFilter(filter.id)}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              quickFilter === filter.id
              ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-slate-300'
            }`}
          >
            {filter.label}
          </button>
        ))}
        </div>

        <button 
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl border transition-all ${
            showAdvanced 
            ? 'bg-primary-50 border-primary-200 text-primary-600 dark:bg-primary-900/20 dark:border-primary-800' 
            : 'bg-white border-gray-200 text-gray-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400'
          }`}
        >
          <Filter className="w-4 h-4" /> 高级筛选
        </button>
      </div>

      {/* Advanced Filters */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
                <Search className="w-4 h-4 text-primary-600" />
                详细筛选条件
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">开始日期</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input 
                      type="date" 
                      value={startDate}
                      onChange={(e) => { setStartDate(e.target.value); setQuickFilter('custom'); }}
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-xs focus:ring-2 focus:ring-primary-500 dark:text-white outline-none" 
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">结束日期</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input 
                      type="date" 
                      value={endDate}
                      onChange={(e) => { setEndDate(e.target.value); setQuickFilter('custom'); }}
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-xs focus:ring-2 focus:ring-primary-500 dark:text-white outline-none" 
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">用户名</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="搜索用户..."
                      value={userFilter}
                      onChange={(e) => setUserFilter(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-xs focus:ring-2 focus:ring-primary-500 dark:text-white outline-none" 
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">IP 地址</label>
                  <div className="relative">
                    <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="搜索 IP..."
                      value={ipFilter}
                      onChange={(e) => setIpFilter(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-xs focus:ring-2 focus:ring-primary-500 dark:text-white outline-none" 
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">状态</label>
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-xs focus:ring-2 focus:ring-primary-500 dark:text-white outline-none"
                  >
                    <option value="all">全部状态</option>
                    <option value="success">Success</option>
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="error">Error</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">来源</label>
                  <select
                    value={sourceFilter}
                    onChange={(e) => setSourceFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-xs focus:ring-2 focus:ring-primary-500 dark:text-white outline-none"
                  >
                    <option value="all">全部来源</option>
                    <option value="vulnerability">漏洞审核</option>
                    <option value="points">积分变更</option>
                    <option value="mall">商城兑换</option>
                    <option value="announcement">公告管理</option>
                    <option value="security">安全审计</option>
                  </select>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-10 text-center text-sm text-gray-500 dark:text-slate-400">
          正在加载日志...
        </div>
      )}
      {!loading && loadError && (
        <div className="bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-200 dark:border-red-900/30 p-4 text-sm text-red-600 dark:text-red-300">
          {loadError}
        </div>
      )}

      <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden font-mono">
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            </div>
            <span className="text-xs text-slate-500 ml-2">Audit Log Viewer v1.0.5</span>
          </div>
          <div className="text-[10px] text-slate-500">
            Showing {logs.length} of {total} entries
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-500 border-b border-slate-900 bg-slate-900/50">
              <tr>
                <th className="px-6 py-3 font-medium">TIMESTAMP</th>
                <th className="px-6 py-3 font-medium">USER</th>
                <th className="px-6 py-3 font-medium">SOURCE</th>
                <th className="px-6 py-3 font-medium">ACTION</th>
                <th className="px-6 py-3 font-medium">IP ADDRESS</th>
                <th className="px-6 py-3 font-medium">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              {logs.length > 0 ? logs.map(log => (
                <tr key={log.id} className="hover:bg-slate-900/50 transition-colors group">
                  <td className="px-6 py-4 text-slate-400 flex items-center gap-2 whitespace-nowrap">
                    <Clock className="w-3 h-3 opacity-50" /> {log.time}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`flex items-center gap-1.5 ${log.user === 'admin' ? 'text-primary-400' : 'text-slate-300'}`}>
                      <User className="w-3 h-3 opacity-50" /> {log.user}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        sourceBadgeClassMap[log.source || ''] || 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {sourceLabelMap[log.source || ''] || '其他'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-300 group-hover:text-white transition-colors">
                    {log.action}
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {log.ip}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded uppercase text-[10px] font-bold ${
                      log.status === 'success' ? 'bg-emerald-500/10 text-emerald-500' :
                      log.status === 'error' ? 'bg-red-500/10 text-red-500' :
                      log.status === 'warning' ? 'bg-amber-500/10 text-amber-500' : 'bg-primary-500/10 text-primary-500'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-slate-600">
                    No logs found matching the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 bg-slate-900/50 text-[10px] text-slate-600 flex justify-between">
          <div className="flex items-center gap-3">
            <span>Total entries: {total}</span>
            <span>Page {page} / {totalPages}</span>
            <select
              value={String(pageSize)}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-2 py-1 rounded-lg text-[10px] border border-slate-700 bg-slate-800 text-slate-300 outline-none"
            >
              <option value="20">20 / page</option>
              <option value="50">50 / page</option>
              <option value="100">100 / page</option>
            </select>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={loading || page <= 1}
              className="px-2 py-1 rounded-lg border border-slate-700 text-slate-300 disabled:opacity-40"
            >
              上一页
            </button>
            <button
              onClick={() => setPage((p) => (hasNext ? p + 1 : p))}
              disabled={loading || !hasNext}
              className="px-2 py-1 rounded-lg border border-slate-700 text-slate-300 disabled:opacity-40"
            >
              下一页
            </button>
          </div>
          <span>Last updated: {fetchedAt || '--:--:--'}</span>
        </div>
      </div>
    </div>
  );
}
