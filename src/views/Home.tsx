import React, { useEffect, useMemo, useState } from 'react';
import { User } from '../types';
import { ShieldCheck, TrendingUp, Zap, Users, CheckCircle } from 'lucide-react';

export default function Home({ user, setActiveTab }: { user: User, setActiveTab: (tab: string) => void }) {
  const [activeWhitehatCount, setActiveWhitehatCount] = useState<number | null>(null);
  const [totalVulnCount, setTotalVulnCount] = useState<number | null>(null);
  const [fixedVulnCount, setFixedVulnCount] = useState<number | null>(null);
  const [vulnRows, setVulnRows] = useState<Array<{
    id: string;
    author: string;
    type: string;
    level: string;
    status: string;
    description: string;
  }>>([]);

  useEffect(() => {
    const fetchHomeStats = async () => {
      try {
        const vulnRes = await fetch('/api/vulnerabilities');
        const vulnData = await vulnRes.json();
        if (vulnRes.ok && Array.isArray(vulnData)) {
          setTotalVulnCount(vulnData.length);
          setFixedVulnCount(vulnData.filter((v: { status?: string }) => v.status === '已修复').length);
          setVulnRows(vulnData);
        }

        if (user.role === 'admin') {
          const res = await fetch('/api/users');
          const data = await res.json();
          if (!res.ok || !Array.isArray(data)) return;
          const count = data.filter((u: User) => u.role === 'user' && u.status === 'Active').length;
          setActiveWhitehatCount(count);
          return;
        }

        const res = await fetch('/api/users/leaderboard?limit=100');
        const data = await res.json();
        if (!res.ok || !Array.isArray(data?.leaderboard)) return;
        setActiveWhitehatCount(data.leaderboard.length);
      } catch (error) {
        console.error('Failed to fetch active whitehat stats:', error);
      }
    };

    fetchHomeStats();
  }, [user.role]);

  const radarMetrics = useMemo(() => {
    const rows = (user.role === 'user'
      ? vulnRows.filter((v) => v.author === user.username)
      : vulnRows) as Array<{
      author: string;
      type: string;
      level: string;
      status: string;
      description: string;
    }>;

    const total = rows.length;
    if (total === 0) {
      return [
        { label: '漏洞覆盖', value: 0 },
        { label: '高危识别', value: 0 },
        { label: '修复闭环', value: 0 },
        { label: '类型广度', value: 0 },
        { label: '响应效率', value: 0 },
        { label: '报告完整', value: 0 },
      ];
    }

    const highCount = rows.filter((v) => v.level === '严重' || v.level === '高危').length;
    const fixedCount = rows.filter((v) => v.status === '已修复').length;
    const pendingCount = rows.filter((v) => v.status === '待处理' || v.status === '审核中').length;
    const detailCount = rows.filter((v) => (v.description || '').trim().length >= 40).length;
    const uniqueTypeCount = new Set(rows.map((v) => v.type)).size;

    const coverageBaseline = user.role === 'user' ? 10 : 40;
    const typeBaseline = user.role === 'user' ? 5 : 8;
    const clamp = (val: number) => Math.max(0, Math.min(100, Math.round(val)));

    return [
      { label: '漏洞覆盖', value: clamp((total / coverageBaseline) * 100) },
      { label: '高危识别', value: clamp((highCount / total) * 100) },
      { label: '修复闭环', value: clamp((fixedCount / total) * 100) },
      { label: '类型广度', value: clamp((uniqueTypeCount / typeBaseline) * 100) },
      { label: '响应效率', value: clamp(((total - pendingCount) / total) * 100) },
      { label: '报告完整', value: clamp((detailCount / total) * 100) },
    ];
  }, [user.role, user.username, vulnRows]);

  const radarSummary = useMemo(() => {
    const avg = radarMetrics.reduce((sum, item) => sum + item.value, 0) / radarMetrics.length;
    if (avg >= 75) return '综合态势优秀，当前安全运营质量稳定。';
    if (avg >= 50) return '整体表现良好，建议持续提升闭环与效率。';
    return '基础能力有提升空间，建议优先优化高危处置与修复节奏。';
  }, [radarMetrics]);

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
          value={totalVulnCount === null ? '...' : totalVulnCount.toLocaleString()} 
          icon={TrendingUp} 
          color="text-primary-600" 
          bg="bg-primary-50 dark:bg-primary-900/20" 
          onClick={() => setActiveTab(user.role === 'user' ? 'my_vulns' : 'vulns')}
        />
        <StatCard 
          title="已修复" 
          value={fixedVulnCount === null ? '...' : fixedVulnCount.toLocaleString()} 
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
          value={activeWhitehatCount === null ? '...' : activeWhitehatCount.toLocaleString()} 
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

        {/* Skill Radar */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col items-center">
          <h3 className="font-bold text-lg mb-6 w-full text-left text-gray-900 dark:text-white">
            {user.role === 'user' ? '我的漏洞分析雷达' : '总体漏洞分析雷达'}
          </h3>
          <RadarChart metrics={radarMetrics} />
          <p className="text-sm text-gray-500 mt-8 text-center italic">"{radarSummary}"</p>
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

function RadarChart({ metrics }: { metrics: Array<{ label: string; value: number }> }) {
  const center = 80;
  const radius = 62;
  const points = metrics
    .map((metric, idx) => {
      const angle = (Math.PI * 2 * idx) / metrics.length - Math.PI / 2;
      const r = (radius * metric.value) / 100;
      const x = center + Math.cos(angle) * r;
      const y = center + Math.sin(angle) * r;
      return `${x},${y}`;
    })
    .join(' ');

  const ring = [1, 0.75, 0.5, 0.25].map((scale) =>
    metrics
      .map((_, idx) => {
        const angle = (Math.PI * 2 * idx) / metrics.length - Math.PI / 2;
        const x = center + Math.cos(angle) * radius * scale;
        const y = center + Math.sin(angle) * radius * scale;
        return `${x},${y}`;
      })
      .join(' '),
  );

  const labelPos = metrics.map((metric, idx) => {
    const angle = (Math.PI * 2 * idx) / metrics.length - Math.PI / 2;
    const x = center + Math.cos(angle) * (radius + 20);
    const y = center + Math.sin(angle) * (radius + 20);
    return { ...metric, x, y };
  });

  return (
    <div className="relative w-[260px] h-[260px]">
      <svg viewBox="0 0 160 160" className="w-full h-full">
        {ring.map((pts, idx) => (
          <polygon key={idx} points={pts} fill="none" stroke="currentColor" className="text-gray-200 dark:text-slate-800" strokeWidth="1" />
        ))}
        {metrics.map((_, idx) => {
          const angle = (Math.PI * 2 * idx) / metrics.length - Math.PI / 2;
          const x = center + Math.cos(angle) * radius;
          const y = center + Math.sin(angle) * radius;
          return <line key={idx} x1={center} y1={center} x2={x} y2={y} stroke="currentColor" className="text-gray-200 dark:text-slate-800" strokeWidth="1" />;
        })}
        <polygon points={points} fill="rgba(0, 102, 51, 0.2)" stroke="#006633" strokeWidth="2" />
      </svg>
      {labelPos.map((item, idx) => (
        <div
          key={idx}
          className="absolute text-[10px] font-bold text-gray-500 whitespace-nowrap -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${(item.x / 160) * 100}%`, top: `${(item.y / 160) * 100}%` }}
        >
          {item.label}
        </div>
      ))}
    </div>
  );
}
