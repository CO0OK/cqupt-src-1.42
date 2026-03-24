import React, { useState, useEffect } from 'react';
import { Award, Search, Download, ExternalLink, Shield, User, History, Info, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User as UserType } from '../types';

interface Certificate {
  id: string;
  username: string;
  type: 'Honorary' | 'Outstanding' | 'Special';
  date: string;
  vulnId?: string;
  title: string;
  status: 'Active' | 'Revoked';
}

interface CertificateSearchProps {
  user: UserType;
}

export default function CertificateSearch({ user }: CertificateSearchProps) {
  const [activeTab, setActiveTab] = useState<'my' | 'search'>('my');
  const [myCerts, setMyCerts] = useState<Certificate[]>([]);
  const [searchId, setSearchId] = useState('');
  const [searchResult, setSearchResult] = useState<Certificate | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');

  const fetchMyCerts = async () => {
    try {
      const res = await fetch('/api/certificates');
      const data = await res.json();
      setMyCerts(data.filter((c: Certificate) => c.username === user.username));
    } catch (err) {
      console.error('Failed to fetch certificates:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'my') {
      fetchMyCerts();
    }
  }, [activeTab]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchId.trim()) return;
    
    setIsSearching(true);
    setError('');
    setSearchResult(null);
    
    try {
      const res = await fetch(`/api/certificates/search?id=${searchId.trim()}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResult(data);
      } else {
        setError('未找到该证书，请检查编号是否正确');
      }
    } catch (err) {
      setError('查询失败，请稍后再试');
    } finally {
      setIsSearching(false);
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

  const handleDownloadCert = (id: string) => {
    window.open(`/api/certificates/${encodeURIComponent(id)}/pdf`, '_blank');
  };

  const handlePreviewCert = (id: string) => {
    window.open(`/api/certificates/${encodeURIComponent(id)}/pdf?mode=preview`, '_blank');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Award className="w-6 h-6 text-primary-600" />
            证书查询
          </h2>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">查看我的荣誉证书或通过编号查询证书真伪</p>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-slate-900 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('my')}
          className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'my' 
              ? 'bg-white dark:bg-slate-800 text-primary-600 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-slate-300'
          }`}
        >
          <User className="w-4 h-4" /> 我的证书
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'search' 
              ? 'bg-white dark:bg-slate-800 text-primary-600 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-slate-300'
          }`}
        >
          <Search className="w-4 h-4" /> 证书查询
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'my' ? (
          <motion.div
            key="my-certs"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {myCerts.length > 0 ? myCerts.map((cert) => (
              <div key={cert.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Award className="w-24 h-24 text-primary-600" />
                </div>
                
                <div className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-gray-400">{cert.id}</span>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                      cert.type === 'Honorary' ? 'bg-amber-100 text-amber-700' :
                      cert.type === 'Outstanding' ? 'bg-primary-100 text-primary-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {getTypeText(cert.type)}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                    {cert.title}
                  </h3>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                    <Shield className="w-3.5 h-3.5" />
                    <span>关联漏洞: {cert.vulnId}</span>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-50 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-gray-400">{cert.date} 颁发</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePreviewCert(cert.id)}
                        className="px-2.5 py-1 text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all"
                        title="预览证书"
                      >
                        预览
                      </button>
                      <button
                        onClick={() => handleDownloadCert(cert.id)}
                        className="p-2 bg-gray-50 dark:bg-slate-800 text-primary-600 rounded-xl hover:bg-primary-50 transition-all"
                        title="下载证书"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-gray-200 dark:border-slate-800">
                <Award className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-slate-400 font-bold">您还没有获得任何证书</p>
                <p className="text-xs text-gray-400 mt-1">积极提交漏洞，为校园安全贡献力量吧！</p>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="search-certs"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-2xl mx-auto space-y-8"
          >
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm">
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase ml-1">输入证书编号</label>
                  <div className="flex gap-3">
                    <div className="relative flex-grow">
                      <Award className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input 
                        type="text" 
                        placeholder="例如: CQUPT-7F3K9Q2M8T4R"
                        value={searchId}
                        onChange={(e) => setSearchId(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary-500 outline-none dark:text-white"
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={isSearching}
                      className="px-8 bg-primary-600 text-white font-bold rounded-2xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-600/20 active:scale-95 disabled:opacity-50"
                    >
                      {isSearching ? '查询中...' : '查询'}
                    </button>
                  </div>
                </div>
              </form>

              {error && (
                <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm">
                  <Info className="w-5 h-5" />
                  {error}
                </div>
              )}
            </div>

            {searchResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-slate-900 p-8 rounded-3xl border-2 border-primary-100 dark:border-primary-900/30 shadow-xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <Award className="w-48 h-48 text-primary-600" />
                </div>
                
                <div className="space-y-8 relative z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-primary-600 text-white rounded-2xl">
                        <Award className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">证书查询结果</h3>
                        <p className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> 该证书真实有效
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-mono text-gray-400">{searchResult.id}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">获得者</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{searchResult.username}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">颁发日期</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{searchResult.date}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">证书类型</p>
                      <p className="text-lg font-bold text-primary-600">{getTypeText(searchResult.type)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">关联项目</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{searchResult.title}</p>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-gray-100 dark:border-slate-800 flex justify-center">
                    <div className="text-center">
                      <p className="text-[10px] text-gray-400 mb-2">CQUPT-SRC 校园漏洞响应与产教融合平台</p>
                      <button
                        onClick={() => handlePreviewCert(searchResult.id)}
                        className="mb-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        预览证书 PDF
                      </button>
                      <button
                        onClick={() => handleDownloadCert(searchResult.id)}
                        className="mb-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white text-xs font-bold hover:bg-primary-700 transition-all"
                      >
                        <Download className="w-3.5 h-3.5" />
                        下载证书 PDF
                      </button>
                      <div className="w-24 h-24 bg-gray-100 dark:bg-slate-800 rounded-xl mx-auto flex items-center justify-center">
                        <span className="text-[10px] text-gray-400">QR Code</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
