import React, { useState, useEffect } from 'react';
import { Megaphone, Search, Calendar, User as UserIcon, ChevronRight, Bell, Pin, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Announcement {
  id: number;
  title: string;
  content: string;
  date: string;
  author: string;
  type: string;
  isPinned: boolean;
}

export default function UserNotices() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch('/api/announcements');
      const data = await res.json();
      // Sort: Pinned first, then by date descending
      const sorted = data.sort((a: Announcement, b: Announcement) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      setAnnouncements(sorted);
    } catch (err) {
      console.error('Failed to fetch announcements:', err);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const filteredAnnouncements = announcements.filter(a => 
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary-600" />
            平台公告
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            了解平台最新动态、规则变更及安全资讯
          </p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="搜索公告..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredAnnouncements.map((announcement, index) => (
            <motion.div 
              key={announcement.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => setSelectedAnnouncement(announcement)}
              className={`group cursor-pointer bg-white dark:bg-slate-900 p-5 rounded-2xl border transition-all hover:shadow-md ${
                announcement.isPinned 
                  ? 'border-primary-200 dark:border-primary-900/40 bg-primary-50/30 dark:bg-primary-900/5' 
                  : 'border-gray-100 dark:border-slate-800'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl shrink-0 ${
                  announcement.isPinned 
                    ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-600' 
                    : 'bg-gray-50 dark:bg-slate-800 text-gray-400'
                }`}>
                  {announcement.isPinned ? <Pin className="w-5 h-5 fill-current" /> : <Megaphone className="w-5 h-5" />}
                </div>
                
                <div className="flex-grow space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {announcement.isPinned && (
                      <span className="px-2 py-0.5 bg-primary-600 text-white text-[10px] font-bold rounded uppercase tracking-wider">
                        置顶
                      </span>
                    )}
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 text-[10px] font-bold rounded uppercase">
                      {announcement.type || '常规'}
                    </span>
                    <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors line-clamp-1">
                      {announcement.title}
                    </h3>
                  </div>
                  
                  <p className="text-sm text-gray-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {announcement.content}
                  </p>
                  
                  <div className="flex items-center gap-4 pt-2 text-[10px] text-gray-400 font-medium">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {announcement.date}</span>
                    <span className="flex items-center gap-1"><UserIcon className="w-3 h-3" /> {announcement.author}</span>
                  </div>
                </div>

                <div className="self-center">
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500 transition-colors" />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedAnnouncement && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-slate-800"
            >
              <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-600 rounded-xl text-white">
                    <Info className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">公告详情</h3>
                </div>
                <button onClick={() => setSelectedAnnouncement(null)} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    {selectedAnnouncement.isPinned && (
                      <span className="px-2 py-0.5 bg-primary-600 text-white text-[10px] font-bold rounded">置顶</span>
                    )}
                    <span className="px-2 py-0.5 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 text-[10px] font-bold rounded">
                      {selectedAnnouncement.type || '常规'}
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                    {selectedAnnouncement.title}
                  </h1>
                  <div className="flex items-center gap-4 text-xs text-gray-400 border-b border-gray-50 dark:border-slate-800 pb-4">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {selectedAnnouncement.date}</span>
                    <span className="flex items-center gap-1"><UserIcon className="w-3.5 h-3.5" /> 发布者: {selectedAnnouncement.author}</span>
                  </div>
                </div>

                <div className="text-gray-600 dark:text-slate-300 leading-relaxed text-base"
                  // 支持富文本格式的公告内容
                  dangerouslySetInnerHTML={{ __html: selectedAnnouncement.content }}
                />
              </div>

              <div className="p-6 bg-gray-50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-800">
                <button 
                  onClick={() => setSelectedAnnouncement(null)}
                  className="w-full py-3 bg-primary-600 text-white font-bold rounded-2xl shadow-lg shadow-primary-600/20 hover:bg-primary-700 transition-all"
                >
                  我知道了
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
