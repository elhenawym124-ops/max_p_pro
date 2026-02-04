import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, RotateCcw, Maximize, Minimize, Image as ImageIcon, Loader2, Printer, FileText, X, Clock, DollarSign, Package, TrendingUp, Banknote, Check, Sun, Moon } from 'lucide-react';
import { config } from '../../config';
import { authService } from '../../services/authService';
import { useTheme } from '../../hooks/useTheme';

interface Product { id: string; name: string; price: number; images: string[]; category: string; stock: number; sku: string; }
interface CartItem extends Product { qty: number; }
interface Customer { id: string; name: string; phone: string; }
interface ShiftData { startTime: Date; totalSales: number; totalOrders: number; totalItems: number; cashPayments: number; orders: Array<{ orderNumber: string; total: number; paymentMethod: string; }>; }
interface LastOrder { orderNumber: string; items: CartItem[]; subtotal: number; tax: number; total: number; customer: Customer | null; date: Date; paymentMethod: string; cashReceived?: number; change?: number; }

const safeJsonParse = (str: string | null, def: any = null) => { try { return str ? JSON.parse(str) : def; } catch { return def; } };

const PosPage = () => {
  const { actualTheme, toggleTheme } = useTheme();
  const isDark = actualTheme === 'dark';
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [categories, setCategories] = useState<string[]>(['الكل']);
  const [processing, setProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showShiftReport, setShowShiftReport] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [lastOrder, setLastOrder] = useState<LastOrder | null>(null);
  const [shiftData, setShiftData] = useState<ShiftData>(() => {
    const saved = localStorage.getItem('pos_shift_data');
    if (saved) {
      const parsed = safeJsonParse(saved, null);
      if (parsed) return { ...parsed, startTime: new Date(parsed.startTime) };
    }
    return { startTime: new Date(), totalSales: 0, totalOrders: 0, totalItems: 0, cashPayments: 0, orders: [] };
  });
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD'>('CASH');
  const [cashReceived, setCashReceived] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const barcodeBuffer = useRef('');
  const barcodeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const token = authService.getAccessToken();
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        const res = await fetch(config.apiUrl + '/products', { headers });
        const data = await res.json();
        if (data.success && data.data) {
          const prods = data.data.map((p: any) => ({ id: p.id, name: p.name, price: Number(p.price), sku: p.sku || '', category: p.category?.name || 'غير محدد', images: safeJsonParse(p.images, []), stock: p.stock }));
          setProducts(prods);
          setCategories(['الكل', ...Array.from(new Set(prods.map((p: any) => p.category))) as string[]]);
        }
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    load();
  }, []);

  const subtotal = cart.reduce((a, i) => a + i.price * i.qty, 0);
  const tax = subtotal * 0.14;
  const total = subtotal + tax;
  const change = cashReceived - total;

  const filtered = products.filter(p => {
    const q = searchQuery.toLowerCase();
    return (p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)) && (selectedCategory === 'الكل' || p.category === selectedCategory);
  });

  const addToCart = (p: Product) => {
    if (p.stock <= 0) return alert('غير متوفر');
    setCart(prev => {
      const ex = prev.find(i => i.id === p.id);
      if (ex) { if (ex.qty >= p.stock) return prev; return prev.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i); }
      return [...prev, { ...p, qty: 1 }];
    });
  };

  const updateQty = (id: string, d: number) => setCart(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(1, Math.min(i.stock, i.qty + d)) } : i));
  const removeItem = (id: string) => setCart(prev => prev.filter(i => i.id !== id));
  const clearCart = () => {
    if (cart.length > 0 && !window.confirm('هل تريد مسح السلة؟')) return;
    setCart([]); setCustomer(null);
  };

  const handleBarcode = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement) return;
    if (e.key === 'Enter' && barcodeBuffer.current) {
      const sku = barcodeBuffer.current;
      const p = products.find(x => x.sku === sku || x.id === sku);
      if (p) {
        if (p.stock <= 0) { alert('غير متوفر'); }
        else {
          setCart(prev => {
            const ex = prev.find(i => i.id === p.id);
            if (ex) { if (ex.qty >= p.stock) return prev; return prev.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i); }
            return [...prev, { ...p, qty: 1 }];
          });
        }
      } else { setSearchQuery(sku); }
      barcodeBuffer.current = '';
      if (barcodeTimeout.current) clearTimeout(barcodeTimeout.current);
    } else if (e.key.length === 1 && !e.ctrlKey) {
      barcodeBuffer.current += e.key;
      if (barcodeTimeout.current) clearTimeout(barcodeTimeout.current);
      barcodeTimeout.current = setTimeout(() => { barcodeBuffer.current = ''; }, 500);
    }
  }, [products]);

  useEffect(() => { window.addEventListener('keydown', handleBarcode); return () => window.removeEventListener('keydown', handleBarcode); }, [handleBarcode]);

  useEffect(() => {
    const shortcuts = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'F4' && cart.length) { e.preventDefault(); setShowPayment(true); setCashReceived(Math.ceil(total)); }
      if (e.key === 'Escape') { setShowPayment(false); setShowReceipt(false); }
    };
    window.addEventListener('keydown', shortcuts);
    return () => window.removeEventListener('keydown', shortcuts);
  }, [cart, total]);

  const checkout = async () => {
    if (!cart.length || (paymentMethod === 'CASH' && cashReceived < total)) return;
    setProcessing(true);
    try {
      const token = authService.getAccessToken();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = 'Bearer ' + token;
      const res = await fetch(config.apiUrl + '/pos/orders', { method: 'POST', headers, body: JSON.stringify({ cart, customer, paymentMethod, subtotal, tax, total, cashReceived }) });
      const data = await res.json();
      if (data.success) {
        setLastOrder({ orderNumber: data.data.orderNumber, items: [...cart], subtotal, tax, total, customer, date: new Date(), paymentMethod, cashReceived, change: change > 0 ? change : 0 });
        const newShiftData = {
          ...shiftData,
          totalSales: shiftData.totalSales + total,
          totalOrders: shiftData.totalOrders + 1,
          totalItems: shiftData.totalItems + cart.reduce((a, i) => a + i.qty, 0),
          cashPayments: shiftData.cashPayments + (paymentMethod === 'CASH' ? total : 0),
          orders: [...shiftData.orders, { orderNumber: data.data.orderNumber, total, paymentMethod }]
        };
        setShiftData(newShiftData);
        localStorage.setItem('pos_shift_data', JSON.stringify(newShiftData));
        setShowPayment(false); setShowReceipt(true); setCart([]); setCustomer(null); setCashReceived(0);
      } else alert(data.message);
    } catch { alert('خطأ في الاتصال'); } finally { setProcessing(false); }
  };

  const printReceipt = () => {
    if (!lastOrder) return;
    const w = window.open('', '', 'width=400,height=600');
    if (w) {
      w.document.write('<html dir="rtl"><head><style>body{font:12px Arial;max-width:280px;margin:auto;padding:20px}.c{text-align:center}.r{display:flex;justify-content:space-between;margin:4px 0}.b{font-weight:bold}.hr{border-top:1px dashed #000;margin:10px 0}</style></head><body>');
      w.document.write('<div class="c"><h2>🛒 نقطة البيع</h2><p>' + lastOrder.orderNumber + '</p><p>' + lastOrder.date.toLocaleString('ar-EG') + '</p></div><div class="hr"></div>');
      lastOrder.items.forEach(i => w.document.write('<div class="r"><span>' + i.name + ' x' + i.qty + '</span><span>' + (i.price * i.qty).toLocaleString() + '</span></div>'));
      w.document.write('<div class="hr"></div><div class="r"><span>المجموع</span><span>' + lastOrder.subtotal.toLocaleString() + '</span></div>');
      w.document.write('<div class="r"><span>ضريبة 14%</span><span>' + lastOrder.tax.toLocaleString() + '</span></div>');
      w.document.write('<div class="r b"><span>الإجمالي</span><span>' + lastOrder.total.toLocaleString() + ' ج.م</span></div>');
      if (lastOrder.paymentMethod === 'CASH') {
        w.document.write('<div class="hr"></div><div class="r"><span>المدفوع</span><span>' + (lastOrder.cashReceived || 0).toLocaleString() + '</span></div>');
        w.document.write('<div class="r b"><span>الباقي</span><span>' + (lastOrder.change || 0).toLocaleString() + '</span></div>');
      }
      w.document.write('<div class="hr"></div><p class="c">شكراً لزيارتكم!</p></body></html>');
      w.document.close(); setTimeout(() => { w.print(); w.close(); }, 300);
    }
  };

  const endShift = () => { if (window.confirm('إنهاء الوردية؟')) setShowShiftReport(true); };
  const resetShift = () => {
    const newShift = { startTime: new Date(), totalSales: 0, totalOrders: 0, totalItems: 0, cashPayments: 0, orders: [] };
    setShiftData(newShift);
    localStorage.setItem('pos_shift_data', JSON.stringify(newShift));
    setShowShiftReport(false);
  };

  return (
    <div className="h-screen bg-gray-100 dark:bg-gray-900 flex" dir="rtl">
      <div className="flex-1 flex flex-col">
        <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-4 py-3 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input ref={searchRef} type="text" placeholder="بحث... (F2)" className="w-full pr-10 pl-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>

          <button
            onClick={toggleTheme}
            className="p-2.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title={isDark ? 'تبديل للوضع النهاري' : 'تبديل للوضع الليلي'}
          >
            {isDark ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5" />}
          </button>

          <button onClick={() => setIsFullscreen(f => { f ? document.exitFullscreen() : document.documentElement.requestFullscreen(); return !f; })} className="p-2.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </button>
        </div>
        <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              className={'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ' +
                (selectedCategory === c
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600')}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filtered.map(p => (
                <div key={p.id} onClick={() => addToCart(p)} className={'bg-white dark:bg-gray-800 rounded-xl border-2 cursor-pointer hover:border-blue-400 hover:shadow-lg ' + (p.stock <= 0 ? 'opacity-50' : 'border-transparent dark:border-gray-700')}>
                  <div className="h-28 bg-gray-100 rounded-t-xl flex items-center justify-center relative">
                    {(Array.isArray(p.images) ? p.images[0] : p.images) ? <img src={Array.isArray(p.images) ? p.images[0] : p.images} alt={p.name} className="h-full w-full object-cover rounded-t-xl" /> : <ImageIcon className="h-10 w-10 text-gray-300" />}
                    <span className={'absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-medium text-white ' + (p.stock <= 0 ? 'bg-red-500' : p.stock < 5 ? 'bg-yellow-500' : 'bg-green-500')}>
                      {p.stock <= 0 ? 'نفذ' : p.stock}
                    </span>
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-medium truncate text-gray-900 dark:text-white">{p.name}</h3>
                    <p className="text-blue-600 font-bold mt-1">{p.price.toLocaleString()} ج.م</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white dark:bg-gray-800 border-t dark:border-gray-700 px-4 py-2 flex items-center gap-2 text-xs text-gray-500">
          <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">F2 بحث</span>
          <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">F4 دفع</span>
        </div>
      </div>

      <div className="w-96 bg-white dark:bg-gray-800 border-r dark:border-gray-700 flex flex-col shadow-xl">
        <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-blue-600" />
            <span className="font-bold text-lg text-gray-900 dark:text-white">السلة</span>
            <span className="bg-blue-100 text-blue-600 text-sm px-2 py-0.5 rounded-full">{cart.length}</span>
          </div>
          <button onClick={clearCart} className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2 dark:bg-gray-800/50">
          {!cart.length ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600">
              <ShoppingCart className="h-16 w-16 mb-4 opacity-30" />
              <p>السلة فارغة</p>
            </div>
          ) : cart.map(item => (
            <div key={item.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 border border-transparent dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                  {(Array.isArray(item.images) ? item.images[0] : item.images) ? <img src={Array.isArray(item.images) ? item.images[0] : item.images} alt={item.name} className="w-full h-full object-cover" /> : <ImageIcon className="w-full h-full p-2 text-gray-400 dark:text-gray-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate text-gray-900 dark:text-white">{item.name}</h4>
                  <p className="text-blue-600 dark:text-blue-400 font-bold text-sm">{(item.price * item.qty).toLocaleString()} ج.م</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center font-medium text-gray-900 dark:text-white">{item.qty}</span>
                  <button onClick={() => updateQty(item.id, 1)} className="w-7 h-7 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center hover:bg-blue-200 dark:hover:bg-blue-900/40 transition-colors">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <button onClick={() => removeItem(item.id)} className="p-1.5 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 space-y-3">
          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex justify-between"><span>المجموع</span><span className="text-gray-900 dark:text-white">{subtotal.toLocaleString()} ج.م</span></div>
            <div className="flex justify-between"><span>الضريبة 14%</span><span className="text-gray-900 dark:text-white">{tax.toLocaleString()} ج.م</span></div>
            <div className="flex justify-between text-xl font-bold pt-2 border-t dark:border-gray-700 text-gray-900 dark:text-white"><span>الإجمالي</span><span className="text-blue-600 dark:text-blue-400">{total.toLocaleString()} ج.م</span></div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => setShowShiftReport(true)} className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg flex flex-col items-center hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
              <FileText className="h-5 w-5" />
              <span className="text-xs mt-1">تقرير</span>
            </button>
            <button onClick={() => { setShowPayment(true); setCashReceived(Math.ceil(total)); }} disabled={!cart.length} className="col-span-2 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 font-bold transition-all shadow-md active:scale-95">
              <CreditCard className="h-5 w-5" />دفع (F4)
            </button>
          </div>
        </div>
      </div>

      {showPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">💳 الدفع</h2>
              <button onClick={() => setShowPayment(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="text-center mb-6">
              <p className="text-gray-500 dark:text-gray-400">الإجمالي</p>
              <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">{total.toLocaleString()} ج.م</p>
            </div>
            <div className="flex gap-2 mb-6">
              {(['CASH', 'CARD'] as const).map(m => (
                <button key={m} onClick={() => setPaymentMethod(m)} className={'flex-1 p-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ' + (paymentMethod === m ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300')}>
                  {m === 'CASH' ? <><Banknote className="h-5 w-5" />نقدي</> : <><CreditCard className="h-5 w-5" />بطاقة</>}
                </button>
              ))}
            </div>
            {paymentMethod === 'CASH' && (
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">المبلغ المستلم</label>
                <input type="number" value={cashReceived} onChange={e => setCashReceived(Number(e.target.value))} className="w-full p-4 border-2 border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl text-2xl text-center font-bold text-gray-900 dark:text-white focus:border-blue-500 outline-none transition-all" />
                <div className="flex gap-2 mt-3">
                  {[50, 100, 200, 500].map(v => (
                    <button key={v} onClick={() => setCashReceived(v)} className="flex-1 p-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                      {v}
                    </button>
                  ))}
                </div>
                {cashReceived >= total && (
                  <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl text-center border border-green-100 dark:border-green-900/30">
                    <p className="text-gray-600 dark:text-gray-400">الباقي</p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">{change.toLocaleString()} ج.م</p>
                  </div>
                )}
              </div>
            )}
            <button onClick={checkout} disabled={processing || (paymentMethod === 'CASH' && cashReceived < total)} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">
              {processing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Check className="h-6 w-6" />}
              تأكيد الدفع
            </button>
          </div>
        </div>
      )}

      {showReceipt && lastOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">تم الطلب بنجاح</h2>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">{lastOrder.orderNumber}</p>
            </div>
            {lastOrder.paymentMethod === 'CASH' && lastOrder.change && lastOrder.change > 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 mb-6 text-center border border-green-100 dark:border-green-900/30">
                <p className="text-gray-600 dark:text-gray-400">الباقي</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{lastOrder.change.toLocaleString()} ج.م</p>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={printReceipt} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all shadow-md active:scale-95">
                <Printer className="h-5 w-5" />طباعة
              </button>
              <button onClick={() => setShowReceipt(false)} className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {showShiftReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">📊 تقرير الوردية</h2>
              <button onClick={() => setShowShiftReport(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center border border-blue-100 dark:border-blue-900/30">
                <DollarSign className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400">إجمالي المبيعات</p>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{shiftData.totalSales.toLocaleString()} ج.م</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center border border-green-100 dark:border-green-900/30">
                <Package className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400">عدد الطلبات</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">{shiftData.totalOrders}</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 text-center border border-purple-100 dark:border-purple-900/30">
                <TrendingUp className="h-8 w-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400">إجمالي المنتجات</p>
                <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{shiftData.totalItems}</p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 text-center border border-orange-100 dark:border-orange-900/30">
                <Clock className="h-8 w-8 text-orange-600 dark:text-orange-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400">بداية الوردية</p>
                <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{shiftData.startTime.toLocaleTimeString('ar-EG')}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={resetShift} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all shadow-md active:scale-95">
                <RotateCcw className="h-5 w-5" />وردية جديدة
              </button>
              <button onClick={() => setShowShiftReport(false)} className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PosPage;
