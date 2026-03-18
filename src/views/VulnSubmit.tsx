import React, { useState } from 'react';
import { User } from '../types';
import { Send, Globe, Shield, AlertTriangle, FileText, Upload, CheckCircle } from 'lucide-react';
import { VULN_TYPES, VULN_LEVELS } from '../constants';

export default function VulnSubmit({ user }: { user: User }) {
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    type: VULN_TYPES[0],
    level: VULN_LEVELS[2],
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.hasSignedAgreement) {
      alert('请先签署网络安全责任承诺书');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/vulnerabilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, author: user.username }),
      });
      const data = await response.json();
      if (data.success) {
        setSuccess(true);
        setFormData({ title: '', url: '', type: VULN_TYPES[0], level: VULN_LEVELS[2], description: '' });
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">提交新漏洞</h2>
        <p className="text-gray-500 dark:text-slate-400 mt-2">请详细填写漏洞信息，以便我们的审核团队快速评估</p>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-3 border border-emerald-100 dark:border-emerald-900/50">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">漏洞提交成功！请耐心等待审核。</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xl p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700 dark:text-slate-300 ml-0.5">漏洞标题</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary-600 transition-colors">
                <Shield className="w-5 h-5" />
              </div>
              <input 
                type="text" 
                required 
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="简明扼要描述漏洞" 
                className="w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700 dark:text-slate-300 ml-0.5">影响地址 (URL)</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary-600 transition-colors">
                <Globe className="w-5 h-5" />
              </div>
              <input 
                type="text" 
                required 
                value={formData.url}
                onChange={(e) => setFormData({...formData, url: e.target.value})}
                placeholder="example.cqupt.edu.cn" 
                className="w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700 dark:text-slate-300 ml-0.5">漏洞类型</label>
            <select 
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white text-sm"
            >
              {VULN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700 dark:text-slate-300 ml-0.5">危险等级</label>
            <select 
              value={formData.level}
              onChange={(e) => setFormData({...formData, level: e.target.value as any})}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white text-sm"
            >
              {VULN_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-bold text-gray-700 dark:text-slate-300 ml-0.5">漏洞描述</label>
          <div className="relative group">
            <div className="absolute top-3 left-3.5 text-gray-400 group-focus-within:text-primary-600 transition-colors">
              <FileText className="w-5 h-5" />
            </div>
            <textarea 
              required 
              rows={5}
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="请详细描述漏洞复现步骤及危害..." 
              className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white text-sm resize-none"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-bold text-gray-700 dark:text-slate-300 ml-0.5">附件上传</label>
          <div className="border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center text-gray-400 hover:border-primary-500 hover:text-primary-500 transition-all cursor-pointer bg-gray-50 dark:bg-slate-950">
            <Upload className="w-10 h-10 mb-2" />
            <p className="text-sm font-medium">点击或拖拽文件到此处上传</p>
            <p className="text-xs mt-1">支持 ZIP, PDF, PNG, JPG (最大 10MB)</p>
          </div>
        </div>

        <div className="pt-4">
          <button 
            type="submit" 
            disabled={isSubmitting || !user.hasSignedAgreement}
            className={`w-full py-4 font-bold rounded-xl shadow-lg transition-all duration-300 flex items-center justify-center gap-2 ${
              isSubmitting || !user.hasSignedAgreement
                ? 'bg-gray-200 dark:bg-slate-800 text-gray-400 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700 text-white shadow-primary-600/20 hover:shadow-primary-600/40 active:scale-[0.98]'
            }`}
          >
            <Send className="w-5 h-5" /> {isSubmitting ? '提交中...' : '确认提交漏洞'}
          </button>
          {!user.hasSignedAgreement && (
            <p className="text-center text-xs text-rose-500 mt-3 font-medium">您尚未签署责任承诺书，暂无法提交漏洞</p>
          )}
        </div>
      </form>
    </div>
  );
}
