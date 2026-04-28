import React, { useState, useEffect, useMemo } from 'react';
import { Vulnerability, User } from '../types';
import { Search, Shield, Globe, Clock, CheckCircle, AlertTriangle, Eye, Download, ChevronRight, Info, Filter, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MyVulnerabilitiesProps {
  user: User;
}

export default function MyVulnerabilities({ user }: MyVulnerabilitiesProps) {
  const [vulns, setVulns] = useState<Vulnerability[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVuln, setSelectedVuln] = useState<Vulnerability | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [simpleFilter, setSimpleFilter] = useState('all'); // all, pending, high, resolved
  const [filters, setFilters] = useState({
    status: '全部',
    level: '全部',
    startDate: '',
    endDate: ''
  });
  const [sortBy, setSortBy] = useState('date_desc');

  const canPreviewAttachment = (mimeType?: string) =>
    ['application/pdf', 'image/png', 'image/jpeg', 'text/plain'].includes(mimeType || '');

  const fetchVulns = async () => {
    try {
      const res = await fetch('/api/vulnerabilities');
      const data = await res.json();
      // Filter by current user
      setVulns(data.filter((v: Vulnerability) => v.author === user.username));
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
        v.url.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;

      if (simpleFilter === 'pending' && v.status !== '待处理') return false;
      if (simpleFilter === 'high' && !['严重', '高危'].includes(v.level)) return false;
      if (simpleFilter === 'resolved' && v.status !== '已修复') return false;

      if (filters.status !== '全部' && v.status !== filters.status) return false;
      if (filters.level !== '全部' && v.level !== filters.level) return false;

      if (filters.startDate && new Date(v.date) < new Date(filters.startDate)) return false;
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setDate(end.getDate() + 1);
        if (new Date(v.date) >= end) return false;
      }

      return true;
    });

    result.sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === 'date_asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortBy === 'level_desc') {
        const levels: Record<string, number> = { '严重': 4, '高危': 3, '中危': 2, '低危': 1, '信息': 0 };
        return (levels[b.level] || 0) - (levels[a.level] || 0);
      }
      return 0;
    });

    return result;
  }, [vulns, searchTerm, simpleFilter, filters, sortBy]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case '待处理': return 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400';
      case '已审核': return 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400';
      case '修复中': return 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400';
      case '已修复': return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400';
      case '已忽略': return 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400';
      case '已隐藏': return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary-600" />
            我的漏洞
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            查看并追踪您提交的所有漏洞报告及其处理进度
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="搜索漏洞..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white shadow-sm"
            />
          </div>

          <div className="flex items-center bg-gray-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setSimpleFilter('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${simpleFilter === 'all' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              全部
            </button>
            <button
              onClick={() => setSimpleFilter('pending')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${simpleFilter === 'pending' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              待处理
            </button>
            <button
              onClick={() => setSimpleFilter('high')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${simpleFilter === 'high' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              高危/严重
            </button>
            <button
              onClick={() => setSimpleFilter('resolved')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${simpleFilter === 'resolved' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              已修复
            </button>
          </div>

          <button 
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`px-4 py-2 text-sm font-bold rounded-xl border transition-all ${showAdvanced ? 'bg-primary-50 border-primary-200 text-primary-600' : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
          >
            <span className="inline-flex items-center gap-2">
              <Filter className="w-4 h-4" />
              高级筛选
            </span>
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
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">漏洞状态</label>
                <select 
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="全部">全部状态</option>
                  <option value="待处理">待处理</option>
                  <option value="已审核">已审核</option>
                  <option value="修复中">修复中</option>
                  <option value="已修复">已修复</option>
                  <option value="已忽略">已忽略</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">危险等级</label>
                <select 
                  value={filters.level}
                  onChange={(e) => setFilters({...filters, level: e.target.value})}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
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
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="date_desc">日期降序</option>
                  <option value="date_asc">日期升序</option>
                  <option value="level_desc">等级降序</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">开始日期</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">结束日期</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="space-y-1.5 md:col-span-5">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">重置</label>
                <button 
                  onClick={() => {
                    setFilters({ status: '全部', level: '全部', startDate: '', endDate: '' });
                    setSimpleFilter('all');
                    setSearchTerm('');
                  }}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 text-gray-500 hover:text-red-500 transition-colors flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  重置筛选
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredVulns.length > 0 ? (
            filteredVulns.map((vuln, index) => (
              <motion.div 
                key={vuln.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedVuln(vuln)}
                className="group cursor-pointer bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 transition-all hover:shadow-md hover:border-primary-200 dark:hover:border-primary-900/40"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl shrink-0 ${
                    vuln.status === '已修复' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' :
                    vuln.status === '修复中' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' :
                    'bg-gray-100 dark:bg-slate-800 text-gray-400'
                  }`}>
                    {vuln.status === '已修复' ? <CheckCircle className="w-5 h-5" /> : 
                     vuln.status === '修复中' ? <Clock className="w-5 h-5" /> : 
                     <Info className="w-5 h-5" />}
                  </div>
                  
                  <div className="flex-grow space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono text-gray-400 bg-gray-50 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        {vuln.id}
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${getStatusColor(vuln.status)}`}>
                        {vuln.status}
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                        vuln.level === '严重' ? 'bg-red-100 text-red-700' :
                        vuln.level === '高危' ? 'bg-orange-100 text-orange-700' :
                        vuln.level === '中危' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {vuln.level}
                      </span>
                      <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors line-clamp-1">
                        {vuln.title}
                      </h3>
                    </div>
                    
                    <div className="flex items-center gap-4 text-[10px] text-gray-400 font-medium">
                      <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {vuln.url}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {vuln.date}</span>
                    </div>
                  </div>

                  <div className="self-center">
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500 transition-colors" />
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-gray-200 dark:border-slate-800">
              <div className="bg-gray-50 dark:bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-500 dark:text-slate-400">您尚未提交过漏洞报告</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedVuln && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-slate-800"
            >
              <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl text-white ${
                    selectedVuln.status === '已修复' ? 'bg-emerald-600' : 'bg-primary-600'
                  }`}>
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">漏洞详情</h3>
                    <p className="text-xs text-gray-500 font-mono">{selectedVuln.id}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedVuln(null)} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-slate-950 rounded-2xl border border-gray-100 dark:border-slate-800">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 font-bold">漏洞状态</p>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusColor(selectedVuln.status)}`}>
                      {selectedVuln.status}
                    </span>
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

                <div className="space-y-4">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                    {selectedVuln.title}
                  </h1>
                  <div className="flex items-center gap-4 text-xs text-gray-400 border-b border-gray-50 dark:border-slate-800 pb-4">
                    <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> {selectedVuln.url}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {selectedVuln.date}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-bold text-gray-700 dark:text-slate-300">漏洞描述</p>
                  <div className="text-gray-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap text-sm p-4 bg-gray-50 dark:bg-slate-950 rounded-2xl border border-gray-100 dark:border-slate-800">
                    {selectedVuln.description}
                  </div>
                </div>

                {selectedVuln.attachment ? (
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-gray-700 dark:text-slate-300">提交附件</p>
                    <div className="p-4 bg-gray-50 dark:bg-slate-950 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-3">
                      <p className="text-sm text-gray-700 dark:text-slate-300">{selectedVuln.attachment}</p>
                      <div className="flex flex-wrap gap-2">
                        {canPreviewAttachment(selectedVuln.attachmentType) ? (
                          <button
                            onClick={() => {
                              window.open(`/api/vulnerabilities/${encodeURIComponent(selectedVuln.id)}/attachment?mode=preview`, '_blank', 'noopener');
                            }}
                            className="px-3 py-2 text-xs font-bold rounded-xl border border-primary-200 text-primary-700 bg-primary-50 hover:bg-primary-100 transition-all inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" /> 安全预览
                          </button>
                        ) : (
                          <span className="px-3 py-2 text-xs rounded-xl border border-amber-200 text-amber-700 bg-amber-50">
                            该格式不支持在线预览，请下载后在本地查看
                          </span>
                        )}
                        <button
                          onClick={() => {
                            window.open(`/api/vulnerabilities/${encodeURIComponent(selectedVuln.id)}/attachment?mode=download`, '_blank', 'noopener');
                          }}
                          className="px-3 py-2 text-xs font-bold rounded-xl border border-gray-200 text-gray-700 bg-white hover:bg-gray-100 transition-all inline-flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" /> 下载附件
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}

                {selectedVuln.auditNote && (
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" /> 审核反馈
                    </p>
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30 text-sm text-amber-800 dark:text-amber-300 italic">
                      "{selectedVuln.auditNote}"
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 bg-gray-50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-800">
                <button 
                  onClick={() => setSelectedVuln(null)}
                  className="w-full py-3 bg-primary-600 text-white font-bold rounded-2xl shadow-lg shadow-primary-600/20 hover:bg-primary-700 transition-all"
                >
                  返回列表
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
