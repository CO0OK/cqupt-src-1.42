import React from 'react';
import { Trophy, Medal, TrendingUp, ChevronRight } from 'lucide-react';

export default function Leaderboard() {
  const leaders = [
    { rank: 1, name: 'CyberKnight', points: 15200, vulns: 45, avatar: 'https://i.pravatar.cc/150?u=1' },
    { rank: 2, name: 'NullPointer', points: 12800, vulns: 38, avatar: 'https://i.pravatar.cc/150?u=2' },
    { rank: 3, name: 'RootShell', points: 11500, vulns: 32, avatar: 'https://i.pravatar.cc/150?u=3' },
    { rank: 4, name: 'GhostWalker', points: 9800, vulns: 28, avatar: 'https://i.pravatar.cc/150?u=4' },
    { rank: 5, name: 'BufferOverflow', points: 8600, vulns: 24, avatar: 'https://i.pravatar.cc/150?u=5' },
    { rank: 6, name: 'XSS_Master', points: 7200, vulns: 21, avatar: 'https://i.pravatar.cc/150?u=6' },
    { rank: 7, name: 'SQLi_Hunter', points: 6500, vulns: 19, avatar: 'https://i.pravatar.cc/150?u=7' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">白帽子英雄榜</h2>
        <p className="text-gray-500 dark:text-slate-400 mt-2">致敬那些为校园网络安全做出杰出贡献的守护者们</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-end">
        {/* Top 3 */}
        <div className="order-2 lg:order-1 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col items-center text-center">
          <div className="relative mb-4">
            <img src={leaders[1].avatar} className="w-20 h-20 rounded-full border-4 border-gray-100 dark:border-slate-800" alt="" />
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gray-400 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold border-4 border-white dark:border-slate-900">2</div>
          </div>
          <h3 className="font-bold text-gray-900 dark:text-white">{leaders[1].name}</h3>
          <p className="text-amber-600 font-bold text-sm mt-1">{leaders[1].points} 积分</p>
          <div className="mt-4 w-full pt-4 border-t border-gray-100 dark:border-slate-800 flex justify-around text-xs text-gray-500">
            <div><p className="font-bold text-gray-900 dark:text-white">{leaders[1].vulns}</p><p>漏洞</p></div>
            <div><p className="font-bold text-gray-900 dark:text-white">98%</p><p>修复率</p></div>
          </div>
        </div>

        <div className="order-1 lg:order-2 bg-gradient-to-b from-primary-600 to-primary-800 p-8 rounded-3xl shadow-xl shadow-primary-500/20 flex flex-col items-center text-center text-white transform scale-110 z-10">
          <Trophy className="w-12 h-12 text-amber-400 mb-4" />
          <div className="relative mb-4">
            <img src={leaders[0].avatar} className="w-24 h-24 rounded-full border-4 border-white/20" alt="" />
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-amber-400 text-primary-900 w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 border-primary-600">1</div>
          </div>
          <h3 className="font-bold text-xl">{leaders[0].name}</h3>
          <p className="text-amber-300 font-bold mt-1">{leaders[0].points} 积分</p>
          <div className="mt-6 w-full pt-6 border-t border-white/10 flex justify-around text-sm">
            <div><p className="font-bold">{leaders[0].vulns}</p><p className="opacity-70">漏洞</p></div>
            <div><p className="font-bold">100%</p><p className="opacity-70">修复率</p></div>
          </div>
        </div>

        <div className="order-3 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col items-center text-center">
          <div className="relative mb-4">
            <img src={leaders[2].avatar} className="w-20 h-20 rounded-full border-4 border-gray-100 dark:border-slate-800" alt="" />
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-orange-400 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold border-4 border-white dark:border-slate-900">3</div>
          </div>
          <h3 className="font-bold text-gray-900 dark:text-white">{leaders[2].name}</h3>
          <p className="text-amber-600 font-bold text-sm mt-1">{leaders[2].points} 积分</p>
          <div className="mt-4 w-full pt-4 border-t border-gray-100 dark:border-slate-800 flex justify-around text-xs text-gray-500">
            <div><p className="font-bold text-gray-900 dark:text-white">{leaders[2].vulns}</p><p>漏洞</p></div>
            <div><p className="font-bold text-gray-900 dark:text-white">95%</p><p>修复率</p></div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 dark:text-white">完整排名</h3>
          <button className="text-sm text-primary-600 font-bold flex items-center gap-1">
            查看更多 <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-slate-800">
          {leaders.slice(3).map(leader => (
            <div key={leader.rank} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center gap-4">
                <span className="w-6 text-center font-bold text-gray-400">{leader.rank}</span>
                <img src={leader.avatar} className="w-10 h-10 rounded-full" alt="" />
                <span className="font-bold text-gray-900 dark:text-white">{leader.name}</span>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{leader.points}</p>
                  <p className="text-[10px] text-gray-500 uppercase">积分</p>
                </div>
                <div className="text-right w-16">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{leader.vulns}</p>
                  <p className="text-[10px] text-gray-500 uppercase">漏洞</p>
                </div>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
