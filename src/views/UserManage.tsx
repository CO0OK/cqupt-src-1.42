import React, { useState, useEffect, useMemo } from 'react';
import { User } from '../types';
import { Search, UserPlus, Shield, Lock, Edit2, Trash2, X, CheckCircle, AlertCircle, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getApiErrorMessage } from '../utils/apiError';
import ConfirmModal from '../components/ConfirmModal';
import { PASSWORD_POLICY_HINT, validatePasswordPolicyText } from '../utils/passwordPolicy';

export default function UserManage() {
  type Notice = { type: 'success' | 'error'; message: string } | null;
  type ConfirmAction =
    | { kind: 'add_user' }
    | { kind: 'update_user' }
    | { kind: 'reset_password'; username: string }
    | null;
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [simpleFilter, setSimpleFilter] = useState('all'); // all, admin, user
  const [advancedFilters, setAdvancedFilters] = useState({
    role: '全部',
    status: '全部',
    startDate: '',
    endDate: ''
  });
  const [sortBy, setSortBy] = useState('username');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    role: 'user' as User['role'],
    authCode: '',
    points: 0,
    status: 'Active' as User['status']
  });

  const parseError = async (res: Response, fallback: string) => {
    let data: unknown = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }
    return getApiErrorMessage(data, fallback, res.status);
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (!res.ok) {
        setNotice({ type: 'error', message: await parseError(res, '获取用户列表失败') });
        return;
      }
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setNotice({ type: 'error', message: '网络异常，获取用户列表失败' });
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const submitAddUser = async () => {
    if (!/^\d{7}$/.test(newUser.authCode.trim())) {
      setNotice({ type: 'error', message: '统一认证码需为7位数字' });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      if (!res.ok) {
        setNotice({ type: 'error', message: await parseError(res, '新增用户失败') });
        return;
      }
      const data = await res.json().catch(() => ({}));
      await fetchUsers();
      setShowAddModal(false);
      const initialPassword = typeof data?.initialPassword === 'string' ? data.initialPassword : '';
      setNotice({
        type: 'success',
        message: initialPassword
          ? `用户 ${newUser.username} 新增成功，初始密码：${initialPassword}`
          : `用户 ${newUser.username} 新增成功`,
      });
      setNewUser({
        username: '',
        email: '',
        role: 'user',
        authCode: '',
        points: 0,
        status: 'Active'
      });
    } catch (err) {
      console.error(err);
      setNotice({ type: 'error', message: '网络异常，新增用户失败' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmAction({ kind: 'add_user' });
  };

  const submitUpdateUser = async () => {
    if (!selectedUser) return;
    if (!/^\d{7}$/.test(selectedUser.authCode.trim())) {
      setNotice({ type: 'error', message: '统一认证码需为7位数字' });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: selectedUser.email,
          authCode: selectedUser.authCode,
          points: Math.max(0, Number(selectedUser.points) || 0),
          status: selectedUser.status
        })
      });
      if (!res.ok) {
        setNotice({ type: 'error', message: await parseError(res, '更新用户失败') });
        return;
      }
      await fetchUsers();
      setShowEditModal(false);
      setNotice({ type: 'success', message: `用户 ${selectedUser.username} 信息已更新` });
    } catch (err) {
      console.error(err);
      setNotice({ type: 'error', message: '网络异常，更新用户失败' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmAction({ kind: 'update_user' });
  };

  const submitResetPassword = async () => {
    if (!selectedUser) return;
    const issue = validatePasswordPolicyText(newPassword);
    if (issue) {
      setNotice({ type: 'error', message: issue });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/users/${selectedUser.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword })
      });
      if (!res.ok) {
        setNotice({ type: 'error', message: await parseError(res, '密码重置失败') });
        return;
      }
      setNotice({
        type: 'success',
        message: `用户 ${selectedUser.username} 密码重置成功`,
      });
      setShowResetModal(false);
      setNewPassword('');
    } catch (err) {
      console.error(err);
      setNotice({ type: 'error', message: '网络异常，密码重置失败' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const result = users.filter(u => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        u.username.toLowerCase().includes(searchLower) || 
        u.authCode.toLowerCase().includes(searchLower) ||
        u.email.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;

      // Simple Filters
      if (simpleFilter === 'admin' && u.role !== 'admin') return false;
      if (simpleFilter === 'user' && u.role !== 'user') return false;

      // Advanced Filters
      const matchesRole = advancedFilters.role === '全部' || 
                         (advancedFilters.role === '管理员' && u.role === 'admin') ||
                         (advancedFilters.role === '审核员' && u.role === 'auditor') ||
                         (advancedFilters.role === '白帽子' && u.role === 'user');
      if (!matchesRole) return false;

      if (advancedFilters.status !== '全部' && u.status !== advancedFilters.status) return false;

      if (advancedFilters.startDate) {
        if (new Date(u.registrationDate) < new Date(advancedFilters.startDate)) return false;
      }
      if (advancedFilters.endDate) {
        if (new Date(u.registrationDate) > new Date(advancedFilters.endDate)) return false;
      }

      return true;
    });

    result.sort((a, b) => {
      if (sortBy === 'username') return a.username.localeCompare(b.username);
      if (sortBy === 'points_desc') return (b.points || 0) - (a.points || 0);
      if (sortBy === 'points_asc') return (a.points || 0) - (b.points || 0);
      if (sortBy === 'role') return a.role.localeCompare(b.role);
      if (sortBy === 'date_desc') return new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime();
      if (sortBy === 'date_asc') return new Date(a.registrationDate).getTime() - new Date(b.registrationDate).getTime();
      return 0;
    });

    return result;
  }, [users, searchTerm, simpleFilter, advancedFilters, sortBy]);

  return (
    <div className="space-y-6 animate-fade-in">
      {notice ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-medium flex items-center gap-2 ${notice.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}
        >
          {notice.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{notice.message}</span>
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">用户管理中心</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">管理白帽子及管理员账号权限</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-primary-500/20 active:scale-95 transition-all"
        >
          <UserPlus className="w-4 h-4" /> 新增用户
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-bold">总用户数</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{users.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-bold">活跃白帽</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{users.filter(u => u.role === 'user').length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-bold">待审核实名</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">12</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex flex-wrap items-center gap-4">
          <div className="relative flex-grow max-w-md min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="搜索用户名、统一认证码或邮箱..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all" 
            />
          </div>
          
          <div className="flex items-center bg-gray-100 dark:bg-slate-800 p-1 rounded-xl">
            <button 
              onClick={() => setSimpleFilter('all')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${simpleFilter === 'all' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              全部
            </button>
            <button 
              onClick={() => setSimpleFilter('admin')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${simpleFilter === 'admin' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              管理员
            </button>
            <button 
              onClick={() => setSimpleFilter('user')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${simpleFilter === 'user' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              白帽子
            </button>
          </div>

          <button 
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl border transition-all ${showAdvanced ? 'bg-primary-50 border-primary-200 text-primary-600' : 'border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
          >
            <Filter className="w-4 h-4 text-gray-400" />
            高级筛选
          </button>
        </div>

        <AnimatePresence>
          {showAdvanced && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50"
            >
              <div className="p-6 grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">角色类型</label>
                  <select 
                    value={advancedFilters.role}
                    onChange={(e) => setAdvancedFilters({...advancedFilters, role: e.target.value})}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
                  >
                    <option value="全部">全部角色</option>
                    <option value="管理员">管理员</option>
                    <option value="审核员">审核员</option>
                    <option value="白帽子">白帽子</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">账号状态</label>
                  <select 
                    value={advancedFilters.status}
                    onChange={(e) => setAdvancedFilters({...advancedFilters, status: e.target.value})}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
                  >
                    <option value="全部">全部状态</option>
                    <option value="Active">正常</option>
                    <option value="Banned">封禁</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">排序方式</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
                  >
                    <option value="username">用户名排序</option>
                    <option value="points_desc">积分降序</option>
                    <option value="points_asc">积分升序</option>
                    <option value="role">角色排序</option>
                    <option value="date_desc">注册时间降序</option>
                    <option value="date_asc">注册时间升序</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">注册起始日期</label>
                  <input 
                    type="date"
                    value={advancedFilters.startDate}
                    onChange={(e) => setAdvancedFilters({...advancedFilters, startDate: e.target.value})}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">注册截止日期</label>
                  <div className="flex gap-2">
                    <input 
                      type="date"
                      value={advancedFilters.endDate}
                      onChange={(e) => setAdvancedFilters({...advancedFilters, endDate: e.target.value})}
                      className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <button 
                      onClick={() => setAdvancedFilters({ role: '全部', status: '全部', startDate: '', endDate: '' })}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      title="重置筛选"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-slate-950 text-gray-500 dark:text-slate-400 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">用户头像</th>
                <th className="px-6 py-4">用户名</th>
                <th className="px-6 py-4">角色</th>
                <th className="px-6 py-4">统一认证码</th>
                <th className="px-6 py-4">积分</th>
                <th className="px-6 py-4">注册日期</th>
                <th className="px-6 py-4">账号状态</th>
                <th className="px-6 py-4">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <img src={u.avatar || `https://ui-avatars.com/api/?name=${u.username}&background=random`} className="w-10 h-10 rounded-full" alt="" />
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{u.username}</td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold uppercase text-primary-600 dark:text-primary-400">{u.role}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono">{u.authCode}</td>
                  <td className="px-6 py-4 text-sm font-bold text-amber-600">{u.points}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{u.registrationDate}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${u.status === 'Active' ? 'text-emerald-600' : 'text-red-600'}`}>
                      <span className={`w-2 h-2 rounded-full ${u.status === 'Active' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                      {u.status === 'Active' ? '正常' : '封禁'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => { setSelectedUser(u); setShowEditModal(true); }}
                        className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-400 hover:text-primary-600"
                        title="编辑用户"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => { setSelectedUser(u); setShowResetModal(true); }}
                        className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-400 hover:text-amber-600"
                        title="修改密码"
                      >
                        <Lock className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-200 dark:border-slate-800"
            >
              <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">新增用户</h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleAddUser} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">用户名</label>
                  <input 
                    type="text" 
                    required
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white outline-none" 
                    placeholder="输入用户名"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">角色</label>
                  <select 
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as User['role'] })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white outline-none"
                  >
                    <option value="user">白帽子 (User)</option>
                    <option value="auditor">审核员 (Auditor)</option>
                    <option value="admin">管理员 (Admin)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">电子邮箱</label>
                  <input 
                    type="email" 
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white outline-none" 
                    placeholder="example@email.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">统一认证码</label>
                  <input 
                    type="text" 
                    required
                    maxLength={7}
                    value={newUser.authCode}
                    onChange={(e) => setNewUser({ ...newUser, authCode: e.target.value.replace(/\D/g, '').slice(0, 7) })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white outline-none" 
                    placeholder="输入7位数字统一认证码"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">账号状态</label>
                  <select 
                    value={newUser.status}
                    onChange={(e) => setNewUser({ ...newUser, status: e.target.value as User['status'] })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white outline-none"
                  >
                    <option value="Active">正常 (Active)</option>
                    <option value="Banned">封禁 (Banned)</option>
                  </select>
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2 text-gray-600 dark:text-slate-400 font-bold">取消</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 py-2 bg-primary-600 text-white rounded-xl font-bold shadow-lg shadow-primary-500/20">
                    {isSubmitting ? '提交中...' : '确认新增'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {showEditModal && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-200 dark:border-slate-800"
            >
              <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">编辑用户信息</h3>
                <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">用户名</label>
                  <input type="text" disabled value={selectedUser.username} className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-gray-400 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">角色</label>
                  <select 
                    disabled
                    value={selectedUser.role}
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-slate-800/50 border-none rounded-xl text-gray-400 cursor-not-allowed outline-none"
                  >
                    <option value="user">白帽子 (User)</option>
                    <option value="auditor">审核员 (Auditor)</option>
                    <option value="admin">管理员 (Admin)</option>
                  </select>
                  <p className="text-[10px] text-amber-500 mt-1 font-medium">角色权限不可更改</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">电子邮箱</label>
                  <input 
                    type="email" 
                    value={selectedUser.email}
                    onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">统一认证码</label>
                  <input 
                    type="text" 
                    maxLength={7}
                    value={selectedUser.authCode}
                    onChange={(e) => setSelectedUser({ ...selectedUser, authCode: e.target.value.replace(/\D/g, '').slice(0, 7) })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">账号状态</label>
                  <select 
                    value={selectedUser.status}
                    onChange={(e) => setSelectedUser({ ...selectedUser, status: e.target.value as User['status'] })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white outline-none"
                  >
                    <option value="Active">正常 (Active)</option>
                    <option value="Banned">封禁 (Banned)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">积分</label>
                  <input
                    type="number"
                    min={0}
                    value={selectedUser.points}
                    onChange={(e) => setSelectedUser({ ...selectedUser, points: Math.max(0, Number(e.target.value) || 0) })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white outline-none"
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-2 text-gray-600 dark:text-slate-400 font-bold">取消</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 py-2 bg-primary-600 text-white rounded-xl font-bold shadow-lg shadow-primary-500/20">
                    {isSubmitting ? '保存中...' : '保存修改'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset Password Modal */}
      <AnimatePresence>
        {showResetModal && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden border border-gray-200 dark:border-slate-800"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">修改用户密码</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">正在为用户 <span className="font-bold text-primary-600">{selectedUser.username}</span> 修改登录密码</p>
                
                <div className="mt-6 space-y-4">
                  <input 
                    type="password" 
                    placeholder="请输入新密码" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white outline-none text-center"
                  />
                  <p className="text-xs text-amber-600 dark:text-amber-300 text-left">{PASSWORD_POLICY_HINT}</p>
                  <div className="flex gap-3">
                    <button onClick={() => setShowResetModal(false)} className="flex-1 py-2 text-gray-600 dark:text-slate-400 font-bold">取消</button>
                    <button
                      onClick={() => setConfirmAction({ kind: 'reset_password', username: selectedUser.username })}
                      disabled={isSubmitting}
                      className="flex-1 py-2 bg-amber-600 text-white rounded-xl font-bold shadow-lg shadow-amber-500/20"
                    >
                      {isSubmitting ? '处理中...' : '确认修改'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        open={!!confirmAction}
        title={
          confirmAction?.kind === 'add_user'
            ? '确认新增用户'
            : confirmAction?.kind === 'update_user'
              ? '确认保存用户修改'
              : '确认修改密码'
        }
        description={
          confirmAction?.kind === 'add_user'
            ? '提交后将创建新的平台账号，并初始化默认密码。'
            : confirmAction?.kind === 'update_user'
              ? '提交后将覆盖当前用户信息。'
              : '修改后用户将使用新密码登录，旧密码立即失效。'
        }
        highlightText={
          confirmAction?.kind === 'add_user'
            ? `${newUser.username} · ${newUser.role} · ${newUser.status}`
            : confirmAction?.kind === 'update_user'
              ? selectedUser
                ? `${selectedUser.username} · ${selectedUser.status}`
                : ''
              : confirmAction?.kind === 'reset_password'
                ? `${confirmAction.username} · 自定义新密码`
                : ''
        }
        confirmText={isSubmitting ? '处理中...' : '确认执行'}
        confirmDisabled={isSubmitting}
        onCancel={() => setConfirmAction(null)}
        onConfirm={async () => {
          if (!confirmAction) return;
          const action = confirmAction;
          setConfirmAction(null);
          if (action.kind === 'add_user') {
            await submitAddUser();
            return;
          }
          if (action.kind === 'update_user') {
            await submitUpdateUser();
            return;
          }
          await submitResetPassword();
        }}
      />
    </div>
  );
}
