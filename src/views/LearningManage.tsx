import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, FileText, FlaskConical, Plus, Save, Trash2, X } from 'lucide-react';
import { getApiErrorMessage } from '../utils/apiError';
import ConfirmModal from '../components/ConfirmModal';

type LabItem = {
  id: string;
  title: string;
  description: string;
  difficulty: '简单' | '中等' | '困难' | string;
  category: string;
  points: number;
  url: string;
  image: string;
};

type MaterialItem = {
  id: string;
  title: string;
  author: string;
  date: string;
  type: string;
  url: string;
  image: string;
  description: string;
};

type ToastState = {
  type: 'success' | 'error';
  message: string;
} | null;

type ConfirmState = {
  kind: 'lab' | 'material';
  id: string;
  title: string;
} | null;

const EMPTY_LAB: Omit<LabItem, 'id'> = {
  title: '',
  description: '',
  difficulty: '简单',
  category: 'Web安全',
  points: 50,
  url: '',
  image: '',
};

const EMPTY_MATERIAL: Omit<MaterialItem, 'id' | 'date'> = {
  title: '',
  author: 'admin',
  type: '技术文档',
  url: '',
  image: '',
  description: '',
};

const POINTS_BY_DIFFICULTY: Record<string, number> = {
  简单: 50,
  中等: 100,
  困难: 300,
};
const DEFAULT_LAB_CATEGORIES = ['Web安全', '二进制', '逆向分析', '密码学', '取证分析', '其他'] as const;
const DEFAULT_MATERIAL_TYPES = ['技术文档', '视频教程', '工具插件', '实战案例', '其他'] as const;

const inputCls =
  'w-full px-3 py-2 text-sm bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl dark:text-white';
const btnPrimaryCls =
  'inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-bold rounded-xl bg-primary-600 hover:bg-primary-700 text-white';
const btnMutedCls =
  'inline-flex items-center justify-center px-3 py-2 text-sm font-bold rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300';
const btnDangerCls =
  'inline-flex items-center justify-center px-3 py-2 text-sm font-bold rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600';

export default function LearningManage() {
  const [activeTab, setActiveTab] = useState<'labs' | 'materials'>('labs');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [labs, setLabs] = useState<LabItem[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);

  const [editingLabId, setEditingLabId] = useState<string | null>(null);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [showLabModal, setShowLabModal] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [materialFileLabel, setMaterialFileLabel] = useState('');
  const [materialImageLabel, setMaterialImageLabel] = useState('');
  const [materialSource, setMaterialSource] = useState<'url' | 'file'>('url');

  const [labForm, setLabForm] = useState(EMPTY_LAB);
  const [materialForm, setMaterialForm] = useState(EMPTY_MATERIAL);
  const [toast, setToast] = useState<ToastState>(null);
  const [confirmTarget, setConfirmTarget] = useState<ConfirmState>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 2200);
  };

  const parseMessage = (data: unknown, fallback: string, status?: number) =>
    getApiErrorMessage(data, fallback, status);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [labsRes, materialsRes] = await Promise.all([
        fetch('/api/learning/labs'),
        fetch('/api/learning/materials'),
      ]);
      const [labsData, materialsData] = await Promise.all([
        labsRes.json(),
        materialsRes.json(),
      ]);
      setLabs(Array.isArray(labsData) ? labsData : []);
      setMaterials(Array.isArray(materialsData) ? materialsData : []);
    } catch (error) {
      console.error('Failed to fetch learning management data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredLabs = useMemo(
    () => labs.filter((l) => `${l.title} ${l.category}`.toLowerCase().includes(search.toLowerCase())),
    [labs, search],
  );

  const filteredMaterials = useMemo(
    () => materials.filter((m) => `${m.title} ${m.type} ${m.author}`.toLowerCase().includes(search.toLowerCase())),
    [materials, search],
  );
  const labCategories = useMemo(
    () => Array.from(new Set([...DEFAULT_LAB_CATEGORIES, ...labs.map((l) => l.category).filter(Boolean)])),
    [labs],
  );
  const materialTypes = useMemo(
    () => Array.from(new Set([...DEFAULT_MATERIAL_TYPES, ...materials.map((m) => m.type).filter(Boolean)])),
    [materials],
  );

  const submitLab = async () => {
    if (!labForm.title.trim()) {
      showToast('error', '请填写靶场标题');
      return;
    }
    if (!labForm.description.trim()) {
      showToast('error', '请填写靶场描述');
      return;
    }
    if (!labForm.url.trim()) {
      showToast('error', '请填写靶场 URL');
      return;
    }

    const url = editingLabId ? `/api/learning/labs/${editingLabId}` : '/api/learning/labs';
    const method = editingLabId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(labForm),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      showToast('error', parseMessage(data, '靶场保存失败', res.status));
      return;
    }

    setLabForm(EMPTY_LAB);
    setEditingLabId(null);
    setShowLabModal(false);
    showToast('success', editingLabId ? '靶场更新成功' : '靶场创建成功');
    await fetchData();
  };

  const openAddLabModal = () => {
    setEditingLabId(null);
    setLabForm(EMPTY_LAB);
    setShowLabModal(true);
  };

  const openEditLabModal = (lab: LabItem) => {
    setEditingLabId(lab.id);
    setLabForm({
      title: lab.title,
      description: lab.description,
      difficulty: lab.difficulty,
      category: lab.category,
      points: lab.points,
      url: lab.url,
      image: lab.image,
    });
    setShowLabModal(true);
  };

  const handleLabImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setLabForm((prev) => ({ ...prev, image: String(reader.result || '') }));
    };
    reader.readAsDataURL(file);
  };

  const handleLabDifficultyChange = (difficulty: string) => {
    setLabForm((prev) => ({
      ...prev,
      difficulty,
      points: POINTS_BY_DIFFICULTY[difficulty] ?? prev.points,
    }));
  };

  const submitMaterial = async () => {
    if (!materialForm.title.trim()) {
      showToast('error', '请填写资料标题');
      return;
    }
    if (!materialForm.author.trim()) {
      showToast('error', '请填写资料作者');
      return;
    }
    if (!materialForm.type.trim()) {
      showToast('error', '请填写资料类型');
      return;
    }
    if (!materialForm.url.trim()) {
      showToast('error', '请填写资料链接或上传本地文件');
      return;
    }

    const url = editingMaterialId ? `/api/learning/materials/${editingMaterialId}` : '/api/learning/materials';
    const method = editingMaterialId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(materialForm),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      showToast('error', parseMessage(data, '资料保存失败', res.status));
      return;
    }

    setMaterialForm(EMPTY_MATERIAL);
    setEditingMaterialId(null);
    setMaterialFileLabel('');
    setMaterialImageLabel('');
    setShowMaterialModal(false);
    showToast('success', editingMaterialId ? '资料更新成功' : '资料创建成功');
    await fetchData();
  };

  const openAddMaterialModal = () => {
    setEditingMaterialId(null);
    setMaterialForm(EMPTY_MATERIAL);
    setMaterialFileLabel('');
    setMaterialImageLabel('');
    setMaterialSource('url');
    setShowMaterialModal(true);
  };

  const openEditMaterialModal = (material: MaterialItem) => {
    setEditingMaterialId(material.id);
    setMaterialForm({
      title: material.title,
      author: material.author,
      type: material.type,
      url: material.url,
      image: material.image,
      description: material.description,
    });
    const isFileDataUrl = typeof material.url === 'string' && material.url.startsWith('data:');
    setMaterialSource(isFileDataUrl ? 'file' : 'url');
    setMaterialFileLabel(isFileDataUrl ? '已上传文件' : '');
    setMaterialImageLabel(material.image ? '已上传封面图' : '');
    setShowMaterialModal(true);
  };

  const handleMaterialFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setMaterialForm((prev) => ({ ...prev, url: String(reader.result || '') }));
      setMaterialFileLabel(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleMaterialImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setMaterialForm((prev) => ({ ...prev, image: String(reader.result || '') }));
      setMaterialImageLabel(file.name);
    };
    reader.readAsDataURL(file);
  };

  const archiveLab = async (id: string) => {
    const res = await fetch(`/api/learning/labs/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok || !data.success) {
      showToast('error', parseMessage(data, '删除靶场失败', res.status));
      return;
    }
    showToast('success', '靶场已归档');
    await fetchData();
  };

  const archiveMaterial = async (id: string) => {
    const res = await fetch(`/api/learning/materials/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok || !data.success) {
      showToast('error', parseMessage(data, '删除资料失败', res.status));
      return;
    }
    showToast('success', '资料已归档');
    await fetchData();
  };

  const confirmArchive = async () => {
    if (!confirmTarget) return;
    const target = confirmTarget;
    setConfirmTarget(null);
    if (target.kind === 'lab') await archiveLab(target.id);
    if (target.kind === 'material') await archiveMaterial(target.id);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary-600" />
            学习中心管理
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">统一管理靶场与学习资料</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('labs')}
            className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'labs' ? 'bg-white dark:bg-slate-700 text-primary-600' : 'text-gray-500'}`}
          >
            靶场
          </button>
          <button
            onClick={() => setActiveTab('materials')}
            className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'materials' ? 'bg-white dark:bg-slate-700 text-primary-600' : 'text-gray-500'}`}
          >
            资料
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索标题/分类/作者..."
          className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl dark:text-white"
        />
      </div>

      {loading ? (
        <div className="h-40 rounded-2xl bg-gray-100 dark:bg-slate-800 animate-pulse" />
      ) : (
        <>
          {activeTab === 'labs' && (
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-primary-600" />
                  靶场列表
                </h3>
                <button onClick={openAddLabModal} className={btnPrimaryCls}>
                  <Plus className="w-4 h-4" />
                  新增靶场
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead><tr className="bg-gray-50 dark:bg-slate-800/60 text-xs uppercase text-gray-500"><th className="px-4 py-3">标题</th><th className="px-4 py-3">难度</th><th className="px-4 py-3">分类</th><th className="px-4 py-3">积分</th><th className="px-4 py-3">地址</th><th className="px-4 py-3">操作</th></tr></thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {filteredLabs.map((l) => (
                      <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 text-sm font-semibold dark:text-white">{l.title}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{l.difficulty}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{l.category}</td>
                        <td className="px-4 py-3 text-sm text-amber-600 font-bold">{l.points}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 max-w-52 truncate">{l.url}</td>
                        <td className="px-4 py-3 text-sm flex gap-2">
                          <button onClick={() => openEditLabModal(l)} className={btnMutedCls}>编辑</button>
                          <button onClick={() => setConfirmTarget({ kind: 'lab', id: l.id, title: l.title })} className={btnDangerCls}><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                    {filteredLabs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500 dark:text-slate-400">
                          暂无匹配靶场，请调整搜索条件或新增靶场。
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'materials' && (
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary-600" />
                  资料列表
                </h3>
                <button onClick={openAddMaterialModal} className={btnPrimaryCls}>
                  <Plus className="w-4 h-4" />
                  新增资料
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead><tr className="bg-gray-50 dark:bg-slate-800/60 text-xs uppercase text-gray-500"><th className="px-4 py-3">标题</th><th className="px-4 py-3">作者</th><th className="px-4 py-3">类型</th><th className="px-4 py-3">封面</th><th className="px-4 py-3">资源</th><th className="px-4 py-3">操作</th></tr></thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {filteredMaterials.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 text-sm font-semibold dark:text-white">{m.title}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{m.author}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{m.type}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{m.image ? '已上传' : '未上传'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {m.url ? (m.url.startsWith('data:') ? '本地文件' : '外部链接') : '未设置'}
                        </td>
                        <td className="px-4 py-3 text-sm flex gap-2">
                          <button onClick={() => openEditMaterialModal(m)} className={btnMutedCls}>编辑</button>
                          <button onClick={() => setConfirmTarget({ kind: 'material', id: m.id, title: m.title })} className={btnDangerCls}><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                    {filteredMaterials.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500 dark:text-slate-400">
                          暂无匹配资料，请调整搜索条件或新增资料。
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </>
      )}

      {toast && (
        <div className={`fixed right-6 top-20 z-50 rounded-xl px-4 py-3 text-sm font-bold shadow-xl ${
          toast.type === 'success'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {toast.message}
        </div>
      )}

      {showLabModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-2xl">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-primary-600" />
                {editingLabId ? '修改靶场' : '新增靶场'}
              </h3>
              <button
                onClick={() => setShowLabModal(false)}
                className="p-1.5 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <input
                className={inputCls}
                placeholder="靶场名称"
                value={labForm.title}
                onChange={(e) => setLabForm({ ...labForm, title: e.target.value })}
              />
              <textarea
                className={`${inputCls} min-h-24`}
                placeholder="靶场介绍"
                value={labForm.description}
                onChange={(e) => setLabForm({ ...labForm, description: e.target.value })}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select
                  className={inputCls}
                  value={labForm.difficulty}
                  onChange={(e) => handleLabDifficultyChange(e.target.value)}
                >
                  <option value="简单">简单（默认 50）</option>
                  <option value="中等">中等（默认 100）</option>
                  <option value="困难">困难（默认 300）</option>
                </select>
                <input
                  className={inputCls}
                  type="number"
                  placeholder="积分"
                  value={labForm.points}
                  onChange={(e) => setLabForm({ ...labForm, points: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <input
                    className={inputCls}
                    placeholder="靶场地址"
                    value={labForm.url}
                    onChange={(e) => setLabForm({ ...labForm, url: e.target.value })}
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">请填写完整靶场网址（需包含 http:// 或 https://）。</p>
                </div>
                <select
                  className={inputCls}
                  value={labForm.category}
                  onChange={(e) => setLabForm({ ...labForm, category: e.target.value })}
                >
                  {labCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div className="border border-dashed border-gray-300 dark:border-slate-700 rounded-xl p-3 space-y-3">
                <div className="flex items-center gap-4">
                  {labForm.image && (
                    <img
                      src={labForm.image}
                      alt="靶场预览"
                      className="w-16 h-16 rounded-xl object-cover border border-gray-200 dark:border-slate-700"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <label className="flex-grow flex flex-col items-center justify-center px-4 py-6 bg-gray-50 dark:bg-slate-800 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:border-primary-500 transition-all">
                    <Plus className="w-6 h-6 text-gray-400 mb-1" />
                    <span className="text-xs text-gray-500">{labForm.image ? '更换图片' : '上传本地图片'}</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleLabImageUpload} />
                  </label>
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-2">
              <button onClick={() => setShowLabModal(false)} className={btnMutedCls}>取消</button>
              <button onClick={submitLab} className={btnPrimaryCls}>
                <Save className="w-4 h-4" />
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {showMaterialModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-2xl">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary-600" />
                {editingMaterialId ? '修改资料' : '新增资料'}
              </h3>
              <button
                onClick={() => setShowMaterialModal(false)}
                className="p-1.5 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <input
                className={inputCls}
                placeholder="资料标题"
                value={materialForm.title}
                onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  className={inputCls}
                  placeholder="作者"
                  value={materialForm.author}
                  onChange={(e) => setMaterialForm({ ...materialForm, author: e.target.value })}
                />
                <select
                  className={inputCls}
                  value={materialForm.type}
                  onChange={(e) => setMaterialForm({ ...materialForm, type: e.target.value })}
                >
                  {materialTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="flex items-center gap-4 mb-3">
                  <button
                    type="button"
                    onClick={() => setMaterialSource('url')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      materialSource === 'url'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300'
                    }`}
                  >
                    使用 URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setMaterialSource('file')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      materialSource === 'file'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300'
                    }`}
                  >
                    本地上传
                  </button>
                </div>
                {materialSource === 'url' ? (
                  <>
                    <input
                      className={inputCls}
                      placeholder="资料地址（URL）"
                      value={materialForm.url}
                      onChange={(e) => setMaterialForm({ ...materialForm, url: e.target.value })}
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                      请填写完整资料地址（需包含 http:// 或 https://）。
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-4">
                      <label className="flex-grow flex flex-col items-center justify-center px-4 py-6 bg-gray-50 dark:bg-slate-800 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:border-primary-500 transition-all">
                        <Plus className="w-6 h-6 text-gray-400 mb-1" />
                        <span className="text-xs text-gray-500">{materialFileLabel || '上传资料文件（本地）'}</span>
                        <input type="file" className="hidden" onChange={handleMaterialFileUpload} />
                      </label>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">支持本地文件上传后保存到资料链接字段。</p>
                  </>
                )}
              </div>
              <div>
                <div className="flex items-center gap-4">
                  {materialForm.image && (
                    <img
                      src={materialForm.image}
                      alt="资料封面预览"
                      className="w-16 h-16 rounded-xl object-cover border border-gray-200 dark:border-slate-700"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <label className="flex-grow flex flex-col items-center justify-center px-4 py-6 bg-gray-50 dark:bg-slate-800 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:border-primary-500 transition-all">
                    <Plus className="w-6 h-6 text-gray-400 mb-1" />
                    <span className="text-xs text-gray-500">{materialImageLabel || '上传资料封面图（用于用户端展示）'}</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleMaterialImageUpload} />
                  </label>
                </div>
              </div>
              <textarea
                className={`${inputCls} min-h-24`}
                placeholder="资料介绍"
                value={materialForm.description}
                onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })}
              />
            </div>
            <div className="px-5 py-4 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-2">
              <button onClick={() => setShowMaterialModal(false)} className={btnMutedCls}>取消</button>
              <button onClick={submitMaterial} className={btnPrimaryCls}>
                <Save className="w-4 h-4" />
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmTarget}
        title="确认归档"
        description="归档后将不再出现在列表中，请确认是否继续。"
        highlightText={confirmTarget ? `「${confirmTarget.title}」` : ''}
        confirmText="确认归档"
        danger
        onCancel={() => setConfirmTarget(null)}
        onConfirm={confirmArchive}
      />
    </div>
  );
}
