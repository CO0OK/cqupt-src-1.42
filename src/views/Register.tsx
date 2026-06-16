import React, { useState, useRef } from 'react';
import { User as UserIcon, Fingerprint, Mail, Lock, Eye, EyeOff, X, CheckCircle } from 'lucide-react';
import SliderCaptcha from '../components/SliderCaptcha';
import { motion, AnimatePresence } from 'motion/react';
import { getApiErrorMessage } from '../utils/apiError';
import { PASSWORD_POLICY_HINT, validatePasswordPolicyText } from '../utils/passwordPolicy';
import PasswordStrengthBar from '../components/PasswordStrengthBar';
import logoImg from '../CQUPT/CQUPT_01_logo_1024px.png';

interface RegisterProps {
  onSwitchToLogin: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export default function Register({ onSwitchToLogin, isDarkMode, toggleTheme }: RegisterProps) {
  const [formData, setFormData] = useState({
    username: '',
    authCode: '',
    email: '',
    emailCode: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [emailCodeTip, setEmailCodeTip] = useState('');
  const [success, setSuccess] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [showAgreement, setShowAgreement] = useState(false);
  const [hasReadToBottom, setHasReadToBottom] = useState(false);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [isSendingEmailCode, setIsSendingEmailCode] = useState(false);
  const [emailCodeCountdown, setEmailCodeCountdown] = useState(0);
  const agreementContentRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      setHasReadToBottom(true);
    }
  };

  React.useEffect(() => {
    if (emailCodeCountdown <= 0) return;
    const timer = window.setInterval(() => {
      setEmailCodeCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [emailCodeCountdown]);

  const handleSendEmailCode = async () => {
    const email = formData.email.trim();
    if (!email) {
      setError('请先输入邮箱');
      return;
    }

    setError('');
    setEmailCodeTip('');
    setIsSendingEmailCode(true);
    try {
      const response = await fetch('/api/auth/email-code/register/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success) {
        setError(getApiErrorMessage(data, '验证码发送失败，请稍后再试', response.status));
        return;
      }
      setEmailCodeCountdown(typeof data.cooldownInSec === 'number' ? data.cooldownInSec : 60);
      if (typeof data.devCode === 'string') {
        setEmailCodeTip(`开发环境验证码：${data.devCode}`);
      }
    } catch {
      setEmailCodeTip('');
      setError('验证码发送失败，请稍后再试');
    } finally {
      setIsSendingEmailCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreementAccepted) {
      setError('请先阅读并同意用户协议');
      return;
    }
    if (!/^\d{7}$/.test(formData.authCode.trim())) {
      setError('统一认证码需为7位数字');
      return;
    }
    const passwordIssue = validatePasswordPolicyText(formData.password);
    if (passwordIssue) {
      setError(passwordIssue);
      return;
    }
    if (!isVerified) {
      setError('请先完成人机验证');
      return;
    }
    setError('');
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (data.success) {
        setSuccess(true);
        setTimeout(onSwitchToLogin, 2000);
      } else {
        setError(getApiErrorMessage(data, '注册失败，请稍后再试', response.status));
      }
    } catch (err) {
      setError('注册失败，请稍后再试');
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
          <div>
            <img src={logoImg} alt="Logo" className="w-25 h-25" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">CQUPT-SRC</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">新白帽子注册</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm text-center">
            注册成功！正在跳转登录...
          </div>
        )}

        {emailCodeTip && (
          <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 text-sm text-center">
            {emailCodeTip}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300 ml-0.5">用户名</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary-600 transition-colors">
                <UserIcon className="w-5 h-5" />
              </div>
              <input 
                type="text" 
                required 
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                placeholder="请输入您的用户名" 
                className="w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white text-sm"
              />
            </div>
          </div>

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
                value={formData.authCode}
                onChange={(e) => setFormData({...formData, authCode: e.target.value.replace(/\D/g, '').slice(0, 7)})}
                placeholder="请输入7位统一认证码" 
                className="w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300 ml-0.5">电子邮箱</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary-600 transition-colors">
                <Mail className="w-5 h-5" />
              </div>
              <input 
                type="email" 
                required 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="example@cqupt.edu.cn" 
                className="w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300 ml-0.5">邮箱验证码</label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                maxLength={6}
                value={formData.emailCode}
                onChange={(e) => setFormData({ ...formData, emailCode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                placeholder="请输入6位验证码"
                className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white text-sm"
              />
              <button
                type="button"
                onClick={handleSendEmailCode}
                disabled={isSendingEmailCode || emailCodeCountdown > 0}
                className="px-4 py-2.5 rounded-xl text-sm font-bold bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {emailCodeCountdown > 0 ? `${emailCodeCountdown}s` : (isSendingEmailCode ? '发送中...' : '发送验证码')}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300 ml-0.5">设置密码</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary-600 transition-colors">
                <Lock className="w-5 h-5" />
              </div>
              <input 
                type={showPassword ? "text" : "password"} 
                required 
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="请输入8-20位密码" 
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
            <PasswordStrengthBar password={formData.password} />
            {!formData.password && <p className="text-xs text-gray-500 dark:text-slate-400 ml-1">{PASSWORD_POLICY_HINT}</p>}
          </div>

          <div className="flex items-center gap-2 px-1">
            <input 
              type="checkbox" 
              id="agreement"
              checked={agreementAccepted}
              onChange={(e) => setAgreementAccepted(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
            />
            <label htmlFor="agreement" className="text-xs text-gray-500 dark:text-slate-400">
              我已阅读并同意 <button type="button" onClick={() => setShowAgreement(true)} className="text-primary-600 hover:underline">《用户服务协议与隐私政策》</button>
            </label>
          </div>

          <SliderCaptcha onVerify={setIsVerified} isDarkMode={isDarkMode} />

          <button 
            type="submit" 
            disabled={!isVerified || !agreementAccepted}
            className={`w-full py-3 font-bold rounded-xl shadow-lg transition-all duration-300 ${
              isVerified && agreementAccepted
                ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-primary-600/20 hover:shadow-primary-600/40 active:scale-[0.98]' 
                : 'bg-gray-200 dark:bg-slate-800 text-gray-400 cursor-not-allowed'
            }`}
          >
            立即注册
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-800 text-center">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            已有账号？ <button onClick={onSwitchToLogin} className="text-primary-600 dark:text-primary-400 hover:underline font-semibold ml-1">立即登录</button>
          </p>
        </div>
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500 dark:text-slate-400">
            <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer">渝ICP备2026008425号</a>
          </p>
        </div>
      </div>

      {/* Agreement Modal */}
      <AnimatePresence>
        {showAgreement && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-slate-800 flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">用户服务协议与隐私政策</h3>
                <button onClick={() => setShowAgreement(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div 
                ref={agreementContentRef}
                onScroll={handleScroll}
                className="p-8 overflow-y-auto text-sm text-gray-600 dark:text-slate-400 leading-relaxed space-y-4"
              >
                <p className="font-bold text-gray-900 dark:text-white">欢迎加入 CQUPT-SRC 校园漏洞响应与产教融合平台！</p>
                <p>在您注册成为本平台用户之前，请务必仔细阅读并充分理解本协议。当您勾选“我已阅读并同意”并完成注册后，即表示您已接受本协议的所有条款。</p>
                
                <h4 className="font-bold text-gray-800 dark:text-slate-200">一、 平台宗旨</h4>
                <p>本平台旨在通过白帽子提交漏洞，提升校园网络资产安全，同时为学生提供网络安全实战机会。</p>
                
                <h4 className="font-bold text-gray-800 dark:text-slate-200">二、 用户行为准则</h4>
                <p>1. 严禁利用平台漏洞进行任何形式的非法攻击或破坏。</p>
                <p>2. 严禁未经授权获取、泄露或买卖平台及校园相关敏感数据。</p>
                <p>3. 提交的漏洞报告必须真实、有效，且具有复现性。</p>
                <p>4. 严禁在任何公共场合（如社交媒体、博客等）公开未修复的漏洞详情。</p>
                
                <h4 className="font-bold text-gray-800 dark:text-slate-200">三、 隐私政策</h4>
                <p>我们将严格保护您的个人信息，除法律法规要求或您授权外，不会向第三方泄露您的隐私数据。</p>
                
                <h4 className="font-bold text-gray-800 dark:text-slate-200">四、 法律责任</h4>
                <p>用户应对其在平台上的所有行为承担法律责任。如违反本协议，平台有权封禁账号并追究法律责任。</p>
                
                <div className="h-20 flex items-center justify-center text-xs text-gray-400 italic">
                  --- 请滑动到底部以确认阅读完毕 ---
                </div>
              </div>

              <div className="p-6 bg-gray-50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-800 flex gap-3">
                <button 
                  onClick={() => setShowAgreement(false)}
                  className="flex-1 py-2.5 text-gray-600 dark:text-slate-400 font-bold"
                >
                  取消
                </button>
                <button 
                  disabled={!hasReadToBottom}
                  onClick={() => {
                    setAgreementAccepted(true);
                    setShowAgreement(false);
                  }}
                  className={`flex-1 py-2.5 font-bold rounded-xl transition-all ${
                    hasReadToBottom 
                      ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20' 
                      : 'bg-gray-200 dark:bg-slate-800 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {hasReadToBottom ? '同意并继续' : '请阅读完协议'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
