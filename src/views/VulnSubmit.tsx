import React, { useState } from 'react';
import { User } from '../types';
import { Send, Globe, Shield, AlertTriangle, FileText, Upload, CheckCircle } from 'lucide-react';
import { VULN_TYPES, VULN_LEVELS } from '../constants';
import { getApiErrorMessage } from '../utils/apiError';

export default function VulnSubmit({ user }: { user: User }) {
  type SubmitField = 'title' | 'url' | 'type' | 'level' | 'description' | 'attachment' | 'body';
  type ValidationIssue = { field?: string; reason?: string };
  const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/png',
    'image/jpeg',
  ]);
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    type: VULN_TYPES[0],
    level: VULN_LEVELS[2],
    description: '',
  });
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentType, setAttachmentType] = useState('');
  const [attachmentData, setAttachmentData] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<SubmitField, string>>>({});
  const [submitError, setSubmitError] = useState('');

  const reasonLabelMap: Record<string, string> = {
    required: '必填',
    'length must be <= 255': '长度不能超过 255',
    'length must be <= 50': '长度不能超过 50',
    'length must be <= 5000': '长度不能超过 5000',
    'must be valid url or domain': '请输入有效的 URL 或域名',
    'must be 严重|高危|中危|低危|信息': '危险等级不合法',
    'filename length must be <= 255': '文件名长度不能超过 255',
    'unsupported attachment type': '附件格式不支持（仅支持 PDF/DOC/DOCX/TXT/PNG/JPG）',
    'invalid attachment content': '附件内容无效，请重新上传',
    'attachment size must be <= 8MB': '附件大小不能超过 8MB',
    'attachment mime/signature mismatch': '附件类型与文件内容不一致',
    'malicious content detected': '检测到疑似恶意代码，已拒绝上传',
  };

  const fieldLabelMap: Record<SubmitField, string> = {
    title: '漏洞标题',
    url: '影响地址',
    type: '漏洞类型',
    level: '危险等级',
    description: '漏洞描述',
    attachment: '附件',
    body: '表单',
  };

  const mapFieldErrors = (payload: unknown): Partial<Record<SubmitField, string>> => {
    const details = Array.isArray((payload as { details?: unknown })?.details)
      ? ((payload as { details: unknown[] }).details as ValidationIssue[])
      : [];
    const mapped: Partial<Record<SubmitField, string>> = {};

    details.forEach((item) => {
      const rawField = typeof item.field === 'string' ? item.field : 'body';
      const field = (['title', 'url', 'type', 'level', 'description', 'attachment', 'body'].includes(rawField)
        ? rawField
        : 'body') as SubmitField;
      const reason = typeof item.reason === 'string' ? item.reason : '参数不合法';
      const label = reasonLabelMap[reason] || reason;
      if (!mapped[field]) {
        mapped[field] = label === '必填' ? `${fieldLabelMap[field]}为必填项` : `${fieldLabelMap[field]}：${label}`;
      }
    });

    return mapped;
  };

  const clearFieldError = (field: SubmitField) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleAttachmentChange = async (file: File | undefined) => {
    if (!file) return;
    clearFieldError('attachment');
    setSubmitError('');

    if (!ALLOWED_ATTACHMENT_MIME_TYPES.has(file.type)) {
      setFieldErrors((prev) => ({ ...prev, attachment: '附件：格式不支持（仅支持 PDF/DOC/DOCX/TXT/PNG/JPG）' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const data = typeof reader.result === 'string' ? reader.result : '';
      setAttachmentName(file.name);
      setAttachmentType(file.type);
      setAttachmentData(data);
    };
    reader.onerror = () => {
      setFieldErrors((prev) => ({ ...prev, attachment: '附件：读取失败，请重新上传' }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.hasSignedAgreement) {
      setSubmitError('请先签署网络安全责任承诺书');
      return;
    }
    setFieldErrors({});
    setSubmitError('');
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/vulnerabilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          attachmentName,
          attachmentType,
          attachmentData,
          author: user.username,
        }),
      });
      let data: unknown = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }
      const apiData = data as { success?: boolean };

      if (response.ok && apiData.success) {
        setSuccess(true);
        setFormData({ title: '', url: '', type: VULN_TYPES[0], level: VULN_LEVELS[2], description: '' });
        setAttachmentName('');
        setAttachmentType('');
        setAttachmentData('');
        setFieldErrors({});
        setSubmitError('');
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const mapped = mapFieldErrors(data);
        if (Object.keys(mapped).length > 0) {
          setFieldErrors(mapped);
        } else {
          setSubmitError(getApiErrorMessage(data, '漏洞提交失败，请稍后重试', response.status));
        }
      }
    } catch (err) {
      console.error(err);
      setSubmitError('网络异常，漏洞提交失败');
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
                onChange={(e) => {
                  clearFieldError('title');
                  setSubmitError('');
                  setFormData({...formData, title: e.target.value});
                }}
                placeholder="简明扼要描述漏洞" 
                className={`w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white text-sm ${fieldErrors.title ? 'border-red-300 dark:border-red-600' : 'border-gray-200 dark:border-slate-700'}`}
              />
            </div>
            {fieldErrors.title ? <p className="mt-1 text-xs text-red-600">{fieldErrors.title}</p> : null}
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
                onChange={(e) => {
                  clearFieldError('url');
                  setSubmitError('');
                  setFormData({...formData, url: e.target.value});
                }}
                placeholder="example.cqupt.edu.cn" 
                className={`w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white text-sm ${fieldErrors.url ? 'border-red-300 dark:border-red-600' : 'border-gray-200 dark:border-slate-700'}`}
              />
            </div>
            {fieldErrors.url ? <p className="mt-1 text-xs text-red-600">{fieldErrors.url}</p> : null}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700 dark:text-slate-300 ml-0.5">漏洞类型</label>
            <select 
              value={formData.type}
              onChange={(e) => {
                clearFieldError('type');
                setSubmitError('');
                setFormData({...formData, type: e.target.value});
              }}
              className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white text-sm ${fieldErrors.type ? 'border-red-300 dark:border-red-600' : 'border-gray-200 dark:border-slate-700'}`}
            >
              {VULN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {fieldErrors.type ? <p className="mt-1 text-xs text-red-600">{fieldErrors.type}</p> : null}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700 dark:text-slate-300 ml-0.5">危险等级</label>
            <select 
              value={formData.level}
              onChange={(e) => {
                clearFieldError('level');
                setSubmitError('');
                setFormData({...formData, level: e.target.value as any});
              }}
              className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white text-sm ${fieldErrors.level ? 'border-red-300 dark:border-red-600' : 'border-gray-200 dark:border-slate-700'}`}
            >
              {VULN_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            {fieldErrors.level ? <p className="mt-1 text-xs text-red-600">{fieldErrors.level}</p> : null}
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
              onChange={(e) => {
                clearFieldError('description');
                setSubmitError('');
                setFormData({...formData, description: e.target.value});
              }}
              placeholder="请详细描述漏洞复现步骤及危害..." 
              className={`w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-slate-800 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white text-sm resize-none ${fieldErrors.description ? 'border-red-300 dark:border-red-600' : 'border-gray-200 dark:border-slate-700'}`}
            />
          </div>
          {fieldErrors.description ? <p className="mt-1 text-xs text-red-600">{fieldErrors.description}</p> : null}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-bold text-gray-700 dark:text-slate-300 ml-0.5">附件上传</label>
          <label className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-gray-400 hover:border-primary-500 hover:text-primary-500 transition-all cursor-pointer bg-gray-50 dark:bg-slate-950 ${fieldErrors.attachment ? 'border-red-300 dark:border-red-600 text-red-500' : 'border-gray-200 dark:border-slate-800'}`}>
            <Upload className="w-10 h-10 mb-2" />
            <p className="text-sm font-medium">点击上传附件（必传）</p>
            <p className="text-xs mt-1">支持 PDF, DOC, DOCX, TXT, PNG, JPG（最大 8MB）</p>
            {attachmentName ? (
              <p className="mt-2 text-xs font-bold text-primary-600 dark:text-primary-400">{attachmentName}</p>
            ) : null}
            <input
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
              onChange={(e) => {
                const file = e.target.files?.[0];
                void handleAttachmentChange(file);
              }}
            />
          </label>
          {fieldErrors.attachment ? (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.attachment}</p>
          ) : null}
          {!attachmentName ? (
            <p className="text-xs text-amber-600">请上传附件后再提交。</p>
          ) : null}
        </div>

        <div className="pt-4">
          {fieldErrors.body ? <p className="text-xs text-red-600 mb-2">{fieldErrors.body}</p> : null}
          {submitError ? <p className="text-xs text-red-600 mb-2">{submitError}</p> : null}
          <button
            type="submit"
            disabled={isSubmitting || !user.hasSignedAgreement || !attachmentName || !attachmentType || !attachmentData}
            className={`w-full py-4 font-bold rounded-xl shadow-lg transition-all duration-300 flex items-center justify-center gap-2 ${
              isSubmitting || !user.hasSignedAgreement || !attachmentName || !attachmentType || !attachmentData
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
