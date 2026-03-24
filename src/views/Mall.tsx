import React, { useState, useEffect } from 'react';
import { User, Product, Redemption } from '../types';
import { ShoppingBag, Zap, Gift, ChevronRight, History, Package, Clock, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmModal from '../components/ConfirmModal';

interface MallProps {
  user: User;
  onUpdateUser: (user: User) => void;
}

export default function Mall({ user, onUpdateUser }: MallProps) {
  type Notice = { type: 'success' | 'error'; message: string } | null;
  const [activeTab, setActiveTab] = useState<'items' | 'my_redemptions'>('items');
  const [products, setProducts] = useState<Product[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState<Product | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const visibleProducts = products.filter((item) => item.status !== 'Inactive');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'items') {
        const res = await fetch('/api/mall/products');
        const data = await res.json();
        setProducts(data);
      } else {
        const res = await fetch(`/api/mall/redemptions?userId=${user.id}`);
        const data = await res.json();
        setRedemptions(data);
      }
    } catch (error) {
      console.error('Failed to fetch mall data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (product: Product) => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/mall/redemptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, productId: product.id }),
      });
      const data = await response.json();
      if (data.success) {
        onUpdateUser({ ...user, points: data.userPoints });
        setShowConfirmModal(null);
        setShowSuccessModal(true);
        setNotice({ type: 'success', message: `兑换成功：${product.name}` });
        fetchData();
      } else {
        setNotice({ type: 'error', message: data.message || '兑换失败' });
      }
    } catch (error) {
      console.error('Redemption error:', error);
      setNotice({ type: 'error', message: '网络错误，请稍后再试' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {notice ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-medium ${notice.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}
        >
          {notice.message}
        </div>
      ) : null}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">积分商城</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">使用您的漏洞积分兑换精美礼品</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('items')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'items' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <ShoppingBag className="w-4 h-4" />
              商品列表
            </button>
            <button 
              onClick={() => setActiveTab('my_redemptions')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'my_redemptions' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <History className="w-4 h-4" />
              我的兑换
            </button>
          </div>
          <div className="flex items-center gap-3 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/50 rounded-xl">
            <Zap className="w-5 h-5 text-amber-500" />
            <span className="font-bold text-amber-700 dark:text-amber-400">可用积分: {user.points.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-64 bg-gray-100 dark:bg-slate-800 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : activeTab === 'items' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {visibleProducts.map(item => (
            <div key={item.id} className="group bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="aspect-square overflow-hidden relative">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                <div className={`absolute top-4 right-4 px-2 py-1 backdrop-blur-md text-white text-[10px] font-bold rounded uppercase ${item.status === 'Active' && item.stock > 0 ? 'bg-black/50' : 'bg-red-500'}`}>
                  {item.status === 'Inactive' ? '已停用' : item.stock > 0 ? `库存: ${item.stock}` : '缺货'}
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-primary-600 bg-primary-50 dark:bg-primary-900/20 px-2 py-0.5 rounded uppercase">{item.category}</span>
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-1.5 text-sm">{item.name}</h3>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-1 text-amber-600 font-bold">
                    <Zap className="w-4 h-4" />
                    <span>{item.price}</span>
                  </div>
                  <button 
                    disabled={item.status !== 'Active' || item.stock <= 0 || user.points < item.price}
                    onClick={() => setShowConfirmModal(item)}
                    className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors shadow-lg ${
                      item.status === 'Active' && item.stock > 0 && user.points >= item.price
                        ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-primary-500/20'
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {item.status !== 'Active'
                      ? '暂不可兑换'
                      : item.stock <= 0
                        ? '已售罄'
                        : user.points < item.price
                          ? '积分不足'
                          : '立即兑换'}
                  </button>
                </div>
              </div>
            </div>
          ))}
          {visibleProducts.length === 0 ? (
            <div className="col-span-full p-10 text-center bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 text-sm text-gray-500 dark:text-slate-400">
              当前暂无可兑换商品
            </div>
          ) : null}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {redemptions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-800/50 text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                    <th className="px-6 py-4 font-semibold">礼品信息</th>
                    <th className="px-6 py-4 font-semibold">消耗积分</th>
                    <th className="px-6 py-4 font-semibold">兑换时间</th>
                    <th className="px-6 py-4 font-semibold">状态</th>
                    <th className="px-6 py-4 font-semibold">领取方式</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {redemptions.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={r.productImage} alt={r.productName} className="w-10 h-10 rounded-lg object-cover" />
                          <span className="text-sm font-bold text-gray-900 dark:text-white">{r.productName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-sm font-bold text-amber-600">
                          <Zap className="w-3.5 h-3.5" />
                          {r.points}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">
                        {r.date}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 w-fit ${
                          r.status === 'Issued' 
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                            : 'bg-amber-50 text-amber-600 border border-amber-100'
                        }`}>
                          {r.status === 'Issued' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {r.status === 'Issued' ? '已发放' : '待领取'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500 dark:text-slate-400">
                        请凭兑换记录前往 <span className="font-bold text-primary-600">网络安全实验室 (10-201)</span> 领取
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-20 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-500 dark:text-slate-400">暂无兑换记录</p>
              <button onClick={() => setActiveTab('items')} className="mt-4 text-primary-600 font-bold hover:underline">去商城逛逛</button>
            </div>
          )}
        </div>
      )}

      <div className="bg-primary-600 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-primary-500/20">
        <div className="flex items-center gap-6">
          <div className="p-4 bg-white/20 rounded-2xl">
            <Gift className="w-10 h-10" />
          </div>
          <div>
            <h3 className="text-xl font-bold">积分不够？</h3>
            <p className="text-primary-100 opacity-80">提交高质量漏洞，获得更多积分奖励！</p>
          </div>
        </div>
        <button className="px-6 py-3 bg-white text-primary-600 font-bold rounded-xl hover:scale-105 transition-transform flex items-center gap-2">
          去提交漏洞 <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <ConfirmModal
        open={!!showConfirmModal}
        title="确认兑换"
        description="兑换后将扣除对应积分，提交后请前往指定地点领取。"
        highlightText={
          showConfirmModal
            ? `${showConfirmModal.name} · ${showConfirmModal.price} 积分`
            : ''
        }
        confirmText={submitting ? '提交中...' : '确认兑换'}
        confirmDisabled={submitting}
        onCancel={() => setShowConfirmModal(null)}
        onConfirm={() => {
          if (!showConfirmModal) return;
          return handleRedeem(showConfirmModal);
        }}
      />

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden p-8 text-center"
            >
              <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">兑换成功！</h3>
              <p className="text-gray-500 dark:text-slate-400 mb-8">
                您的礼品已准备就绪。请前往 <span className="font-bold text-primary-600">网络安全实验室 (10-201)</span> 凭兑换记录领取。
              </p>
              <button 
                onClick={() => setShowSuccessModal(false)}
                className="w-full py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-600/20"
              >
                我知道了
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
