import React, { useMemo, useState } from 'react';
import { User } from '../types';
import { UserCircle2, Save, Upload, KeyRound, X } from 'lucide-react';
import { getApiErrorMessage } from '../utils/apiError';
import { AnimatePresence, motion } from 'motion/react';
import { PASSWORD_POLICY_HINT, validatePasswordPolicyText } from '../utils/passwordPolicy';

interface ProfileCenterProps {
  user: User;
  onUpdateUser: (user: User) => void;
}

export default function ProfileCenter({ user, onUpdateUser }: ProfileCenterProps) {
  type Notice = { type: 'success' | 'error'; message: string } | null;
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email);
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSendingPasswordCode, setIsSendingPasswordCode] = useState(false);
  const [passwordCodeCountdown, setPasswordCodeCountdown] = useState(0);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    emailCode: '',
  });

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

    const reader = new FileReader();
    reader.onload = () => {
      const data = typeof reader.result === 'string' ? reader.result : '';
      setAvatar(data);
      setNotice(null);
    };
    reader.onerror = () => {
      setNotice({ type: 'error', message: '头像读取失败，请重试' });
    };
    reader.readAsDataURL(file);
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
          email,
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
    setNotice(null);
    setIsSendingPasswordCode(true);
    try {
      const res = await fetch('/api/auth/email-code/password/send', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        setNotice({ type: 'error', message: getApiErrorMessage(data, '验证码发送失败', res.status) });
        return;
      }
      setPasswordCodeCountdown(typeof data.cooldownInSec === 'number' ? data.cooldownInSec : 60);
      if (typeof data.devCode === 'string') {
        setNotice({ type: 'success', message: `开发环境验证码：${data.devCode}` });
      } else {
        setNotice({ type: 'success', message: '验证码已发送，请前往邮箱查看' });
      }
    } catch {
      setNotice({ type: 'error', message: '网络异常，验证码发送失败' });
    } finally {
      setIsSendingPasswordCode(false);
    }
  };

  const handleChangePassword = async () => {
    const passwordIssue = validatePasswordPolicyText(passwordForm.newPassword);
    if (passwordIssue) {
      setNotice({ type: 'error', message: passwordIssue });
      return;
    }
    setIsChangingPassword(true);
    setNotice(null);
    try {
      const res = await fetch('/api/users/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        setNotice({ type: 'error', message: getApiErrorMessage(data, '密码修改失败', res.status) });
        return;
      }

      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '', emailCode: '' });
      setShowPasswordModal(false);
      setNotice({ type: 'success', message: '密码修改成功，请使用新密码登录' });
    } catch {
      setNotice({ type: 'error', message: '网络异常，密码修改失败' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">个人中心</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">管理个人资料与头像</p>
      </div>

      {notice ? (
        <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${notice.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {notice.message}
        </div>
      ) : null}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
        <div className="flex items-center gap-5">
          <img src={avatarPreview} alt="avatar" className="w-24 h-24 rounded-full object-cover border-4 border-gray-100 dark:border-slate-800" />
          <div className="space-y-2">
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-bold cursor-pointer hover:bg-primary-700 transition-all">
              <Upload className="w-4 h-4" />
              上传头像
              <input
                type="file"
                accept=".png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => handleAvatarPick(e.target.files?.[0])}
              />
            </label>
            <p className="text-xs text-gray-500 dark:text-slate-400">支持 PNG/JPG，大小不超过 2MB</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">用户名</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">认证码</label>
            <input
              value={user.authCode}
              disabled
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-100 dark:bg-slate-900 text-gray-500 cursor-not-allowed"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">角色</label>
            <input
              value={user.role}
              disabled
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-100 dark:bg-slate-900 text-gray-500 cursor-not-allowed"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={() => {
              setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '', emailCode: '' });
              setShowPasswordModal(true);
            }}
            className="px-6 py-2.5 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-all shadow-lg shadow-amber-600/20 inline-flex items-center gap-2"
          >
            <KeyRound className="w-4 h-4" />
            修改密码
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-600/20 disabled:opacity-50 inline-flex items-center gap-2"
          >
            {isSaving ? <UserCircle2 className="w-4 h-4 animate-pulse" /> : <Save className="w-4 h-4" />}
            {isSaving ? '保存中...' : '保存资料'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showPasswordModal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                <h4 className="text-lg font-bold text-gray-900 dark:text-white">修改密码</h4>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase ml-1">邮箱验证码</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={passwordForm.emailCode}
                      onChange={(e) => setPasswordForm((prev) => ({ ...prev, emailCode: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="请输入6位验证码"
                    />
                    <button
                      type="button"
                      onClick={handleSendPasswordCode}
                      disabled={isSendingPasswordCode || passwordCodeCountdown > 0}
                      className="px-4 py-2.5 rounded-xl text-sm font-bold bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {passwordCodeCountdown > 0 ? `${passwordCodeCountdown}s` : (isSendingPasswordCode ? '发送中...' : '发送验证码')}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase ml-1">当前密码</label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase ml-1">新密码</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-500 dark:text-slate-400 ml-1">{PASSWORD_POLICY_HINT}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase ml-1">确认新密码</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="p-5 bg-gray-50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-800 flex gap-3">
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 font-bold hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"
                >
                  取消
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={isChangingPassword}
                  className="flex-1 py-2.5 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-all shadow-lg shadow-amber-600/20 disabled:opacity-50"
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
