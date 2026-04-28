import React, { useEffect, useMemo, useState } from 'react';
import { Trophy, TrendingUp } from 'lucide-react';
import { getApiErrorMessage } from '../utils/apiError';

export default function Leaderboard() {
  type LeaderboardEntry = {
    rank: number;
    displayName: string;
    points: number;
    vulnCount: number;
    isMe: boolean;
    avatar?: string;
  };
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const topThree = useMemo(() => leaders.slice(0, 3), [leaders]);
  const rest = useMemo(() => leaders.slice(3), [leaders]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/users/leaderboard?limit=50');
        const data = await res.json();
        if (!res.ok || !data?.success) {
          setError(getApiErrorMessage(data, '获取排行榜失败', res.status));
          return;
        }
        setLeaders(Array.isArray(data.leaderboard) ? data.leaderboard : []);
      } catch {
        setError('网络异常，获取排行榜失败');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const avatarOf = (entry: LeaderboardEntry) =>
    entry.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(entry.displayName)}&background=random&size=128`;

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">白帽子英雄榜</h2>
          <p className="text-gray-500 dark:text-slate-400 mt-2">加载排行榜中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">白帽子英雄榜</h2>
          <p className="text-red-600 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (leaders.length === 0) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">白帽子英雄榜</h2>
          <p className="text-gray-500 dark:text-slate-400 mt-2">暂无可排行的白帽子用户</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">白帽子英雄榜</h2>
        <p className="text-gray-500 dark:text-slate-400 mt-2">仅统计白帽子用户积分排名，展示数据已做隐私脱敏处理</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-end">
        {/* Top 3 */}
        <div className="order-2 lg:order-1 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col items-center text-center">
          <div className="relative mb-4">
            <img src={topThree[1] ? avatarOf(topThree[1]) : avatarOf(topThree[0])} className="w-20 h-20 rounded-full border-4 border-gray-100 dark:border-slate-800" alt="" />
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gray-400 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold border-4 border-white dark:border-slate-900">2</div>
          </div>
          <h3 className="font-bold text-gray-900 dark:text-white">{topThree[1]?.displayName || '-'}</h3>
          <p className="text-amber-600 font-bold text-sm mt-1">{topThree[1]?.points ?? 0} 积分</p>
          <div className="mt-4 w-full pt-4 border-t border-gray-100 dark:border-slate-800 flex justify-around text-xs text-gray-500">
            <div><p className="font-bold text-gray-900 dark:text-white">{topThree[1]?.vulnCount ?? 0}</p><p>漏洞</p></div>
            <div><p className="font-bold text-gray-900 dark:text-white">#2</p><p>排名</p></div>
          </div>
        </div>

        <div className="order-1 lg:order-2 bg-gradient-to-b from-primary-600 to-primary-800 p-8 rounded-3xl shadow-xl shadow-primary-500/20 flex flex-col items-center text-center text-white transform scale-110 z-10">
          <Trophy className="w-12 h-12 text-amber-400 mb-4" />
          <div className="relative mb-4">
            <img src={avatarOf(topThree[0])} className="w-24 h-24 rounded-full border-4 border-white/20" alt="" />
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-amber-400 text-primary-900 w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 border-primary-600">1</div>
          </div>
          <h3 className="font-bold text-xl">{topThree[0].displayName}</h3>
          <p className="text-amber-300 font-bold mt-1">{topThree[0].points} 积分</p>
          <div className="mt-6 w-full pt-6 border-t border-white/10 flex justify-around text-sm">
            <div><p className="font-bold">{topThree[0].vulnCount}</p><p className="opacity-70">漏洞</p></div>
            <div><p className="font-bold">#1</p><p className="opacity-70">排名</p></div>
          </div>
        </div>

        <div className="order-3 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col items-center text-center">
          <div className="relative mb-4">
            <img src={topThree[2] ? avatarOf(topThree[2]) : avatarOf(topThree[0])} className="w-20 h-20 rounded-full border-4 border-gray-100 dark:border-slate-800" alt="" />
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-orange-400 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold border-4 border-white dark:border-slate-900">3</div>
          </div>
          <h3 className="font-bold text-gray-900 dark:text-white">{topThree[2]?.displayName || '-'}</h3>
          <p className="text-amber-600 font-bold text-sm mt-1">{topThree[2]?.points ?? 0} 积分</p>
          <div className="mt-4 w-full pt-4 border-t border-gray-100 dark:border-slate-800 flex justify-around text-xs text-gray-500">
            <div><p className="font-bold text-gray-900 dark:text-white">{topThree[2]?.vulnCount ?? 0}</p><p>漏洞</p></div>
            <div><p className="font-bold text-gray-900 dark:text-white">#3</p><p>排名</p></div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 dark:text-white">完整排名</h3>
          <span className="text-xs text-gray-500">不展示邮箱、认证码、真实账号标识</span>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-slate-800">
          {rest.map(leader => (
            <div key={leader.rank} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center gap-4">
                <span className="w-6 text-center font-bold text-gray-400">{leader.rank}</span>
                <img src={avatarOf(leader)} className="w-10 h-10 rounded-full" alt="" />
                <span className="font-bold text-gray-900 dark:text-white">
                  {leader.displayName}
                  {leader.isMe ? <span className="ml-2 text-xs text-primary-600">(我)</span> : null}
                </span>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{leader.points}</p>
                  <p className="text-[10px] text-gray-500 uppercase">积分</p>
                </div>
                <div className="text-right w-16">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{leader.vulnCount}</p>
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
