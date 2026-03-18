import React, { useState } from 'react';
import { ShieldAlert, Eye, EyeOff, Fingerprint, Lock } from 'lucide-react';
import { User } from '../types';
import SliderCaptcha from '../components/SliderCaptcha';

interface LoginProps {
  onLogin: (user: User) => void;
  onSwitchToRegister: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export default function Login({ onLogin, onSwitchToRegister, isDarkMode, toggleTheme }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isVerified, setIsVerified] = useState(false);

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
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (data.success) {
        onLogin(data.user);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('登录失败，请稍后再试');
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
            <img src="src\CQUPT\CQUPT_01_logo_1024px.png" alt="Logo" className="w-25 h-25" />
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
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入您的 ID" 
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
      </div>
      <p className="text-center text-xs text-gray-400 dark:text-slate-500 mt-8">
        © 2024 CQUPT Security Response Center. All rights reserved.
      </p>
    </div>
  );
}
