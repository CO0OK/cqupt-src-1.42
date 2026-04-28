import React from 'react';
import { User } from '../types';
import { X, Camera, Save } from 'lucide-react';
import { motion } from 'motion/react';

interface ProfileModalProps {
  user: User;
  type: 'profile' | 'password' | 'avatar';
  onClose: () => void;
}

export default function ProfileModal({ user, type, onClose }: ProfileModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-200 dark:border-slate-800"
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {type === 'profile' ? '个人资料设置' : type === 'password' ? '修改登录密码' : '修改头像'}
            </h3>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-gray-400 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {type === 'profile' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">用户名</label>
                <input type="text" defaultValue={user.username} className="w-full rounded-xl border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white p-2.5 focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">统一认证码</label>
                <input type="text" disabled value={user.authCode} className="w-full rounded-xl border-gray-200 dark:border-slate-800 bg-gray-100 dark:bg-slate-900 text-gray-500 p-2.5 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">电子邮箱</label>
                <input type="email" defaultValue={user.email} className="w-full rounded-xl border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white p-2.5 focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
            </div>
          )}

          {type === 'password' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">当前密码</label>
                <input type="password" placeholder="请输入当前密码" className="w-full rounded-xl border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white p-2.5 focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">新密码</label>
                <input type="password" placeholder="请输入新密码" className="w-full rounded-xl border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white p-2.5 focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">确认新密码</label>
                <input type="password" placeholder="请再次输入新密码" className="w-full rounded-xl border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white p-2.5 focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
            </div>
          )}

          {type === 'avatar' && (
            <div className="flex flex-col items-center py-6 space-y-6">
              <div className="relative group">
                <img 
                  src={user.avatar || `https://ui-avatars.com/api/?name=${user.username}&background=random&size=128`} 
                  className="w-32 h-32 rounded-full border-4 border-primary-50 dark:border-primary-900 shadow-lg" 
                  alt="Avatar" 
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="w-8 h-8 text-white" />
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-slate-400">点击头像上传新图片，支持 JPG/PNG 格式</p>
            </div>
          )}

          <div className="mt-8 flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-400 font-bold hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
              取消
            </button>
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl bg-primary-600 text-white font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/20 flex items-center justify-center gap-2">
              <Save className="w-4 h-4" /> 保存
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
