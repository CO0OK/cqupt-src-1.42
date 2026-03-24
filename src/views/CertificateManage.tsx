import React, { useState, useEffect, useMemo } from 'react';
import { Award, Search, Plus, Trash2, Download, Filter, X, CheckCircle, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Vulnerability } from '../types';
import { getApiErrorMessage } from '../utils/apiError';
import ConfirmModal from '../components/ConfirmModal';

interface Certificate {
  id: string;
  username: string;
  type: 'Honorary' | 'Outstanding' | 'Special';
  date: string;
  vulnId?: string;
  title: string;
  status: 'Active' | 'Revoked';
}

export default function CertificateManage() {
  type Notice = { type: 'success' | 'error'; message: string } | null;
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [vulns, setVulns] = useState<Vulnerability[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [simpleFilter, setSimpleFilter] = useState('all'); // all, active, honorary
  const [advancedFilters, setAdvancedFilters] = useState({
    type: '全部',
    status: '全部',
    startDate: '',
    endDate: ''
  });
  const [sortBy, setSortBy] = useState('date_desc');
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Certificate | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [confirmIssueOpen, setConfirmIssueOpen] = useState(false);
  
  // Form state
  const [selectedVulnId, setSelectedVulnId] = useState('');
  const [certType, setCertType] = useState<'Honorary' | 'Outstanding' | 'Special'>('Honorary');

  const parseError = async (res: Response, fallback: string) => {
    let data: unknown = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }
    return getApiErrorMessage(data, fallback, res.status);
  };

  const fetchData = async () => {
    try {
      const [certsRes, vulnsRes] = await Promise.all([
        fetch('/api/certificates'),
        fetch('/api/vulnerabilities')
      ]);
      if (!certsRes.ok) {
        setNotice({ type: 'error', message: await parseError(certsRes, '获取证书列表失败') });
        return;
      }
      if (!vulnsRes.ok) {
        setNotice({ type: 'error', message: await parseError(vulnsRes, '获取漏洞列表失败') });
        return;
      }
      const certsData = await certsRes.json();
      const vulnsData = await vulnsRes.json();
      setCerts(Array.isArray(certsData) ? certsData : []);
      // Only show approved vulnerabilities that don't have a certificate yet
      const safeVulns = Array.isArray(vulnsData) ? vulnsData : [];
      const approvedVulns = safeVulns.filter((v: Vulnerability) => 
        (v.status === '已审核' || v.status === '已修复' || v.status === '修复中') && 
        (Array.isArray(certsData) ? certsData : []).every((c: Certificate) => c.vulnId !== v.id)
      );
      setVulns(approvedVulns);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setNotice({ type: 'error', message: '网络异常，获取证书数据失败' });
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleIssueCert = async () => {
    if (!selectedVulnId) return;
    setIsSubmitting(true);
    const vuln = vulns.find(v => v.id === selectedVulnId);
    if (!vuln) return;

    try {
      const res = await fetch('/api/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vulnId: vuln.id,
          username: vuln.author,
          title: `${vuln.title} - 荣誉证书`,
          type: certType
        })
      });
      if (!res.ok) {
        setNotice({ type: 'error', message: await parseError(res, '颁发证书失败') });
        return;
      }
      await fetchData();
      setShowAddModal(false);
      setSelectedVulnId('');
      setNotice({ type: 'success', message: `证书已颁发：${vuln.id}` });
    } catch (err) {
      console.error(err);
      setNotice({ type: 'error', message: '网络异常，颁发证书失败' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCert = async (id: string) => {
    try {
      const res = await fetch(`/api/certificates/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        setNotice({ type: 'error', message: await parseError(res, '删除证书失败') });
        return;
      }
      await fetchData();
      setNotice({ type: 'success', message: `证书 ${id} 已删除` });
    } catch (err) {
      console.error(err);
      setNotice({ type: 'error', message: '网络异常，删除证书失败' });
    }
  };

  const handleDownloadCert = (id: string) => {
    window.open(`/api/certificates/${encodeURIComponent(id)}/pdf`, '_blank');
  };

  const handlePreviewCert = (id: string) => {
    window.open(`/api/certificates/${encodeURIComponent(id)}/pdf?mode=preview`, '_blank');
  };

  const filteredCerts = useMemo(() => {
    const result = certs.filter(c => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        c.username.toLowerCase().includes(searchLower) ||
        c.id.toLowerCase().includes(searchLower) ||
        c.title.toLowerCase().includes(searchLower) ||
        c.date.includes(searchTerm);

      if (!matchesSearch) return false;

      // Simple Filters
      if (simpleFilter === 'active' && c.status !== 'Active') return false;
      if (simpleFilter === 'honorary' && c.type !== 'Honorary') return false;

      // Advanced Filters
      if (advancedFilters.type !== '全部' && c.type !== advancedFilters.type) return false;
      if (advancedFilters.status !== '全部' && c.status !== advancedFilters.status) return false;
      
      if (advancedFilters.startDate) {
        if (new Date(c.date) < new Date(advancedFilters.startDate)) return false;
      }
      if (advancedFilters.endDate) {
        const end = new Date(advancedFilters.endDate);
        end.setDate(end.getDate() + 1);
        if (new Date(c.date) >= end) return false;
      }

      return true;
    });

    result.sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === 'date_asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortBy === 'type') return a.type.localeCompare(b.type);
      if (sortBy === 'username') return a.username.localeCompare(b.username);
      return 0;
    });

    return result;
  }, [certs, searchTerm, simpleFilter, advancedFilters, sortBy]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Honorary': return 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-900/30';
      case 'Outstanding': return 'text-primary-600 bg-primary-50 border-primary-200 dark:bg-primary-900/20 dark:border-primary-900/30';
      case 'Special': return 'text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-900/30';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'Honorary': return '荣誉证书';
      case 'Outstanding': return '优秀白帽';
      case 'Special': return '专项贡献';
      default: return type;
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

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Award className="w-6 h-6 text-primary-600" />
            证书管理
          </h2>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">为已审核通过的漏洞颁发荣誉证书</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-all shadow-lg shadow-primary-600/20 font-bold active:scale-95"
        >
          <Plus className="w-4 h-4" />
          颁发新证书
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex flex-wrap items-center gap-4">
          <div className="relative flex-grow min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder="搜索证书编号、用户名、标题或日期..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-500 transition-all dark:text-white outline-none"
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
              onClick={() => setSimpleFilter('active')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${simpleFilter === 'active' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              正常状态
            </button>
            <button 
              onClick={() => setSimpleFilter('honorary')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${simpleFilter === 'honorary' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              荣誉证书
            </button>
          </div>

          <button 
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl border transition-all ${showAdvanced ? 'bg-primary-50 border-primary-200 text-primary-600' : 'border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
          >
            <Filter className="w-4 h-4" />
            高级筛选
          </button>
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
                  <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">证书类型</label>
                  <select 
                    value={advancedFilters.type}
                    onChange={(e) => setAdvancedFilters({...advancedFilters, type: e.target.value})}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="全部">全部类型</option>
                    <option value="Honorary">荣誉证书</option>
                    <option value="Outstanding">优秀白帽</option>
                    <option value="Special">专项贡献</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">证书状态</label>
                  <select 
                    value={advancedFilters.status}
                    onChange={(e) => setAdvancedFilters({...advancedFilters, status: e.target.value})}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="全部">全部状态</option>
                    <option value="Active">正常</option>
                    <option value="Revoked">已撤销</option>
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
                    <option value="type">按类型</option>
                    <option value="username">按用户名</option>
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
                      onClick={() => setAdvancedFilters({ type: '全部', status: '全部', startDate: '', endDate: '' })}
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
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-950 text-gray-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                <th className="px-6 py-4">证书编号</th>
                <th className="px-6 py-4">白帽子</th>
                <th className="px-6 py-4">证书标题</th>
                <th className="px-6 py-4">类型</th>
                <th className="px-6 py-4">颁发日期</th>
                <th className="px-6 py-4">状态</th>
                <th className="px-6 py-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {filteredCerts.length > 0 ? filteredCerts.map((cert) => (
                <tr key={cert.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="px-6 py-4 text-xs font-mono text-gray-400">{cert.id}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 text-[10px] font-bold">
                        {cert.username[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{cert.username}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-800 dark:text-slate-200">{cert.title}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{cert.vulnId}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${getTypeColor(cert.type)}`}>
                      {getTypeText(cert.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500 dark:text-slate-400 font-medium">{cert.date}</td>
                  <td className="px-6 py-4">
                    <span className={`flex items-center gap-1.5 text-[10px] font-bold ${cert.status === 'Active' ? 'text-emerald-600' : 'text-red-600'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cert.status === 'Active' ? 'bg-emerald-600' : 'bg-red-600'}`}></span>
                      {cert.status === 'Active' ? '正常' : '已撤销'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handlePreviewCert(cert.id)}
                        className="px-2.5 py-1 text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all"
                        title="预览"
                      >
                        预览
                      </button>
                      <button
                        onClick={() => handleDownloadCert(cert.id)}
                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl transition-all"
                        title="下载"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setDeleteTarget(cert)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all" 
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-30">
                      <Award className="w-12 h-12" />
                      <p className="text-sm font-bold">暂无证书记录</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-gray-200 dark:border-slate-800"
            >
              <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-xl text-primary-600 dark:text-primary-400">
                    <Plus className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">颁发新证书</h3>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase ml-1">选择已审核漏洞</label>
                  <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto p-1">
                    {vulns.length > 0 ? vulns.map(v => (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVulnId(v.id)}
                        className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between group ${
                          selectedVulnId === v.id 
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                            : 'border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 hover:border-primary-200'
                        }`}
                      >
                        <div>
                          <p className={`text-sm font-bold ${selectedVulnId === v.id ? 'text-primary-700 dark:text-primary-400' : 'text-gray-900 dark:text-white'}`}>
                            {v.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-mono opacity-50">{v.id}</span>
                            <span className="text-[10px] font-bold opacity-70">提交者: {v.author}</span>
                          </div>
                        </div>
                        {selectedVulnId === v.id && <CheckCircle className="w-5 h-5 text-primary-600" />}
                      </button>
                    )) : (
                      <div className="p-8 text-center bg-gray-50 dark:bg-slate-950 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800">
                        <p className="text-sm text-gray-400">暂无符合条件的漏洞可颁发证书</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase ml-1">证书类型</label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['Honorary', 'Outstanding', 'Special'] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => setCertType(type)}
                        className={`py-3 rounded-xl border text-xs font-bold transition-all ${
                          certType === type 
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400' 
                            : 'border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 text-gray-500 hover:border-primary-200'
                        }`}
                      >
                        {getTypeText(type)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gray-50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-800 flex gap-3">
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 font-bold rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-100 transition-all"
                >
                  取消
                </button>
                <button 
                  onClick={() => setConfirmIssueOpen(true)}
                  disabled={isSubmitting || !selectedVulnId}
                  className="flex-1 py-3 bg-primary-600 text-white font-bold rounded-xl shadow-lg shadow-primary-600/20 hover:bg-primary-700 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? '颁发中...' : '确认颁发'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        open={!!deleteTarget}
        title="确认删除证书"
        description="删除/撤销后将影响证书记录，请确认是否继续。"
        highlightText={deleteTarget ? `${deleteTarget.id} · ${deleteTarget.title}` : ''}
        confirmText="确认删除"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await handleDeleteCert(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />

      <ConfirmModal
        open={confirmIssueOpen}
        title="确认颁发证书"
        description="颁发后将创建正式证书记录并可供下载。"
        highlightText={
          selectedVulnId
            ? `${selectedVulnId} · ${getTypeText(certType)}`
            : ''
        }
        confirmText={isSubmitting ? '颁发中...' : '确认颁发'}
        confirmDisabled={isSubmitting || !selectedVulnId}
        onCancel={() => setConfirmIssueOpen(false)}
        onConfirm={async () => {
          setConfirmIssueOpen(false);
          await handleIssueCert();
        }}
      />
    </div>
  );
}
