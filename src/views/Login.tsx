import React, { useState } from 'react';
import { ShieldAlert, Eye, EyeOff, Fingerprint, Lock } from 'lucide-react';
import { User } from '../types';
import SliderCaptcha from '../components/SliderCaptcha';
import { getApiErrorMessage } from '../utils/apiError';
import { PASSWORD_POLICY_HINT, validatePasswordPolicyText } from '../utils/passwordPolicy';
import PasswordStrengthBar from '../components/PasswordStrengthBar';
import logoImg from '../CQUPT/CQUPT_01_logo_1024px.png';

interface LoginProps {
  onLogin: (user: User) => void;
  onSwitchToRegister: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export default function Login({ onLogin, onSwitchToRegister, isDarkMode, toggleTheme }: LoginProps) {
  const [authCode, setAuthCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [isSendingForgotCode, setIsSendingForgotCode] = useState(false);
  const [forgotCodeCountdown, setForgotCodeCountdown] = useState(0);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotNotice, setForgotNotice] = useState('');
  const [forgotForm, setForgotForm] = useState({
    authCode: '',
    email: '',
    emailCode: '',
    newPassword: '',
    confirmPassword: '',
  });

  React.useEffect(() => {
    if (forgotCodeCountdown <= 0) return;
    const timer = window.setInterval(() => {
      setForgotCodeCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [forgotCodeCountdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isVerified) {
      setError('请先完成人机验证');
      return;
    }
    setError('');
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authCode, password }),
      });
      const data = await response.json();
      if (data.success) {
        onLogin(data.user);
      } else {
        setError(getApiErrorMessage(data, '登录失败，请稍后再试', response.status));
      }
    } catch (err) {
      setError('登录失败，请稍后再试');
    }
  };

  const handleSendForgotCode = async () => {
    const authCode = forgotForm.authCode.trim();
    const email = forgotForm.email.trim();
    if (!authCode || !email) {
      setForgotError('请先填写统一认证码和邮箱');
      return;
    }
    if (!/^\d{7}$/.test(authCode)) {
      setForgotError('统一认证码需为7位数字');
      return;
    }

    setIsSendingForgotCode(true);
    setForgotError('');
    setForgotNotice('');
    try {
      const response = await fetch('/api/auth/email-code/forgot/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authCode, email }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(getApiErrorMessage(data, '验证码发送失败，请稍后再试', response.status));
      }

      const cooldown = typeof data.cooldownInSec === 'number' ? data.cooldownInSec : 60;
      setForgotCodeCountdown(Math.max(1, cooldown));
      if (typeof data.devCode === 'string') {
        setForgotNotice(`开发环境验证码：${data.devCode}`);
      } else {
        setForgotNotice(typeof data.message === 'string' ? data.message : '验证码已发送，请查收邮箱');
      }
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : '验证码发送失败，请稍后再试');
    } finally {
      setIsSendingForgotCode(false);
    }
  };

  const handleResetForgotPassword = async () => {
    setForgotError('');
    setForgotNotice('');
    const issue = validatePasswordPolicyText(forgotForm.newPassword);
    if (issue) {
      setForgotError(issue);
      return;
    }
    if (forgotForm.newPassword !== forgotForm.confirmPassword) {
      setForgotError('两次输入的新密码不一致');
      return;
    }

    setIsResettingPassword(true);
    try {
      const response = await fetch('/api/auth/password/forgot/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(forgotForm),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(getApiErrorMessage(data, '密码重置失败，请稍后再试', response.status));
      }

      setForgotNotice(typeof data.message === 'string' ? data.message : '密码重置成功，请重新登录');
      setForgotForm({
        authCode: '',
        email: '',
        emailCode: '',
        newPassword: '',
        confirmPassword: '',
      });
      setForgotCodeCountdown(0);
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : '密码重置失败，请稍后再试');
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-950 p-4 transition-colors duration-300">
      <div className="absolute top-6 right-6">
        <button 
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-all"
        >
          {isDarkMode ? <span className="text-amber-400">☀️</span> : <span className="text-slate-600">🌙</span>}
        </button>
      </div>

      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xl p-8 animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <div >
            <img src={logoImg} alt="Logo" className="w-25 h-25" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">CQUPT-SRC</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">安全响应中心门户</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300 ml-0.5">统一认证码</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary-600 transition-colors">
                <Fingerprint className="w-5 h-5" />
              </div>
              <input 
                type="text" 
                required 
                maxLength={7}
                value={authCode}
                onChange={(e) => setAuthCode(e.target.value.replace(/\D/g, '').slice(0, 7))}
                placeholder="请输入7位统一认证码" 
                className="w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300 ml-0.5">密码</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary-600 transition-colors">
                <Lock className="w-5 h-5" />
              </div>
              <input 
                type={showPassword ? "text" : "password"} 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="w-full pl-11 pr-12 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white text-sm"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <div className="text-right mt-1">
              <button
                type="button"
                onClick={() => {
                  setForgotError('');
                  setForgotNotice('');
                  setShowForgotModal(true);
                }}
                className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
              >
                忘记密码？
              </button>
            </div>
          </div>

          <SliderCaptcha onVerify={setIsVerified} isDarkMode={isDarkMode} />

          <button 
            type="submit" 
            disabled={!isVerified}
            className={`w-full py-3 font-bold rounded-xl shadow-lg transition-all duration-300 ${
              isVerified 
                ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-primary-600/20 hover:shadow-primary-600/40 active:scale-[0.98]' 
                : 'bg-gray-200 dark:bg-slate-800 text-gray-400 cursor-not-allowed'
            }`}
          >
            登录平台
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-800 text-center">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            新白帽子？ <button onClick={onSwitchToRegister} className="text-primary-600 dark:text-primary-400 hover:underline font-semibold ml-1">申请账号</button>
          </p>
        </div>
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500 dark:text-slate-400">
            <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer">渝ICP备2026008425号</a>
          </p>
        </div>
      </div>
      {showForgotModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">找回密码</h3>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 text-sm"
              >
                关闭
              </button>
            </div>
            {forgotError ? (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-3 py-2">
                {forgotError}
              </div>
            ) : null}
            {forgotNotice ? (
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-300 text-sm px-3 py-2">
                {forgotNotice}
              </div>
            ) : null}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300 ml-0.5">统一认证码</label>
              <input
                type="text"
                maxLength={7}
                value={forgotForm.authCode}
                onChange={(e) =>
                  setForgotForm((prev) => ({ ...prev, authCode: e.target.value.replace(/\D/g, '').slice(0, 7) }))
                }
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300 ml-0.5">邮箱</label>
              <input
                type="email"
                value={forgotForm.email}
                onChange={(e) => setForgotForm((prev) => ({ ...prev, email: e.target.value.trim() }))}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300 ml-0.5">邮箱验证码</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={forgotForm.emailCode}
                  onChange={(e) =>
                    setForgotForm((prev) => ({ ...prev, emailCode: e.target.value.replace(/\D/g, '').slice(0, 6) }))
                  }
                  className="flex-1 px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white text-sm"
                />
                <button
                  type="button"
                  onClick={handleSendForgotCode}
                  disabled={isSendingForgotCode || forgotCodeCountdown > 0}
                  className="px-3 py-2.5 rounded-xl text-xs font-semibold border border-gray-200 dark:border-slate-700 text-primary-600 dark:text-primary-400 disabled:opacity-50"
                >
                  {forgotCodeCountdown > 0 ? `${forgotCodeCountdown}s` : isSendingForgotCode ? '发送中...' : '发送验证码'}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300 ml-0.5">新密码</label>
              <input
                type="password"
                value={forgotForm.newPassword}
                onChange={(e) => setForgotForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white text-sm"
              />
              <PasswordStrengthBar password={forgotForm.newPassword} />
              {!forgotForm.newPassword && <p className="text-xs text-gray-500 dark:text-slate-400 ml-0.5">{PASSWORD_POLICY_HINT}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300 ml-0.5">确认新密码</label>
              <input
                type="password"
                value={forgotForm.confirmPassword}
                onChange={(e) => setForgotForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white text-sm"
              />
            </div>

            <button
              type="button"
              onClick={handleResetForgotPassword}
              disabled={isResettingPassword}
              className="w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold disabled:opacity-60"
            >
              {isResettingPassword ? '重置中...' : '重置密码'}
            </button>
          </div>
        </div>
      ) : null}
      <p className="text-center text-xs text-gray-400 dark:text-slate-500 mt-8">
        © 2024 CQUPT Security Response Center. All rights reserved.
      </p>
    </div>
  );
}
