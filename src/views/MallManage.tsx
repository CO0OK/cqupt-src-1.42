import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingBag, Search, Plus, Edit2, Trash2, Package, Tag, Coins, AlertCircle, Filter, X, History, CheckCircle, Clock, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Redemption } from '../types';
import { getApiErrorMessage } from '../utils/apiError';
import ConfirmModal from '../components/ConfirmModal';

export default function MallManage() {
  type Notice = { type: 'success' | 'error'; message: string } | null;
  type NewProductForm = {
    name: string;
    price: number;
    stock: number;
    category: string;
    image: string;
    status: 'Active' | 'Out of Stock' | 'Inactive';
  };
  type ProductField = keyof NewProductForm | 'body';
  type ValidationIssue = { field?: string; reason?: string };
  type ConfirmAction =
    | { kind: 'delete_product'; productId: string; label: string }
    | { kind: 'issue_redemption'; redemptionId: string; label: string }
    | { kind: 'save_product'; label: string }
    | null;

  const [activeTab, setActiveTab] = useState<'products' | 'redemptions'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [simpleFilter, setSimpleFilter] = useState('all');
  const [advancedFilters, setAdvancedFilters] = useState({
    category: '全部',
    status: '全部',
    minPrice: '',
    maxPrice: ''
  });
  const [sortBy, setSortBy] = useState('name');
  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isDeletingProductId, setIsDeletingProductId] = useState<string | null>(null);
  const [productFieldErrors, setProductFieldErrors] = useState<Partial<Record<ProductField, string>>>({});
  const [newProduct, setNewProduct] = useState<NewProductForm>({
    name: '',
    price: 0,
    stock: 1,
    category: '服饰',
    image: '',
    status: 'Active'
  });
  const emptyProduct: NewProductForm = {
    name: '',
    price: 0,
    stock: 1,
    category: '服饰',
    image: '',
    status: 'Active'
  };
  const PRODUCT_CATEGORIES = ['服饰', '数码', '周边', '礼品卡', '其他'] as const;

  const fieldLabelMap: Record<ProductField, string> = {
    name: '商品名称',
    price: '价格',
    stock: '库存',
    category: '商品分类',
    image: '商品图片',
    status: '商品状态',
    body: '表单',
  };

  const reasonLabelMap: Record<string, string> = {
    required: '必填',
    'must be integer': '必须为整数',
    'must be between 1 and 999999': '取值范围应为 1-999999',
    'must be between 0 and 999999': '取值范围应为 0-999999',
    'must be between 1 and 999': '取值范围应为 1-999',
    'must be Active|Out of Stock|Inactive': '状态值不合法',
    'must be non-empty string': '不能为空',
    'must be string': '必须为字符串',
    'must be string|null': '必须为字符串或空',
    'length must be <= 120': '长度不能超过 120',
    'length must be <= 50': '长度不能超过 50',
    'at least one field is required': '至少填写一个字段',
    'no valid updatable field provided': '没有可更新字段',
  };

  const mapProductFieldErrors = (payload: unknown): Partial<Record<ProductField, string>> => {
    const response = payload as { details?: unknown };
    const details = Array.isArray(response?.details) ? (response.details as ValidationIssue[]) : [];
    const errors: Partial<Record<ProductField, string>> = {};

    details.forEach((item) => {
      const rawField = typeof item?.field === 'string' ? item.field : 'body';
      const field = (['name', 'price', 'stock', 'category', 'image', 'status', 'body'].includes(rawField)
        ? rawField
        : 'body') as ProductField;
      const rawReason = typeof item?.reason === 'string' ? item.reason : '参数不合法';
      const label = reasonLabelMap[rawReason] || rawReason;
      if (!errors[field]) {
        errors[field] = `${fieldLabelMap[field]}${label === '必填' ? '为必填项' : `：${label}`}`;
      }
    });

    return errors;
  };

  const clearProductFieldError = (field: ProductField) => {
    setProductFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'products') {
        const res = await fetch('/api/mall/products');
        const data = await res.json();
        setProducts(data);
      } else {
        const res = await fetch('/api/mall/redemptions');
        const data = await res.json();
        setRedemptions(data);
      }
    } catch (error) {
      console.error('Failed to fetch mall management data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRedemptionStatus = async (redemptionId: string, newStatus: 'Pending' | 'Issued') => {
    try {
      const res = await fetch(`/api/mall/redemptions/${redemptionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setRedemptions(prev => prev.map(r => r.id === redemptionId ? { ...r, status: newStatus } : r));
        setNotice({ type: 'success', message: '兑换状态已更新为已发放' });
      } else {
        setNotice({ type: 'error', message: getApiErrorMessage(data, '更新兑换状态失败', res.status) });
      }
    } catch (error) {
      console.error('Failed to update redemption status:', error);
      setNotice({ type: 'error', message: '更新兑换状态失败' });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProduct(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddProduct = async () => {
    const priceValue = Number(newProduct.price);
    const stockValue = Number(newProduct.stock);
    const safePrice = Number.isFinite(priceValue) ? priceValue : 0;
    const safeStock = Number.isFinite(stockValue) ? stockValue : 0;
    const shouldForceOutOfStock = newProduct.status === 'Active' && safeStock <= 0;

    const payload: NewProductForm = {
      ...newProduct,
      price: safePrice,
      stock: safeStock,
      status: shouldForceOutOfStock ? 'Out of Stock' : newProduct.status,
    };

    setIsSavingProduct(true);
    setProductFieldErrors({});
    try {
      const isEditMode = Boolean(editingProductId);
      const endpoint = isEditMode ? `/api/mall/products/${editingProductId}` : '/api/mall/products';
      const method = isEditMode ? 'PATCH' : 'POST';
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        if (shouldForceOutOfStock) {
          setNotice({ type: 'success', message: '库存为 0，系统已自动按“下架”创建/更新商品。' });
        }
        if (isEditMode) {
          setProducts(products.map(p => (p.id === editingProductId ? data.product : p)));
        } else {
          setProducts([...products, data.product]);
        }
        if (!shouldForceOutOfStock) {
          setNotice({ type: 'success', message: isEditMode ? '商品更新成功' : '商品创建成功' });
        }
        setShowAddModal(false);
        setEditingProductId(null);
        setNewProduct(emptyProduct);
        setProductFieldErrors({});
      } else {
        const fieldErrors = mapProductFieldErrors(data);
        if (Object.keys(fieldErrors).length > 0) {
          setProductFieldErrors(fieldErrors);
        } else {
          setNotice({ type: 'error', message: getApiErrorMessage(data, isEditMode ? '商品更新失败' : '商品创建失败', res.status) });
        }
      }
    } catch (error) {
      console.error('Failed to add product:', error);
      setNotice({ type: 'error', message: editingProductId ? '商品更新失败' : '商品创建失败' });
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleOpenAddProductModal = () => {
    setEditingProductId(null);
    setNewProduct(emptyProduct);
    setProductFieldErrors({});
    setShowAddModal(true);
  };

  const handleOpenEditProductModal = (product: Product) => {
    setEditingProductId(product.id);
    setNewProduct({
      name: product.name,
      price: product.price,
      stock: product.stock,
      category: product.category,
      image: product.image,
      status: product.status,
    });
    setProductFieldErrors({});
    setShowAddModal(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    setIsDeletingProductId(productId);
    try {
      const res = await fetch(`/api/mall/products/${productId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setProducts(prev => prev.filter(p => p.id !== productId));
        setNotice({ type: 'success', message: '商品已删除' });
      } else {
        setNotice({ type: 'error', message: getApiErrorMessage(data, '删除商品失败', res.status) });
      }
    } catch (error) {
      console.error('Failed to delete product:', error);
      setNotice({ type: 'error', message: '删除商品失败' });
    } finally {
      setIsDeletingProductId(null);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    const action = confirmAction;
    if (action.kind === 'delete_product') {
      await handleDeleteProduct(action.productId);
      setConfirmAction(null);
      return;
    }
    if (action.kind === 'issue_redemption') {
      await handleUpdateRedemptionStatus(action.redemptionId, 'Issued');
      setConfirmAction(null);
      return;
    }
    if (action.kind === 'save_product') {
      await handleAddProduct();
      setConfirmAction(null);
    }
  };

  const filteredProducts = useMemo(() => {
    const result = products.filter(p => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        p.name.toLowerCase().includes(searchLower) ||
        p.category.toLowerCase().includes(searchLower) ||
        p.id.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      if (simpleFilter === 'inStock' && p.status !== 'Active') return false;
      if (simpleFilter === 'lowStock' && p.stock >= 10) return false;

      if (advancedFilters.category !== '全部' && p.category !== advancedFilters.category) return false;
      if (advancedFilters.status !== '全部' && p.status !== advancedFilters.status) return false;
      
      if (advancedFilters.minPrice && p.price < parseInt(advancedFilters.minPrice)) return false;
      if (advancedFilters.maxPrice && p.price > parseInt(advancedFilters.maxPrice)) return false;

      return true;
    });

    result.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'stock_asc') return a.stock - b.stock;
      if (sortBy === 'stock_desc') return b.stock - a.stock;
      return 0;
    });

    return result;
  }, [products, searchTerm, simpleFilter, advancedFilters, sortBy]);

  const filteredRedemptions = useMemo(() => {
    return redemptions.filter(r => {
      const searchLower = searchTerm.toLowerCase();
      return (
        r.username.toLowerCase().includes(searchLower) ||
        r.productName.toLowerCase().includes(searchLower) ||
        r.id.toLowerCase().includes(searchLower)
      );
    });
  }, [redemptions, searchTerm]);

  const categoryCount = useMemo(() => {
    return new Set(products.map((p) => p.category)).size;
  }, [products]);

  return (
    <div className="space-y-6">
      {notice ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-medium ${notice.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}
        >
          {notice.message}
        </div>
      ) : null}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-primary-600" />
            商城管理
          </h2>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">管理积分商城商品、库存及用户兑换记录</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'products' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Package className="w-4 h-4" />
              商品管理
            </button>
            <button 
              onClick={() => setActiveTab('redemptions')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'redemptions' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <History className="w-4 h-4" />
              兑换记录
            </button>
          </div>
          {activeTab === 'products' && (
            <button 
              onClick={handleOpenAddProductModal}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-all shadow-lg shadow-primary-600/20"
            >
              <Plus className="w-4 h-4" />
              添加商品
            </button>
          )}
        </div>
      </div>

      {activeTab === 'products' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl text-primary-600">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">商品总数</p>
                <p className="text-2xl font-bold dark:text-white">{products.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-amber-600">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">缺货商品</p>
                <p className="text-2xl font-bold dark:text-white">{products.filter(p => p.stock === 0).length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-600">
                <Tag className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">商品分类</p>
                <p className="text-2xl font-bold dark:text-white">{categoryCount}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex flex-wrap items-center gap-4">
          <div className="relative flex-grow min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder={activeTab === 'products' ? "搜索商品名称、分类或ID..." : "搜索用户名、商品或ID..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-500 transition-all dark:text-white outline-none"
            />
          </div>
          
          {activeTab === 'products' && (
            <>
              <div className="flex items-center bg-gray-100 dark:bg-slate-800 p-1 rounded-xl">
                <button 
                  onClick={() => setSimpleFilter('all')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${simpleFilter === 'all' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  全部
                </button>
                <button 
                  onClick={() => setSimpleFilter('inStock')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${simpleFilter === 'inStock' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  上架中
                </button>
                <button 
                  onClick={() => setSimpleFilter('lowStock')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${simpleFilter === 'lowStock' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  库存告急
                </button>
              </div>

              <button 
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl border transition-all ${showAdvanced ? 'bg-primary-50 border-primary-200 text-primary-600' : 'border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
              >
                <Filter className="w-4 h-4 text-gray-400" />
                高级筛选
              </button>
            </>
          )}
        </div>

        <AnimatePresence>
          {showAdvanced && activeTab === 'products' && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50"
            >
              <div className="p-6 grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">商品分类</label>
                  <select 
                    value={advancedFilters.category}
                    onChange={(e) => setAdvancedFilters({...advancedFilters, category: e.target.value})}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="全部">全部分类</option>
                    {PRODUCT_CATEGORIES.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">商品状态</label>
                  <select 
                    value={advancedFilters.status}
                    onChange={(e) => setAdvancedFilters({...advancedFilters, status: e.target.value})}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="全部">全部状态</option>
                    <option value="Active">上架中</option>
                    <option value="Out of Stock">缺货下架</option>
                    <option value="Inactive">手动停用</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">排序方式</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="name">名称排序</option>
                    <option value="price_asc">价格升序</option>
                    <option value="price_desc">价格降序</option>
                    <option value="stock_asc">库存升序</option>
                    <option value="stock_desc">库存降序</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">最低价格</label>
                  <input 
                    type="number"
                    placeholder="0"
                    value={advancedFilters.minPrice}
                    onChange={(e) => setAdvancedFilters({...advancedFilters, minPrice: e.target.value})}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">最高价格</label>
                  <div className="flex gap-2">
                    <input 
                      type="number"
                      placeholder="99999"
                      value={advancedFilters.maxPrice}
                      onChange={(e) => setAdvancedFilters({...advancedFilters, maxPrice: e.target.value})}
                      className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <button 
                      onClick={() => setAdvancedFilters({ category: '全部', status: '全部', minPrice: '', maxPrice: '' })}
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
          {loading ? (
            <div className="p-20 text-center">
              <div className="w-10 h-10 border-4 border-primary-600/30 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500">加载中...</p>
            </div>
          ) : activeTab === 'products' ? (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-800/50 text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">商品信息</th>
                  <th className="px-6 py-4 font-semibold">分类</th>
                  <th className="px-6 py-4 font-semibold">价格 (积分)</th>
                  <th className="px-6 py-4 font-semibold">库存</th>
                  <th className="px-6 py-4 font-semibold">状态</th>
                  <th className="px-6 py-4 font-semibold text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={product.image} alt={product.name} className="w-10 h-10 rounded-lg object-cover" />
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{product.name}</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">ID: {product.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 dark:text-slate-300">{product.category}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm font-bold text-amber-600">
                        <Zap className="w-3.5 h-3.5" />
                        {product.price.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-medium ${product.stock < 10 ? 'text-orange-600' : 'text-gray-600 dark:text-slate-300'}`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                        product.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          : product.status === 'Inactive'
                            ? 'bg-slate-100 text-slate-700 border border-slate-200'
                            : 'bg-red-50 text-red-600 border border-red-100'
                      }`}>
                        {product.status === 'Active' ? '上架中' : product.status === 'Inactive' ? '已停用' : '缺货下架'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditProductModal(product)}
                          className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            setConfirmAction({
                              kind: 'delete_product',
                              productId: product.id,
                              label: `${product.name}（ID: ${product.id}）`,
                            })
                          }
                          disabled={isDeletingProductId === product.id}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-800/50 text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">兑换用户</th>
                  <th className="px-6 py-4 font-semibold">兑换礼品</th>
                  <th className="px-6 py-4 font-semibold">消耗积分</th>
                  <th className="px-6 py-4 font-semibold">兑换时间</th>
                  <th className="px-6 py-4 font-semibold">状态</th>
                  <th className="px-6 py-4 font-semibold text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {filteredRedemptions.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 font-bold text-xs">
                          {r.username[0].toUpperCase()}
                        </div>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{r.username}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={r.productImage} alt={r.productName} className="w-10 h-10 rounded-lg object-cover" />
                        <span className="text-sm text-gray-600 dark:text-slate-300">{r.productName}</span>
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
                    <td className="px-6 py-4 text-right">
                      {r.status === 'Pending' && (
                        <button 
                          onClick={() =>
                            setConfirmAction({
                              kind: 'issue_redemption',
                              redemptionId: r.id,
                              label: `${r.username} · ${r.productName}`,
                            })
                          }
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition-colors shadow-lg shadow-emerald-500/20"
                        >
                          确认发放
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 dark:border-slate-800">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingProductId ? '编辑商品' : '添加新商品'}
              </h3>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">商品名称</label>
                <input 
                  type="text" 
                  className={`w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white outline-none ${productFieldErrors.name ? 'border border-red-300 dark:border-red-600' : 'border-none'}`}
                  placeholder="输入商品名称"
                  value={newProduct.name}
                  onChange={(e) => {
                    clearProductFieldError('name');
                    setNewProduct({ ...newProduct, name: e.target.value });
                  }}
                />
                {productFieldErrors.name ? (
                  <p className="mt-1 text-xs text-red-600">{productFieldErrors.name}</p>
                ) : null}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">价格 (积分)</label>
                <input 
                  type="number" 
                  className={`w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white outline-none ${productFieldErrors.price ? 'border border-red-300 dark:border-red-600' : 'border-none'}`}
                  placeholder="0"
                  value={newProduct.price}
                  onChange={(e) => {
                    clearProductFieldError('price');
                    const value = Number(e.target.value);
                    setNewProduct({ ...newProduct, price: Number.isFinite(value) ? value : 0 });
                  }}
                />
                {productFieldErrors.price ? (
                  <p className="mt-1 text-xs text-red-600">{productFieldErrors.price}</p>
                ) : null}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">库存数量</label>
                <input 
                  type="number" 
                  className={`w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white outline-none ${productFieldErrors.stock ? 'border border-red-300 dark:border-red-600' : 'border-none'}`}
                  placeholder="0"
                  value={newProduct.stock}
                  onChange={(e) => {
                    clearProductFieldError('stock');
                    const value = Number(e.target.value);
                    setNewProduct({ ...newProduct, stock: Number.isFinite(value) ? value : 0 });
                  }}
                />
                {productFieldErrors.stock ? (
                  <p className="mt-1 text-xs text-red-600">{productFieldErrors.stock}</p>
                ) : null}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">商品分类</label>
                <select 
                  className={`w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white outline-none ${productFieldErrors.category ? 'border border-red-300 dark:border-red-600' : 'border-none'}`}
                  value={newProduct.category}
                  onChange={(e) => {
                    clearProductFieldError('category');
                    setNewProduct({ ...newProduct, category: e.target.value });
                  }}
                >
                  {PRODUCT_CATEGORIES.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                {productFieldErrors.category ? (
                  <p className="mt-1 text-xs text-red-600">{productFieldErrors.category}</p>
                ) : null}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">商品状态</label>
                <select 
                  className={`w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white outline-none ${productFieldErrors.status ? 'border border-red-300 dark:border-red-600' : 'border-none'}`}
                  value={newProduct.status}
                  onChange={(e) => {
                    clearProductFieldError('status');
                    setNewProduct({ ...newProduct, status: e.target.value as NewProductForm['status'] });
                  }}
                >
                  <option value="Active">上架</option>
                  <option value="Out of Stock">下架</option>
                  <option value="Inactive">停用</option>
                </select>
                {productFieldErrors.status ? (
                  <p className="mt-1 text-xs text-red-600">{productFieldErrors.status}</p>
                ) : null}
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">商品图片</label>
                <div className="flex items-center gap-4">
                  {newProduct.image && (
                    <img src={newProduct.image} alt="Preview" className="w-16 h-16 rounded-xl object-cover border border-gray-200 dark:border-slate-700" />
                  )}
                  <label className="flex-grow flex flex-col items-center justify-center px-4 py-6 bg-gray-50 dark:bg-slate-800 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:border-primary-500 transition-all">
                    <Plus className="w-6 h-6 text-gray-400 mb-1" />
                    <span className="text-xs text-gray-500">{newProduct.image ? '更换图片' : '上传本地图片'}</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        clearProductFieldError('image');
                        handleImageUpload(e);
                      }}
                    />
                  </label>
                </div>
                {productFieldErrors.image ? (
                  <p className="mt-1 text-xs text-red-600">{productFieldErrors.image}</p>
                ) : null}
                {productFieldErrors.body ? (
                  <p className="mt-1 text-xs text-red-600">{productFieldErrors.body}</p>
                ) : null}
              </div>
            </div>
            <div className="p-6 bg-gray-50 dark:bg-slate-800/50 flex justify-end gap-3">
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setEditingProductId(null);
                  setNewProduct(emptyProduct);
                  setProductFieldErrors({});
                }}
                className="px-4 py-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                取消
              </button>
              <button 
                onClick={() =>
                  setConfirmAction({
                    kind: 'save_product',
                    label: `${newProduct.name || '未命名商品'} · ${editingProductId ? '编辑模式' : '新增模式'}`,
                  })
                }
                disabled={isSavingProduct}
                className="px-6 py-2 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-all shadow-lg shadow-primary-600/20 disabled:opacity-50"
              >
                {isSavingProduct ? '提交中...' : editingProductId ? '保存修改' : '添加商品'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmAction}
        title={
          confirmAction?.kind === 'issue_redemption'
            ? '确认发放兑换'
            : confirmAction?.kind === 'save_product'
              ? editingProductId
                ? '确认保存商品修改'
                : '确认创建商品'
              : '确认删除商品'
        }
        description={
          confirmAction?.kind === 'issue_redemption'
            ? '确认后该兑换记录将更新为“已发放”。'
            : confirmAction?.kind === 'save_product'
              ? '提交后将保存商品信息并影响前台兑换展示。'
              : '删除后不可恢复；若商品有关联兑换记录，后端会阻止删除并返回冲突提示。'
        }
        highlightText={confirmAction?.label || ''}
        confirmText={
          confirmAction?.kind === 'issue_redemption'
            ? '确认发放'
            : confirmAction?.kind === 'save_product'
              ? editingProductId
                ? '确认保存'
                : '确认创建'
              : '确认删除'
        }
        danger={confirmAction?.kind === 'delete_product'}
        confirmDisabled={
          confirmAction?.kind === 'delete_product'
            ? !!isDeletingProductId
            : confirmAction?.kind === 'save_product'
              ? isSavingProduct
              : false
        }
        onCancel={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
      />
    </div>
  );
}
