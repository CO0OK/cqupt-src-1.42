import React, { useState, useEffect, useMemo } from 'react';
import { Vulnerability } from '../types';
import { Search, Filter, ChevronRight, X, Shield, Globe, AlertTriangle, FileText, CheckCircle, Settings, Clock, EyeOff, Save, Eye, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { VULN_TYPES, VULN_LEVELS } from '../constants';
import { getApiErrorMessage } from '../utils/apiError';
import ConfirmModal from '../components/ConfirmModal';

export default function VulnManage() {
  type Notice = { type: 'success' | 'error'; message: string } | null;
  type ConfirmAction =
    | { kind: 'update_status'; status: string }
    | { kind: 'save_changes' }
    | null;
  const [vulns, setVulns] = useState<Vulnerability[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [simpleFilter, setSimpleFilter] = useState('all'); // all, pending, high
  const [advancedFilters, setAdvancedFilters] = useState({
    status: '全部',
    level: '全部',
    startDate: '',
    endDate: ''
  });
  const [sortBy, setSortBy] = useState('date_desc');
  const [selectedVuln, setSelectedVuln] = useState<Vulnerability | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Vulnerability>>({});
  const [notice, setNotice] = useState<Notice>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const canEditVulnerability = (vuln: Vulnerability) => !['待处理', '审核中'].includes(vuln.status);
  const canPreviewAttachment = (mimeType?: string) =>
    ['application/pdf', 'image/png', 'image/jpeg', 'text/plain'].includes(mimeType || '');

  const parseError = async (res: Response, fallback: string) => {
    let data: unknown = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }
    return getApiErrorMessage(data, fallback, res.status);
  };

  const fetchVulns = async () => {
    try {
      const res = await fetch('/api/vulnerabilities');
      if (!res.ok) {
        setNotice({ type: 'error', message: await parseError(res, '获取漏洞列表失败') });
        return;
      }
      const data = await res.json();
      setVulns(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch vulnerabilities:', err);
      setNotice({ type: 'error', message: '网络异常，获取漏洞列表失败' });
    }
  };

  useEffect(() => {
    fetchVulns();
  }, []);

  const filteredVulns = useMemo(() => {
    const result = vulns.filter(v => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        v.title.toLowerCase().includes(searchLower) ||
        v.id.toLowerCase().includes(searchLower) ||
        v.author.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      // Simple Filters
      if (simpleFilter === 'pending' && v.status !== '待处理') return false;
      if (simpleFilter === 'high' && !['严重', '高危'].includes(v.level)) return false;

      // Advanced Filters
      if (advancedFilters.status !== '全部' && v.status !== advancedFilters.status) return false;
      if (advancedFilters.level !== '全部' && v.level !== advancedFilters.level) return false;
      
      if (advancedFilters.startDate) {
        if (new Date(v.date) < new Date(advancedFilters.startDate)) return false;
      }
      if (advancedFilters.endDate) {
        const end = new Date(advancedFilters.endDate);
        end.setDate(end.getDate() + 1);
        if (new Date(v.date) >= end) return false;
      }

      return true;
    });

    result.sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === 'date_asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortBy === 'level_desc') {
        const levels: Record<string, number> = { '严重': 4, '高危': 3, '中危': 2, '低危': 1 };
        return (levels[b.level] || 0) - (levels[a.level] || 0);
      }
      if (sortBy === 'level_asc') {
        const levels: Record<string, number> = { '严重': 4, '高危': 3, '中危': 2, '低危': 1 };
        return (levels[a.level] || 0) - (levels[b.level] || 0);
      }
      if (sortBy === 'status') return a.status.localeCompare(b.status);
      return 0;
    });

    return result;
  }, [vulns, searchTerm, simpleFilter, advancedFilters, sortBy]);

  const handleOpenSettings = (vuln: Vulnerability) => {
    setSelectedVuln(vuln);
    setEditData({ ...vuln });
    setIsEditing(false);
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedVuln) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/vulnerabilities/${selectedVuln.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        setNotice({ type: 'error', message: await parseError(res, '更新漏洞状态失败') });
        return;
      }
      await fetchVulns();
      setNotice({ type: 'success', message: `漏洞 ${selectedVuln.id} 状态已更新为「${status}」` });
      setSelectedVuln(null);
    } catch (err) {
      console.error(err);
      setNotice({ type: 'error', message: '网络异常，更新漏洞状态失败' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!selectedVuln) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/vulnerabilities/${selectedVuln.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });
      if (!res.ok) {
        setNotice({ type: 'error', message: await parseError(res, '保存漏洞修改失败') });
        return;
      }
      await fetchVulns();
      setNotice({ type: 'success', message: `漏洞 ${selectedVuln.id} 已保存修改` });
      setSelectedVuln(null);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      setNotice({ type: 'error', message: '网络异常，保存漏洞修改失败' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {notice ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-medium ${notice.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}
        >
          {notice.message}
        </div>
      ) : null}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Settings className="w-6 h-6 text-primary-600" />
              漏洞综合管理
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">管理并跟踪平台提交的所有安全漏洞，确保修复流程闭环</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="搜索标题、ID、提交者或日期..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all" 
              />
            </div>
            
            <div className="flex items-center bg-gray-100 dark:bg-slate-800 p-1 rounded-xl">
              <button 
                onClick={() => setSimpleFilter('all')}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${simpleFilter === 'all' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                全部
              </button>
              <button 
                onClick={() => setSimpleFilter('pending')}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${simpleFilter === 'pending' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                待处理
              </button>
              <button 
                onClick={() => setSimpleFilter('high')}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${simpleFilter === 'high' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                高危/严重
              </button>
            </div>

            <button 
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl border transition-all ${showAdvanced ? 'bg-primary-50 border-primary-200 text-primary-600' : 'border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
            >
              <Filter className="w-4 h-4" />
              高级筛选
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showAdvanced && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50"
            >
              <div className="p-6 grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">漏洞状态</label>
                  <select 
                    value={advancedFilters.status}
                    onChange={(e) => setAdvancedFilters({...advancedFilters, status: e.target.value})}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="全部">全部状态</option>
                    <option value="待处理">待处理</option>
                    <option value="已审核">已审核</option>
                    <option value="修复中">修复中</option>
                    <option value="已修复">已修复</option>
                    <option value="已忽略">已忽略</option>
                    <option value="已隐藏">已隐藏</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">危险等级</label>
                  <select 
                    value={advancedFilters.level}
                    onChange={(e) => setAdvancedFilters({...advancedFilters, level: e.target.value})}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="全部">全部等级</option>
                    <option value="严重">严重</option>
                    <option value="高危">高危</option>
                    <option value="中危">中危</option>
                    <option value="低危">低危</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">排序方式</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="date_desc">日期降序</option>
                    <option value="date_asc">日期升序</option>
                    <option value="level_desc">等级降序</option>
                    <option value="level_asc">等级升序</option>
                    <option value="status">按状态</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">开始日期</label>
                  <input 
                    type="date"
                    value={advancedFilters.startDate}
                    onChange={(e) => setAdvancedFilters({...advancedFilters, startDate: e.target.value})}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">结束日期</label>
                  <div className="flex gap-2">
                    <input 
                      type="date"
                      value={advancedFilters.endDate}
                      onChange={(e) => setAdvancedFilters({...advancedFilters, endDate: e.target.value})}
                      className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <button 
                      onClick={() => setAdvancedFilters({ status: '全部', level: '全部', startDate: '', endDate: '' })}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      title="重置筛选"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-slate-950 text-gray-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">漏洞编号</th>
                <th className="px-6 py-4">漏洞标题</th>
                <th className="px-6 py-4">目标资产</th>
                <th className="px-6 py-4 text-center">危险等级</th>
                <th className="px-6 py-4 text-center">当前状态</th>
                <th className="px-6 py-4">提交者</th>
                <th className="px-6 py-4">日期</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {filteredVulns.map(vuln => (
                <tr key={vuln.id} className={`hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group ${vuln.status === '已隐藏' ? 'opacity-50' : ''}`}>
                  <td className="px-6 py-4 text-xs font-mono text-gray-400">{vuln.id}</td>
                  <td className="px-6 py-4 font-semibold text-gray-800 dark:text-white">{vuln.title}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">{vuln.url}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                      vuln.level === '严重' ? 'bg-red-100 text-red-700' :
                      vuln.level === '高危' ? 'bg-orange-100 text-orange-700' :
                      vuln.level === '中危' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {vuln.level}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-medium ${
                      vuln.status === '待处理' ? 'bg-gray-100 text-gray-600' :
                      vuln.status === '已审核' ? 'bg-primary-50 text-primary-600' :
                      vuln.status === '修复中' ? 'bg-amber-50 text-amber-600' :
                      vuln.status === '已修复' ? 'bg-emerald-50 text-emerald-600' :
                      vuln.status === '已隐藏' ? 'bg-slate-100 text-slate-500' :
                      'bg-red-50 text-red-600'
                    }`}>
                      {vuln.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">{vuln.author}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{vuln.date}</td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleOpenSettings(vuln)}
                      className="text-gray-400 hover:text-primary-600 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-6 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs text-gray-500 font-medium">
          <span>显示 {filteredVulns.length} 条记录</span>
          <div className="flex gap-2">
            <button className="px-4 py-2 border border-gray-200 dark:border-slate-800 rounded-xl disabled:opacity-50">上一页</button>
            <button className="px-4 py-2 border border-gray-200 dark:border-slate-800 rounded-xl">下一页</button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedVuln && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-slate-800 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-xl text-primary-600 dark:text-primary-400">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">漏洞管理与编辑</h3>
                    <p className="text-xs text-gray-500 font-mono">{selectedVuln.id}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedVuln(null)} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                <div className="flex justify-end">
                  <button 
                    onClick={() => {
                      if (!selectedVuln || !canEditVulnerability(selectedVuln)) return;
                      setIsEditing(!isEditing);
                    }}
                    disabled={!canEditVulnerability(selectedVuln)}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      !canEditVulnerability(selectedVuln)
                        ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                        : isEditing 
                        ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                        : 'bg-gray-100 text-gray-700 border border-gray-200'
                    }`}
                  >
                    {!canEditVulnerability(selectedVuln) ? '未审核不可编辑' : isEditing ? '取消编辑' : '进入编辑模式'}
                  </button>
                </div>
                {!canEditVulnerability(selectedVuln) ? (
                  <p className="text-xs text-amber-600 -mt-2">该漏洞尚未审核，当前仅允许状态操作，不可编辑漏洞内容。</p>
                ) : null}

                {isEditing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">漏洞标题</label>
                        <input 
                          type="text"
                          value={editData.title || ''}
                          onChange={(e) => setEditData({...editData, title: e.target.value})}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">目标资产</label>
                        <input 
                          type="text"
                          value={editData.url || ''}
                          onChange={(e) => setEditData({...editData, url: e.target.value})}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">漏洞类型</label>
                        <select 
                          value={editData.type || ''}
                          onChange={(e) => setEditData({...editData, type: e.target.value})}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          {VULN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">危险等级</label>
                        <select 
                          value={editData.level || ''}
                          onChange={(e) => setEditData({...editData, level: e.target.value as Vulnerability['level']})}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          {VULN_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">漏洞描述</label>
                      <textarea 
                        rows={4}
                        value={editData.description || ''}
                        onChange={(e) => setEditData({...editData, description: e.target.value})}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                      />
                    </div>
                    {selectedVuln.attachment ? (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">附件材料</label>
                        <div className="p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60 space-y-2">
                          <p className="text-xs text-gray-700 dark:text-slate-300">{selectedVuln.attachment}</p>
                          <div className="flex flex-wrap gap-2">
                            {canPreviewAttachment(selectedVuln.attachmentType) ? (
                              <button
                                type="button"
                                onClick={() => window.open(`/api/vulnerabilities/${encodeURIComponent(selectedVuln.id)}/attachment?mode=preview`, '_blank', 'noopener')}
                                className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg border border-primary-200 text-primary-700 bg-primary-50 hover:bg-primary-100 transition-all inline-flex items-center gap-1"
                              >
                                <Eye className="w-3.5 h-3.5" /> 预览
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => window.open(`/api/vulnerabilities/${encodeURIComponent(selectedVuln.id)}/attachment?mode=download`, '_blank', 'noopener')}
                              className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg border border-gray-200 text-gray-700 bg-white hover:bg-gray-100 transition-all inline-flex items-center gap-1"
                            >
                              <Download className="w-3.5 h-3.5" /> 下载
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                    <button 
                      onClick={() => setConfirmAction({ kind: 'save_changes' })}
                      disabled={isSubmitting}
                      className="w-full py-3 bg-primary-600 text-white font-bold rounded-xl shadow-lg shadow-primary-600/20 hover:bg-primary-700 transition-all flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" /> 保存修改
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 dark:bg-slate-950 rounded-2xl border border-gray-100 dark:border-slate-800">
                        <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 font-bold">漏洞标题</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedVuln.title}</p>
                      </div>
                      <div className="p-4 bg-gray-50 dark:bg-slate-950 rounded-2xl border border-gray-100 dark:border-slate-800">
                        <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 font-bold">当前状态</p>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          selectedVuln.status === '待处理' ? 'bg-gray-100 text-gray-600' :
                          selectedVuln.status === '已审核' ? 'bg-primary-50 text-primary-600' :
                          selectedVuln.status === '修复中' ? 'bg-amber-50 text-amber-600' :
                          selectedVuln.status === '已修复' ? 'bg-emerald-50 text-emerald-600' :
                          selectedVuln.status === '已隐藏' ? 'bg-slate-100 text-slate-500' :
                          'bg-red-50 text-red-600'
                        }`}>
                          {selectedVuln.status}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {selectedVuln.attachment ? (
                        <div className="p-4 rounded-2xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 space-y-2">
                          <p className="text-xs font-bold text-gray-700 dark:text-slate-300">附件材料</p>
                          <p className="text-xs text-gray-600 dark:text-slate-400">{selectedVuln.attachment}</p>
                          <div className="flex flex-wrap gap-2">
                            {canPreviewAttachment(selectedVuln.attachmentType) ? (
                              <button
                                onClick={() => window.open(`/api/vulnerabilities/${encodeURIComponent(selectedVuln.id)}/attachment?mode=preview`, '_blank', 'noopener')}
                                className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg border border-primary-200 text-primary-700 bg-primary-50 hover:bg-primary-100 transition-all inline-flex items-center gap-1"
                              >
                                <Eye className="w-3.5 h-3.5" /> 安全预览
                              </button>
                            ) : (
                              <span className="px-2.5 py-1.5 text-[11px] rounded-lg border border-amber-200 text-amber-700 bg-amber-50">
                                不支持在线预览
                              </span>
                            )}
                            <button
                              onClick={() => window.open(`/api/vulnerabilities/${encodeURIComponent(selectedVuln.id)}/attachment?mode=download`, '_blank', 'noopener')}
                              className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg border border-gray-200 text-gray-700 bg-white hover:bg-gray-100 transition-all inline-flex items-center gap-1"
                            >
                              <Download className="w-3.5 h-3.5" /> 下载附件
                            </button>
                          </div>
                        </div>
                      ) : null}
                      <p className="text-xs font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1">
                        <Clock className="w-4 h-4" /> 流程流转与特殊操作
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <button 
                          onClick={() => setConfirmAction({ kind: 'update_status', status: '修复中' })}
                          disabled={isSubmitting || selectedVuln.status === '修复中'}
                          className="p-4 rounded-2xl border border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 flex flex-col items-center justify-center gap-2 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all group disabled:opacity-50"
                        >
                          <Clock className="w-5 h-5 opacity-50 group-hover:rotate-12 transition-transform" />
                          <p className="font-bold text-xs">修复中</p>
                        </button>
                        <button 
                          onClick={() => setConfirmAction({ kind: 'update_status', status: '已修复' })}
                          disabled={isSubmitting || selectedVuln.status === '已修复'}
                          className="p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 flex flex-col items-center justify-center gap-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all group disabled:opacity-50"
                        >
                          <CheckCircle className="w-5 h-5 opacity-50 group-hover:scale-110 transition-transform" />
                          <p className="font-bold text-xs">已修复</p>
                        </button>
                        <button 
                          onClick={() =>
                            setConfirmAction({
                              kind: 'update_status',
                              status: selectedVuln.status === '已隐藏' ? '待处理' : '已隐藏',
                            })
                          }
                          disabled={isSubmitting}
                          className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all group ${
                            selectedVuln.status === '已隐藏'
                              ? 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                              : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {selectedVuln.status === '已隐藏' ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                          <p className="font-bold text-xs">{selectedVuln.status === '已隐藏' ? '取消隐藏' : '隐藏漏洞'}</p>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="p-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50">
                <button 
                  onClick={() => setSelectedVuln(null)}
                  className="w-full py-3 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 font-bold rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all"
                >
                  关闭窗口
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        open={!!confirmAction}
        title={confirmAction?.kind === 'save_changes' ? '确认保存修改' : '确认变更漏洞状态'}
        description={
          confirmAction?.kind === 'save_changes'
            ? '保存后将覆盖当前漏洞信息。'
            : '变更后将写入漏洞流转记录。'
        }
        highlightText={
          confirmAction?.kind === 'save_changes'
            ? selectedVuln
              ? `${selectedVuln.id} · ${selectedVuln.title}`
              : ''
            : confirmAction?.kind === 'update_status' && selectedVuln
              ? `${selectedVuln.id} · ${selectedVuln.status} → ${confirmAction.status}`
              : ''
        }
        confirmText={isSubmitting ? '处理中...' : '确认执行'}
        confirmDisabled={isSubmitting}
        onCancel={() => setConfirmAction(null)}
        onConfirm={async () => {
          if (!confirmAction) return;
          const action = confirmAction;
          setConfirmAction(null);
          if (action.kind === 'save_changes') {
            await handleSaveChanges();
            return;
          }
          await handleUpdateStatus(action.status);
        }}
      />
    </div>
  );
}
