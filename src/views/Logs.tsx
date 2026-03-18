import React, { useState, useMemo } from 'react';
import { Terminal, Clock, Shield, User, Info, Search, Filter, Download, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LogEntry {
  id: number;
  time: string;
  user: string;
  action: string;
  ip: string;
  status: string;
}

const INITIAL_LOGS: LogEntry[] = [
  { id: 1, time: '2024-03-24 14:22:15', user: 'admin', action: '审核通过漏洞 VU-2024-001', ip: '172.16.2.45', status: 'success' },
  { id: 2, time: '2024-03-24 13:10:02', user: 'shenhe', action: '修改漏洞状态 VU-2024-002 -> 已审核', ip: '172.16.5.12', status: 'success' },
  { id: 3, time: '2024-03-24 11:45:30', user: 'temp', action: '提交新漏洞: 核心教务系统SQL注入', ip: '10.21.44.128', status: 'info' },
  { id: 4, time: '2024-03-24 09:12:44', user: 'admin', action: '登录系统', ip: '172.16.2.45', status: 'success' },
  { id: 5, time: '2024-03-23 23:55:12', user: 'unknown', action: '登录失败: 密码错误 (admin)', ip: '192.168.1.100', status: 'error' },
  { id: 6, time: '2024-03-23 18:30:05', user: 'system', action: '自动备份数据库', ip: 'localhost', status: 'success' },
  { id: 7, time: '2024-03-23 16:20:11', user: 'admin', action: '删除用户: test_user', ip: '172.16.2.45', status: 'warning' },
];

export default function Logs() {
  const [logs] = useState<LogEntry[]>(INITIAL_LOGS);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [ipFilter, setIpFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [quickFilter, setQuickFilter] = useState('all');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleQuickFilter = (filterId: string) => {
    setQuickFilter(filterId);
    if (filterId !== 'custom') {
      setStartDate('');
      setEndDate('');
    }
  };

  const filteredLogs = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(now.getMonth() - 1);

    return logs.filter(log => {
      const logDateTime = new Date(log.time);
      const logDate = log.time.split(' ')[0];

      // Quick Time Filter
      if (quickFilter === 'week' && logDateTime < oneWeekAgo) return false;
      if (quickFilter === 'month' && logDateTime < oneMonthAgo) return false;

      // Advanced Filters (only if showAdvanced is true or if they are set)
      const matchesStart = !startDate || logDate >= startDate;
      const matchesEnd = !endDate || logDate <= endDate;
      const matchesUser = !userFilter || log.user.toLowerCase().includes(userFilter.toLowerCase());
      const matchesIp = !ipFilter || log.ip.toLowerCase().includes(ipFilter.toLowerCase());
      const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
      
      return matchesStart && matchesEnd && matchesUser && matchesIp && matchesStatus;
    });
  }, [logs, startDate, endDate, userFilter, ipFilter, statusFilter, quickFilter]);

  const handleExport = () => {
    const headers = ['TIMESTAMP', 'USER', 'ACTION', 'IP ADDRESS', 'STATUS'];
    const csvContent = [
      headers.join(','),
      ...filteredLogs.map(log => [
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
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all border ${
              showAdvanced 
              ? 'bg-primary-50 border-primary-200 text-primary-600 dark:bg-primary-900/20 dark:border-primary-800' 
              : 'bg-white border-gray-200 text-gray-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400'
            }`}
          >
            <Filter className="w-4 h-4" /> 高级筛选
          </button>
          <button 
            onClick={handleExport}
            className="bg-primary-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20 active:scale-95"
          >
            <Download className="w-4 h-4" /> 导出筛选日志
          </button>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-gray-400 uppercase mr-2">快速时间筛选:</span>
        {[
          { id: 'all', label: '全部时间' },
          { id: 'week', label: '近一周' },
          { id: 'month', label: '近一个月' }
        ].map(filter => (
          <button
            key={filter.id}
            onClick={() => handleQuickFilter(filter.id)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              quickFilter === filter.id
              ? 'bg-primary-600 text-white shadow-md shadow-primary-500/20'
              : 'bg-white dark:bg-slate-900 text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-slate-800 hover:border-primary-500'
            }`}
          >
            {filter.label}
          </button>
        ))}
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
            Showing {filteredLogs.length} of {logs.length} entries
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-500 border-b border-slate-900 bg-slate-900/50">
              <tr>
                <th className="px-6 py-3 font-medium">TIMESTAMP</th>
                <th className="px-6 py-3 font-medium">USER</th>
                <th className="px-6 py-3 font-medium">ACTION</th>
                <th className="px-6 py-3 font-medium">IP ADDRESS</th>
                <th className="px-6 py-3 font-medium">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              {filteredLogs.length > 0 ? filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-900/50 transition-colors group">
                  <td className="px-6 py-4 text-slate-400 flex items-center gap-2 whitespace-nowrap">
                    <Clock className="w-3 h-3 opacity-50" /> {log.time}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`flex items-center gap-1.5 ${log.user === 'admin' ? 'text-primary-400' : 'text-slate-300'}`}>
                      <User className="w-3 h-3 opacity-50" /> {log.user}
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
                  <td colSpan={5} className="px-6 py-20 text-center text-slate-600">
                    No logs found matching the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 bg-slate-900/50 text-[10px] text-slate-600 flex justify-between">
          <span>Total entries: {filteredLogs.length}</span>
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
}
