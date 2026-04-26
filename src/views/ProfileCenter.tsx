import React, { useMemo, useState, useEffect } from 'react';
import { User } from '../types';
import { UserCircle2, Save, Upload, KeyRound, X, TrendingUp, TrendingDown, Coins, ShieldAlert, Mail, RefreshCw } from 'lucide-react';
import { getApiErrorMessage } from '../utils/apiError';
import { AnimatePresence, motion } from 'motion/react';
import { PASSWORD_POLICY_HINT, validatePasswordPolicyText } from '../utils/passwordPolicy';
import PasswordStrengthBar from '../components/PasswordStrengthBar';

interface PointLog {
  id: string;
  changeType: string;
  delta: number;
  balanceAfter: number;
  note: string;
  referenceType: string;
  createdAt: string;
}

interface ProfileCenterProps {
  user: User;
  onUpdateUser: (user: User) => void;
}

export default function ProfileCenter({ user, onUpdateUser }: ProfileCenterProps) {
  type Notice = { type: 'success' | 'error'; message: string } | null;
  const [username, setUsername] = useState(user.username);
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSendingPasswordCode, setIsSendingPasswordCode] = useState(false);
  const [passwordCodeCountdown, setPasswordCodeCountdown] = useState(0);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
    emailCode: '',
  });
  const [modalNotice, setModalNotice] = useState<Notice>(null);

  // 积分明细
  const [pointLogs, setPointLogs] = useState<PointLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [showPointLogs, setShowPointLogs] = useState(false);

  // 换绑邮箱弹框
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailModalNotice, setEmailModalNotice] = useState<Notice>(null);
  const [oldEmailCode, setOldEmailCode] = useState('');
  const [newEmailInput, setNewEmailInput] = useState('');
  const [isSendingOldEmailCode, setIsSendingOldEmailCode] = useState(false);
  const [oldEmailCodeCountdown, setOldEmailCodeCountdown] = useState(0);
  const [isChangingEmail, setIsChangingEmail] = useState(false);

  const isDirty = username !== user.username || (avatar !== '' && avatar !== (user.avatar || ''));

  const avatarPreview = useMemo(
    () => avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(username || user.username)}&background=random`,
    [avatar, username, user.username],
  );

  React.useEffect(() => {
    if (passwordCodeCountdown <= 0) return;
    const timer = window.setInterval(() => {
      setPasswordCodeCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [passwordCodeCountdown]);

  useEffect(() => {
    if (oldEmailCodeCountdown <= 0) return;
    const timer = window.setInterval(() => {
      setOldEmailCodeCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [oldEmailCodeCountdown]);

  const fetchPointLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch('/api/users/me/point-logs?limit=30');
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) setPointLogs(data.logs as PointLog[]);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleTogglePointLogs = () => {
    if (pointLogs.length === 0) fetchPointLogs();
    setShowPointLogs(true);
  };

  const handleSendOldEmailCode = async () => {
    setIsSendingOldEmailCode(true);
    setEmailModalNotice(null);
    try {
      const res = await fetch('/api/auth/email-code/change-email/send', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        setEmailModalNotice({ type: 'error', message: getApiErrorMessage(data, '验证码发送失败', res.status) });
        return;
      }
      setOldEmailCodeCountdown(typeof data.cooldownInSec === 'number' ? data.cooldownInSec : 60);
      setEmailModalNotice({ type: 'success', message: typeof data.devCode === 'string' ? `开发环境验证码：${data.devCode}` : `验证码已发送到 ${user.email}` });
    } catch {
      setEmailModalNotice({ type: 'error', message: '网络异常，验证码发送失败' });
    } finally {
      setIsSendingOldEmailCode(false);
    }
  };

  const handleChangeEmail = async () => {
    const newEmail = newEmailInput.trim();
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      setEmailModalNotice({ type: 'error', message: '请输入正确的新邮箱地址' });
      return;
    }
    if (newEmail === user.email) {
      setEmailModalNotice({ type: 'error', message: '新邮箱与当前邮箱相同' });
      return;
    }
    if (!oldEmailCode.trim()) {
      setEmailModalNotice({ type: 'error', message: '请先获取并填写旧邮箱验证码' });
      return;
    }
    setIsChangingEmail(true);
    setEmailModalNotice(null);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, emailCode: oldEmailCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        setEmailModalNotice({ type: 'error', message: getApiErrorMessage(data, '邮箱修改失败', res.status) });
        return;
      }
      onUpdateUser(data.user as User);
      setShowEmailModal(false);
      setOldEmailCode('');
      setNewEmailInput('');
      setEmailModalNotice(null);
      setNotice({ type: 'success', message: '邮箱已成功修改' });
    } catch {
      setEmailModalNotice({ type: 'error', message: '网络异常，邮箱修改失败' });
    } finally {
      setIsChangingEmail(false);
    }
  };

  const handleAvatarPick = (file: File | undefined) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setNotice({ type: 'error', message: '头像仅支持 PNG/JPG 格式' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setNotice({ type: 'error', message: '头像大小不能超过 2MB' });
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const size = Math.min(img.width, img.height);
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, 256, 256);
      URL.revokeObjectURL(objectUrl);
      setAvatar(canvas.toDataURL('image/jpeg', 0.85));
      setNotice(null);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setNotice({ type: 'error', message: '头像读取失败，请重试' });
    };
    img.src = objectUrl;
  };

  const handleSave = async () => {
    setIsSaving(true);
    setNotice(null);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          ...(avatar ? { avatar } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        setNotice({ type: 'error', message: getApiErrorMessage(data, '个人资料保存失败', res.status) });
        return;
      }

      onUpdateUser(data.user as User);
      setNotice({ type: 'success', message: '个人资料已更新' });
    } catch {
      setNotice({ type: 'error', message: '网络异常，保存失败' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendPasswordCode = async () => {
    setModalNotice(null);
    setIsSendingPasswordCode(true);
    try {
      const res = await fetch('/api/auth/email-code/password/send', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        setModalNotice({ type: 'error', message: getApiErrorMessage(data, '验证码发送失败', res.status) });
        return;
      }
      setPasswordCodeCountdown(typeof data.cooldownInSec === 'number' ? data.cooldownInSec : 60);
      if (typeof data.devCode === 'string') {
        setModalNotice({ type: 'success', message: `开发环境验证码：${data.devCode}` });
      } else {
        setModalNotice({ type: 'success', message: '验证码已发送，请前往邮箱查看' });
      }
    } catch {
      setModalNotice({ type: 'error', message: '网络异常，验证码发送失败' });
    } finally {
      setIsSendingPasswordCode(false);
    }
  };

  const handleChangePassword = async () => {
    const passwordIssue = validatePasswordPolicyText(passwordForm.newPassword);
    if (passwordIssue) {
      setModalNotice({ type: 'error', message: passwordIssue });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setModalNotice({ type: 'error', message: '两次输入的新密码不一致' });
      return;
    }
    setIsChangingPassword(true);
    setModalNotice(null);
    try {
      const res = await fetch('/api/users/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: passwordForm.newPassword, confirmPassword: passwordForm.confirmPassword, emailCode: passwordForm.emailCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        setModalNotice({ type: 'error', message: getApiErrorMessage(data, '密码修改失败', res.status) });
        return;
      }

      setPasswordForm({ newPassword: '', confirmPassword: '', emailCode: '' });
      setShowPasswordModal(false);
      setModalNotice(null);
      setNotice({ type: 'success', message: '密码修改成功，请使用新密码登录' });
    } catch {
      setModalNotice({ type: 'error', message: '网络异常，密码修改失败' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-fade-in">

      {/* 页头 */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">个人中心</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">管理你的账号信息与安全设置</p>
      </div>

      {/* 封禁提示 */}
      {user.status === 'Banned' && (
        <div className="rounded-xl border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700 px-4 py-3 flex items-center gap-3 text-red-700 dark:text-red-400">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">账号已被封禁，部分功能受限。如有疑问请联系管理员。</span>
        </div>
      )}

      {/* 全局通知 */}
      {notice && (
        <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${notice.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-300' : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-400'}`}>
          {notice.message}
        </div>
      )}

      {/* 主体：左侧名片 + 右侧表单 */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5 items-stretch">

        {/* ── 左侧名片 ── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          {/* 头部渐变 */}
          <div className="h-20 bg-gradient-to-r from-primary-500 to-violet-500 opacity-80" />
          <div className="px-5 pb-5 -mt-10 flex flex-col items-center text-center flex-1">
            {/* 头像 */}
            <div className="relative group">
              <img
                src={avatarPreview}
                alt="avatar"
                className="w-20 h-20 rounded-full object-cover border-4 border-white dark:border-slate-900 shadow-md"
              />
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Upload className="w-5 h-5 text-white" />
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg"
                  title="选择头像"
                  className="hidden"
                  onChange={(e) => handleAvatarPick(e.target.files?.[0])}
                />
              </label>
            </div>
            <p className="text-xs text-gray-400 mt-1.5 mb-3">点击头像更换</p>

            {/* 用户名 + 角色 */}
            <p className="text-base font-bold text-gray-900 dark:text-white">{username}</p>
            <span className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              user.role === 'admin' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              : user.role === 'auditor' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
            }`}>
              {user.role === 'admin' ? '管理员' : user.role === 'auditor' ? '审核员' : '普通用户'}
            </span>

            {/* 分割线 */}
            <div className="w-full border-t border-gray-100 dark:border-slate-800 my-4" />

            {/* 信息列表 */}
            <div className="w-full space-y-3 text-left">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 dark:text-slate-500">统一认证码</span>
                <span className="text-xs font-mono font-semibold text-gray-700 dark:text-slate-300">{user.authCode}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 dark:text-slate-500">注册时间</span>
                <span className="text-xs font-semibold text-gray-700 dark:text-slate-300">{user.registrationDate}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 dark:text-slate-500">账号状态</span>
                <span className={`text-xs font-semibold ${user.status === 'Banned' ? 'text-red-500' : 'text-emerald-600'}`}>
                  {user.status === 'Banned' ? '已封禁' : '正常'}
                </span>
              </div>
            </div>

            {/* 分割线 */}
            <div className="w-full border-t border-gray-100 dark:border-slate-800 my-4" />

            {/* 积分 */}
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Coins className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <span className="text-xs text-gray-500 dark:text-slate-400">当前积分</span>
              </div>
              <span className="text-lg font-bold text-amber-600">{user.points.toLocaleString()}</span>
            </div>

            {/* 积分明细按鈕 */}
            <button
              onClick={handleTogglePointLogs}
              className="mt-3 w-full py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-semibold text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              查看积分明细
            </button>
          </div>
        </div>

        {/* ── 右侧表单区 ── */}
        <div className="h-full">

          {/* 编辑资料卡 */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm h-full flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
              <h3 className="font-bold text-gray-900 dark:text-white">基本信息</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">修改后需点击“保存”生效</p>
            </div>
            <div className="p-6 space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase ml-0.5">用户名</label>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="请输入用户名"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase ml-0.5">邮箱</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={user.email}
                      disabled
                      title="当前邮箱"
                      readOnly
                      className="w-full pl-4 pr-20 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 cursor-not-allowed text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => { setOldEmailCode(''); setNewEmailInput(''); setEmailModalNotice(null); setShowEmailModal(true); }}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg text-xs font-bold text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors whitespace-nowrap flex items-center gap-1"
                    >
                      <Mail className="w-3 h-3" />
                      修改
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase ml-0.5">统一认证码</label>
                  <input
                    value={user.authCode}
                    disabled
                    title="统一认证码"
                    readOnly
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 cursor-not-allowed text-sm font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase ml-0.5">角色</label>
                  <input
                    value={user.role === 'admin' ? '管理员' : user.role === 'auditor' ? '审核员' : '普通用户'}
                    disabled
                    title="账号角色"
                    readOnly
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 cursor-not-allowed text-sm"
                  />
                </div>
              </div>


            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  setPasswordForm({ newPassword: '', confirmPassword: '', emailCode: '' });
                  setModalNotice(null);
                  setShowPasswordModal(true);
                }}
                className="px-5 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-bold hover:bg-amber-700 transition-all shadow shadow-amber-600/20 inline-flex items-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                修改密码
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !isDirty}
                className="px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-700 transition-all shadow shadow-primary-600/20 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {isSaving ? <UserCircle2 className="w-4 h-4 animate-pulse" /> : <Save className="w-4 h-4" />}
                {isSaving ? '保存中...' : isDirty ? '保存资料' : '无变更'}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* 积分明细弹框 */}
      <AnimatePresence>
        {showPointLogs ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
                <div>
                  <h4 className="text-base font-bold text-gray-900 dark:text-white">积分变动记录</h4>
                  <p className="text-xs text-gray-400 mt-0.5">最近 30 条</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => fetchPointLogs()} title="刷新" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                    <RefreshCw className={`w-4 h-4 text-gray-400 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                  </button>
                  <button onClick={() => setShowPointLogs(false)} title="关闭" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto flex-1">
                {isLoadingLogs ? (
                  <p className="text-center text-sm text-gray-400 py-12">加载中...</p>
                ) : pointLogs.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-12">暂无积分记录</p>
                ) : (
                  <div className="divide-y divide-gray-50 dark:divide-slate-800">
                    {pointLogs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${log.delta >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                            {log.delta >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-600" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800 dark:text-white">{log.note || log.referenceType || log.changeType}</p>
                            <p className="text-xs text-gray-400">{new Date(log.createdAt).toLocaleString('zh-CN')}</p>
                          </div>
                        </div>
                        <div className="text-right ml-4 flex-shrink-0">
                          <p className={`text-sm font-bold ${log.delta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{log.delta >= 0 ? '+' : ''}{log.delta}</p>
                          <p className="text-xs text-gray-400">余额 {log.balanceAfter}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="px-5 py-4 bg-gray-50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-800 flex-shrink-0">
                <button
                  onClick={() => setShowPointLogs(false)}
                  className="w-full py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 text-sm font-bold hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"
                >
                  关闭
                </button>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      {/* 换绑邮箱弹框 */}
      <AnimatePresence>
        {showEmailModal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-gray-900 dark:text-white">修改邮箱</h4>
                  <p className="text-xs text-gray-400 mt-0.5">先验证旧邮箱身份，再绑定新邮箱</p>
                </div>
                <button
                  onClick={() => setShowEmailModal(false)}
                  title="关闭"
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {emailModalNotice && (
                  <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${emailModalNotice.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-300' : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-400'}`}>
                    {emailModalNotice.message}
                  </div>
                )}

                {/* Step 1: 旧邮箱验证 */}
                <div className="rounded-xl bg-gray-50 dark:bg-slate-800/50 px-4 py-3 space-y-3">
                  <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">第一步 · 验证当前邮箱身份</p>
                  <div className="px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-gray-500 dark:text-slate-400 truncate">
                    {user.email}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="输入旧邮箱收到的6位验证码"
                      value={oldEmailCode}
                      onChange={(e) => setOldEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full pl-4 pr-28 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleSendOldEmailCode}
                      disabled={isSendingOldEmailCode || oldEmailCodeCountdown > 0}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap"
                    >
                      {oldEmailCodeCountdown > 0 ? `${oldEmailCodeCountdown}s` : isSendingOldEmailCode ? '发送中...' : '发送验证码'}
                    </button>
                  </div>
                </div>

                {/* Step 2: 新邮箱 */}
                <div className="rounded-xl bg-gray-50 dark:bg-slate-800/50 px-4 py-3 space-y-2">
                  <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">第二步 · 填写新邮箱</p>
                  <input
                    type="email"
                    placeholder="请输入新邮箱地址"
                    value={newEmailInput}
                    onChange={(e) => setNewEmailInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  />
                </div>
              </div>

              <div className="px-5 py-4 bg-gray-50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-800 flex gap-3">
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 text-sm font-bold hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"
                >
                  取消
                </button>
                <button
                  onClick={handleChangeEmail}
                  disabled={isChangingEmail}
                  className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-700 transition-all shadow shadow-primary-600/20 disabled:opacity-50"
                >
                  {isChangingEmail ? '修改中...' : '确认修改'}
                </button>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      {/* 修改密码弹框 */}
      <AnimatePresence>
        {showPasswordModal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-gray-900 dark:text-white">修改密码</h4>
                  <p className="text-xs text-gray-400 mt-0.5">验证码将发送至当前绑定邮箱</p>
                </div>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  title="关闭"
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {modalNotice && (
                  <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${modalNotice.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-300' : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-400'}`}>
                    {modalNotice.message}
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase ml-0.5">邮箱验证码</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={passwordForm.emailCode}
                      onChange={(e) => setPasswordForm((prev) => ({ ...prev, emailCode: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                      placeholder="请输入6位验证码"
                      className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleSendPasswordCode}
                      disabled={isSendingPasswordCode || passwordCodeCountdown > 0}
                      className="px-4 py-2.5 rounded-xl text-sm font-bold bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {passwordCodeCountdown > 0 ? `${passwordCodeCountdown}s` : isSendingPasswordCode ? '发送中...' : '发送验证码'}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase ml-0.5">新密码</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="请输入新密码"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  />
                  <PasswordStrengthBar password={passwordForm.newPassword} />
                  {!passwordForm.newPassword && <p className="text-xs text-gray-400 ml-0.5">{PASSWORD_POLICY_HINT}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase ml-0.5">确认新密码</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="请再次输入新密码"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  />
                  {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                    <p className="text-xs text-red-500 ml-0.5">两次输入的密码不一致</p>
                  )}
                </div>
              </div>

              <div className="px-5 py-4 bg-gray-50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-800 flex gap-3">
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 text-sm font-bold hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"
                >
                  取消
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={isChangingPassword}
                  className="flex-1 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-bold hover:bg-amber-700 transition-all shadow shadow-amber-600/20 disabled:opacity-50"
                >
                  {isChangingPassword ? '修改中...' : '确认修改'}
                </button>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
