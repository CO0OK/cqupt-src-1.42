import React, { useState, useEffect, useMemo } from 'react';
import { Vulnerability } from '../types';
import { Search, Filter, ChevronRight, X, Shield, Globe, AlertTriangle, FileText, CheckCircle, Ban, ClipboardCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function VulnAudit() {
  const [vulns, setVulns] = useState<Vulnerability[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [simpleFilter, setSimpleFilter] = useState('all'); // all, high, today
  const [advancedFilters, setAdvancedFilters] = useState({
    level: '全部',
    type: '全部',
    startDate: '',
    endDate: ''
  });
  const [sortBy, setSortBy] = useState('date_desc');
  const [selectedVuln, setSelectedVuln] = useState<Vulnerability | null>(null);
  const [auditNote, setAuditNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchVulns = async () => {
    try {
      const res = await fetch('/api/vulnerabilities');
      const data = await res.json();
      setVulns(data.filter((v: Vulnerability) => v.status === '待处理'));
    } catch (err) {
      console.error('Failed to fetch vulnerabilities:', err);
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
      if (simpleFilter === 'high' && !['严重', '高危'].includes(v.level)) return false;
      if (simpleFilter === 'today') {
        const today = new Date().toISOString().split('T')[0];
        if (!v.date.startsWith(today)) return false;
      }

      // Advanced Filters
      if (advancedFilters.level !== '全部' && v.level !== advancedFilters.level) return false;
      if (advancedFilters.type !== '全部' && v.type !== advancedFilters.type) return false;
      
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
      return 0;
    });

    return result;
  }, [vulns, searchTerm, simpleFilter, advancedFilters, sortBy]);

  const handleAudit = async (status: string) => {
    if (!selectedVuln) return;
    if (!auditNote.trim()) {
      alert('请填写审核意见');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/vulnerabilities/${selectedVuln.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, auditNote }),
      });
      if (res.ok) {
        fetchVulns();
        setSelectedVuln(null);
        setAuditNote('');
      }
    } catch (err) {
      console.error('Audit failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-slate-800 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <ClipboardCheck className="w-6 h-6 text-primary-600" />
                漏洞审核管理
              </h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">审核并评估白帽子提交的潜在威胁，确保校园网络安全</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="搜索标题、ID或提交者..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:text-white w-64 focus:ring-2 focus:ring-primary-500 outline-none transition-all" 
                />
              </div>
              <button 
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all ${showAdvanced ? 'bg-primary-50 border-primary-200 text-primary-600 dark:bg-primary-900/20 dark:border-primary-800' : 'bg-white border-gray-200 text-gray-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400'}`}
              >
                <Filter className="w-3.5 h-3.5" />
                高级筛选
              </button>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="date_desc">日期降序</option>
                <option value="date_asc">日期升序</option>
                <option value="level_desc">等级降序</option>
                <option value="level_asc">等级升序</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl">
              <button 
                onClick={() => setSimpleFilter('all')}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${simpleFilter === 'all' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-slate-300'}`}
              >
                全部待审
              </button>
              <button 
                onClick={() => setSimpleFilter('high')}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${simpleFilter === 'high' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-slate-300'}`}
              >
                高危/严重
              </button>
              <button 
                onClick={() => setSimpleFilter('today')}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${simpleFilter === 'today' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-slate-300'}`}
              >
                今日提交
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showAdvanced && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">危险等级</label>
                    <select 
                      value={advancedFilters.level}
                      onChange={(e) => setAdvancedFilters({...advancedFilters, level: e.target.value})}
                      className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                    >
                      <option value="全部">全部等级</option>
                      <option value="严重">严重</option>
                      <option value="高危">高危</option>
                      <option value="中危">中危</option>
                      <option value="低危">低危</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">漏洞类型</label>
                    <select 
                      value={advancedFilters.type}
                      onChange={(e) => setAdvancedFilters({...advancedFilters, type: e.target.value})}
                      className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                    >
                      <option value="全部">全部类型</option>
                      <option value="SQL注入">SQL注入</option>
                      <option value="XSS跨站脚本">XSS跨站脚本</option>
                      <option value="越权访问">越权访问</option>
                      <option value="命令执行">命令执行</option>
                      <option value="文件上传">文件上传</option>
                      <option value="其他">其他</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">开始日期</label>
                    <input 
                      type="date"
                      value={advancedFilters.startDate}
                      onChange={(e) => setAdvancedFilters({...advancedFilters, startDate: e.target.value})}
                      className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">结束日期</label>
                    <input 
                      type="date"
                      value={advancedFilters.endDate}
                      onChange={(e) => setAdvancedFilters({...advancedFilters, endDate: e.target.value})}
                      className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                    />
                  </div>
                  <div className="md:col-span-4 flex justify-end">
                    <button 
                      onClick={() => {
                        setAdvancedFilters({ level: '全部', type: '全部', startDate: '', endDate: '' });
                        setSearchTerm('');
                        setSimpleFilter('all');
                      }}
                      className="text-xs font-bold text-gray-400 hover:text-primary-600 transition-colors flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      重置所有筛选
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 dark:bg-slate-950 text-gray-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">漏洞编号</th>
                <th className="px-6 py-4">漏洞标题</th>
                <th className="px-6 py-4">提交者</th>
                <th className="px-6 py-4">提交日期</th>
                <th className="px-6 py-4 text-center">危险等级</th>
                <th className="px-6 py-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {filteredVulns.length > 0 ? filteredVulns.map(vuln => (
                <tr key={vuln.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="px-6 py-4 text-xs font-mono text-gray-400">{vuln.id}</td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors">{vuln.title}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{vuln.type}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-[10px] font-bold text-primary-600">
                        {vuln.author[0].toUpperCase()}
                      </div>
                      <span className="text-sm text-gray-600 dark:text-slate-300 font-medium">{vuln.author}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">{vuln.date}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                      vuln.level === '严重' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      vuln.level === '高危' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                      vuln.level === '中危' ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : 
                      'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {vuln.level}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setSelectedVuln(vuln)}
                      className="bg-primary-600 text-white px-4 py-1.5 rounded-xl text-xs font-bold hover:bg-primary-700 shadow-lg shadow-primary-600/20 transition-all active:scale-95"
                    >
                      立即审核
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <ClipboardCheck className="w-12 h-12" />
                      <p className="text-sm font-medium">暂无待审核漏洞</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-6 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs text-gray-500 font-medium">
          <span>显示 {filteredVulns.length} 条记录</span>
          <div className="flex gap-2">
            <button className="px-4 py-2 border border-gray-200 dark:border-slate-800 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50">上一页</button>
            <button className="px-4 py-2 border border-gray-200 dark:border-slate-800 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">下一页</button>
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
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">漏洞审核详情</h3>
                    <p className="text-xs text-gray-500 font-mono">{selectedVuln.id}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedVuln(null)} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-slate-950 rounded-2xl border border-gray-100 dark:border-slate-800">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 font-bold">漏洞标题</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedVuln.title}</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-slate-950 rounded-2xl border border-gray-100 dark:border-slate-800">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 font-bold">影响资产</p>
                    <p className="text-sm font-bold text-primary-600 dark:text-primary-400 flex items-center gap-1">
                      <Globe className="w-3 h-3" /> {selectedVuln.url}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-slate-950 rounded-2xl border border-gray-100 dark:border-slate-800">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 font-bold">漏洞类型</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedVuln.type}</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-slate-950 rounded-2xl border border-gray-100 dark:border-slate-800">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 font-bold">危险等级</p>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedVuln.level === '严重' ? 'bg-red-100 text-red-700' :
                      selectedVuln.level === '高危' ? 'bg-orange-100 text-orange-700' :
                      selectedVuln.level === '中危' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {selectedVuln.level}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1">
                    <FileText className="w-4 h-4" /> 漏洞描述
                  </p>
                  <div className="p-4 bg-gray-50 dark:bg-slate-950 rounded-2xl border border-gray-100 dark:border-slate-800 text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
                    {selectedVuln.description}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" /> 审核意见
                  </p>
                  <textarea 
                    rows={3}
                    value={auditNote}
                    onChange={(e) => setAuditNote(e.target.value)}
                    placeholder="请输入审核意见、修复建议或驳回原因..." 
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white text-sm resize-none"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 flex flex-wrap gap-3">
                <button 
                  onClick={() => handleAudit('已忽略')}
                  disabled={isSubmitting}
                  className="flex-1 min-w-[120px] py-3 bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 font-bold rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Ban className="w-4 h-4" /> 忽略/驳回
                </button>
                <button 
                  onClick={() => handleAudit('修复中')}
                  disabled={isSubmitting}
                  className="flex-1 min-w-[120px] py-3 bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30 font-bold rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <AlertTriangle className="w-4 h-4" /> 确认/修复中
                </button>
                <button 
                  onClick={() => handleAudit('已审核')}
                  disabled={isSubmitting}
                  className="flex-1 min-w-[120px] py-3 bg-primary-600 text-white font-bold rounded-xl shadow-lg shadow-primary-600/20 hover:bg-primary-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" /> 通过审核
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
