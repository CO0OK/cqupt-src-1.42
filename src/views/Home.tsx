import React from 'react';
import { User } from '../types';
import { ShieldCheck, TrendingUp, Zap, Users, CheckCircle } from 'lucide-react';

export default function Home({ user, setActiveTab }: { user: User, setActiveTab: (tab: string) => void }) {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 to-primary-800 dark:from-primary-700 dark:to-primary-900 p-8 text-white shadow-xl shadow-primary-500/10">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">欢迎回来, {user.username}</h1>
          <p className="text-primary-50 opacity-90 max-w-2xl">
            {user.role === 'admin' 
              ? '今天又有 12 个新漏洞待审核。您的努力保护了 30,000+ 重邮学子的网络资产安全。'
              : '继续挖掘漏洞，提升您的排名，守护校园网络安全！'}
          </p>
          <div className="mt-6">
            <button 
              onClick={() => setActiveTab(user.role === 'user' ? 'submit' : 'audit')}
              className="px-5 py-2.5 bg-white text-primary-700 rounded-xl font-semibold shadow-lg hover:scale-105 transition-transform"
            >
              {user.role === 'user' ? '立即提交漏洞' : '查看待办任务'}
            </button>
          </div>
        </div>
        <ShieldCheck className="absolute -right-10 -bottom-10 w-64 h-64 text-white/10 rotate-12" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="总漏洞数" 
          value="1,284" 
          icon={TrendingUp} 
          color="text-primary-600" 
          bg="bg-primary-50 dark:bg-primary-900/20" 
          onClick={() => setActiveTab(user.role === 'user' ? 'my_vulns' : 'vulns')}
        />
        <StatCard 
          title="已修复" 
          value="956" 
          icon={CheckCircle} 
          color="text-emerald-600" 
          bg="bg-emerald-50 dark:bg-emerald-900/20" 
          onClick={() => setActiveTab(user.role === 'user' ? 'my_vulns' : 'vulns')}
        />
        <StatCard 
          title="我的积分" 
          value={user.points.toLocaleString()} 
          icon={Zap} 
          color="text-amber-600" 
          bg="bg-amber-50 dark:bg-amber-900/20" 
          onClick={() => setActiveTab('mall')}
        />
        <StatCard 
          title="活跃白帽" 
          value="342" 
          icon={Users} 
          color="text-primary-600" 
          bg="bg-primary-50 dark:bg-primary-900/20" 
          onClick={() => setActiveTab('leaderboard')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Distribution */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
          <h3 className="font-bold text-lg mb-6 text-gray-900 dark:text-white">漏洞等级分布</h3>
          <div className="space-y-6">
            <ProgressBar label="高危漏洞 (Critical)" percent={15} color="bg-red-500" />
            <ProgressBar label="中危漏洞 (Medium)" percent={45} color="bg-orange-500" />
            <ProgressBar label="低危漏洞 (Low)" percent={30} color="bg-primary-500" />
            <ProgressBar label="信息泄露 (Info)" percent={10} color="bg-gray-400" />
          </div>
        </div>

        {/* Skill Radar Mock */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col items-center">
          <h3 className="font-bold text-lg mb-6 w-full text-left text-gray-900 dark:text-white">白帽技能雷达</h3>
          <div className="relative w-48 h-48 mt-4">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <polygon points="50,5 93,30 93,80 50,105 7,80 7,30" fill="none" stroke="currentColor" className="text-gray-200 dark:text-slate-800" strokeWidth="1" />
              <polygon points="50,25 71,37 71,62 50,75 29,62 29,37" fill="none" stroke="currentColor" className="text-gray-200 dark:text-slate-800" strokeWidth="1" />
              <polygon points="50,15 80,40 70,70 50,90 30,70 20,40" fill="rgba(0, 102, 51, 0.2)" stroke="#006633" strokeWidth="2" />
            </svg>
            <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 text-[10px] font-bold text-gray-500">Web安全</span>
            <span className="absolute top-1/4 -right-10 text-[10px] font-bold text-gray-500">渗透测试</span>
            <span className="absolute bottom-1/4 -right-8 text-[10px] font-bold text-gray-500">二进制</span>
            <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-bold text-gray-500">移动端</span>
            <span className="absolute bottom-1/4 -left-8 text-[10px] font-bold text-gray-500">IoT</span>
            <span className="absolute top-1/4 -left-10 text-[10px] font-bold text-gray-500">逻辑漏洞</span>
          </div>
          <p className="text-sm text-gray-500 mt-10 text-center italic">"全能型选手，Web端表现尤为卓越"</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, bg, onClick }: any) {
  return (
    <div 
      onClick={onClick}
      className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md hover:border-primary-500/30 transition-all group"
    >
      <div>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-1 font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors">{value}</p>
      </div>
      <div className={`${bg} ${color} p-3 rounded-xl group-hover:scale-110 transition-transform`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );
}

function ProgressBar({ label, percent, color }: any) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="text-gray-600 dark:text-slate-300 font-medium">{label}</span>
        <span className="font-bold text-gray-900 dark:text-white">{percent}%</span>
      </div>
      <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
        <div className={`${color} h-full rounded-full transition-all duration-1000`} style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  );
}
