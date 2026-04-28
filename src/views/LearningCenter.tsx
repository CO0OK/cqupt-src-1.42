import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, 
  Terminal, 
  Search, 
  Download, 
  ExternalLink, 
  Clock, 
  User as UserIcon,
  X,
  Play,
  Info,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Lab, Material, User } from '../types';

// --- Constants & Helpers ---

const MATERIAL_STYLES: Record<string, { icon: React.ReactNode; colorClass: string }> = {
  '技术文档': { icon: <FileText className="w-12 h-12" />, colorClass: 'bg-rose-100 text-rose-600 dark:bg-rose-900/40' },
  '视频教程': { icon: <Play className="w-12 h-12" />, colorClass: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40' },
  '工具插件': { icon: <Download className="w-12 h-12" />, colorClass: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40' },
  '实战案例': { icon: <BookOpen className="w-12 h-12" />, colorClass: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40' },
  'default': { icon: <Info className="w-12 h-12" />, colorClass: 'bg-gray-100 text-gray-600 dark:bg-slate-800' }
};

const DIFFICULTY_STYLES: Record<string, string> = {
  '简单': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  '中等': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  '困难': 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
};

// --- Sub-components ---

const LabCard = ({ lab, onClick }: { lab: Lab; onClick: () => void }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    onClick={onClick}
    className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer group"
  >
    <div className="aspect-video relative overflow-hidden">
      <img 
        src={lab.image} 
        alt={lab.title} 
        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
        <span className="text-white text-xs font-bold flex items-center gap-1">
          <Info className="w-3 h-3" /> 点击查看详情
        </span>
      </div>
      <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-black/45 backdrop-blur-md text-white text-[10px] font-bold">
        {lab.category}
      </div>
      <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-amber-400/95 text-amber-900 text-[10px] font-extrabold">
        {lab.points} 积分
      </div>
    </div>
    <div className="p-5">
      <div className="flex items-center justify-between mb-2 gap-2">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${DIFFICULTY_STYLES[lab.difficulty] || DIFFICULTY_STYLES['简单']}`}>
          {lab.difficulty}
        </span>
        <span className="text-[11px] text-gray-500 dark:text-slate-400 line-clamp-1">{lab.category}</span>
      </div>
      <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors">{lab.title}</h4>
      <p className="text-xs text-gray-500 dark:text-slate-400 mt-2 line-clamp-2">{lab.description}</p>
      <button className="mt-4 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 text-xs font-bold">
        <Terminal className="w-3.5 h-3.5" />
        查看并进入
      </button>
    </div>
  </motion.div>
);

const MaterialCard = ({ material }: { material: Material }) => {
  const style = MATERIAL_STYLES[material.type] || MATERIAL_STYLES['default'];
  const handleDownload = () => {
    if (!material.url) return;
    if (material.url.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = material.url;
      link.download = material.title || 'learning-material';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    window.open(material.url, '_blank');
  };
  
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl transition-all group"
    >
      <div className="aspect-video relative overflow-hidden bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
        {material.image ? (
          <img
            src={material.image}
            alt={material.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className={`p-6 rounded-2xl ${style.colorClass}`}>
            {style.icon}
          </div>
        )}
        <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider">
          {material.type}
        </div>
      </div>
      <div className="p-5">
        <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors line-clamp-1">{material.title}</h4>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-2 line-clamp-2">{material.description}</p>
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2 text-[10px] text-gray-500">
            <span className="flex items-center gap-1"><UserIcon className="w-3 h-3" /> {material.author}</span>
          </div>
          <button
            onClick={handleDownload}
            disabled={!material.url}
            className="flex items-center gap-1 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-lg text-xs font-bold hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-all disabled:opacity-50"
          >
            <Download className="w-3 h-3" /> 下载
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const LabDetailModal = ({ lab, onClose }: { lab: Lab; onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
    <motion.div 
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-slate-800 flex flex-col md:flex-row"
    >
      <div className="md:w-1/2 aspect-video md:aspect-auto relative">
        <img 
          src={lab.image} 
          alt={lab.title} 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-6 left-6 text-white">
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">{lab.category}</span>
          <h3 className="text-2xl font-bold mt-1">{lab.title}</h3>
        </div>
      </div>
      
      <div className="md:w-1/2 p-8 flex flex-col">
        <div className="flex justify-between items-start mb-6">
          <div className="flex gap-2 items-center">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${DIFFICULTY_STYLES[lab.difficulty] || DIFFICULTY_STYLES['简单']}`}>
              {lab.difficulty}
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 font-bold">
              {lab.points} 积分
            </span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="flex-grow space-y-4">
          <div>
            <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">靶场简介</h5>
            <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
              {lab.description}
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800">
              <p className="text-[10px] text-gray-500 uppercase">完成人数</p>
              <p className="text-sm font-bold dark:text-white">1,240+</p>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800">
              <p className="text-[10px] text-gray-500 uppercase">平均耗时</p>
              <p className="text-sm font-bold dark:text-white">45 分钟</p>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <button 
            onClick={() => window.open(lab.url, '_blank')}
            className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-lg shadow-primary-600/20 hover:shadow-primary-600/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Terminal className="w-5 h-5" /> 启动在线靶场
          </button>
        </div>
      </div>
    </motion.div>
  </div>
);

// --- Main Component ---

export default function LearningCenter({ user }: { user: User }) {
  const [activeSubTab, setActiveSubTab] = useState<'downloads' | 'labs'>('labs');
  const [labs, setLabs] = useState<Lab[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedLab, setSelectedLab] = useState<Lab | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedLabCategory, setSelectedLabCategory] = useState<string>('All');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [labsRes, materialsRes] = await Promise.all([
          fetch('/api/learning/labs'),
          fetch('/api/learning/materials')
        ]);
        
        const [labsData, materialsData] = await Promise.all([
          labsRes.json(),
          materialsRes.json()
        ]);
        
        setLabs(labsData);
        setMaterials(materialsData);
      } catch (error) {
        console.error('Failed to fetch learning center data:', error);
      }
    };
    fetchData();
  }, []);

  const filteredLabs = useMemo(() => 
    labs.filter(lab => 
      (selectedLabCategory === 'All' || lab.category === selectedLabCategory) &&
      (lab.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
       lab.category.toLowerCase().includes(searchTerm.toLowerCase()))
    ), [labs, selectedLabCategory, searchTerm]
  );

  const filteredMaterials = useMemo(() => 
    materials.filter(m => 
      (selectedType === 'All' || m.type === selectedType) &&
      m.title.toLowerCase().includes(searchTerm.toLowerCase())
    ), [materials, selectedType, searchTerm]
  );

  const materialTypes = useMemo(() => ['All', '技术文档', '工具插件', '实战案例', '视频教程', '其他'], []);
  const labCategories = useMemo(() => ['All', ...Array.from(new Set(labs.map(lab => lab.category))).filter(c => c !== '其他'), '其他'], [labs]);

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedLabCategory('All');
    setSelectedType('All');
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">学习中心</h2>
          <p className="text-gray-500 dark:text-slate-400 mt-2">提升技能，实战演练，交流心得</p>
        </div>
        
        <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
          {(['labs', 'downloads'] as const).map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                activeSubTab === tab 
                  ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-slate-300'
              }`}
            >
              {tab === 'labs' ? '靶场练习' : '下载中心'}
            </button>
          ))}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 max-w-md group">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary-600 transition-colors">
            <Search className="w-4 h-4" />
          </div>
          <input 
            type="text" 
            placeholder={activeSubTab === 'labs' ? "搜索靶场..." : "搜索资源..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white"
          />
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          <div className="flex items-center bg-gray-100 dark:bg-slate-800 p-1 rounded-xl whitespace-nowrap">
            {(activeSubTab === 'labs' ? labCategories : materialTypes).map(type => (
              <button
                key={type}
                onClick={() => activeSubTab === 'labs' ? setSelectedLabCategory(type) : setSelectedType(type)}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  (activeSubTab === 'labs' ? selectedLabCategory === type : selectedType === type)
                    ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-slate-300'
                }`}
              >
                {type === 'All' ? (activeSubTab === 'labs' ? '全部靶场' : '全部资源') : type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            {activeSubTab === 'labs' ? (
              <>
                <Terminal className="w-5 h-5 text-primary-600" /> 靶场列表
                <span className="text-xs font-normal text-gray-500 ml-2">({filteredLabs.length} 个靶场)</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5 text-primary-600" /> 资源列表
                <span className="text-xs font-normal text-gray-500 ml-2">({filteredMaterials.length} 个资源)</span>
              </>
            )}
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {activeSubTab === 'labs' ? (
            filteredLabs.length > 0 ? (
              filteredLabs.map(lab => (
                <LabCard key={lab.id} lab={lab} onClick={() => setSelectedLab(lab)} />
              ))
            ) : (
              <EmptyState message="未找到相关靶场" onReset={resetFilters} />
            )
          ) : (
            filteredMaterials.length > 0 ? (
              filteredMaterials.map(m => (
                <MaterialCard key={m.id} material={m} />
              ))
            ) : (
              <EmptyState message="未找到相关资源" onReset={resetFilters} />
            )
          )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {selectedLab && (
          <LabDetailModal lab={selectedLab} onClose={() => setSelectedLab(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Helper Components ---

const EmptyState = ({ message, onReset }: { message: string; onReset: () => void }) => (
  <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800">
    <div className="bg-gray-50 dark:bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
      <Search className="w-8 h-8 text-gray-300" />
    </div>
    <p className="text-gray-500 dark:text-slate-400">{message}</p>
    <button onClick={onReset} className="mt-4 text-primary-600 font-bold text-sm hover:underline">重置筛选条件</button>
  </div>
);
