
import React, { useState, useEffect } from 'react';
import { db } from '../services/supabaseService';
import { InventoryItem, InventoryOrder, Wholesaler, InventoryCategory } from '../types';
import { 
  Plus, Search, Edit2, Trash2, Package, Truck, ListChecks, 
  CheckCircle2, Clock, X, Save, ChevronDown, ChevronRight, 
  ShoppingBag, AlertCircle, Filter, FileText, Settings2, Loader2, Copy
} from 'lucide-react';

interface Props {
  onOrdersUpdate?: () => void;
}

const AdminInventory: React.FC<Props> = ({ onOrdersUpdate }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<InventoryOrder[]>([]);
  const [wholesalers, setWholesalers] = useState<Wholesaler[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'orders' | 'archive' | 'items' | 'categories'>('orders');
  const [orderView, setOrderView] = useState<'pending' | 'completed'>('pending');
  
  // Item Form State
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [itemForm, setItemForm] = useState<Omit<InventoryItem, 'id'>>({
    name: '',
    category: '',
    wholesalerId: null,
    minStock: 0,
    unit: 'Adet'
  });
  const [showQuickAddCategory, setShowQuickAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSavingItem, setIsSavingItem] = useState(false);

  // Bulk Add State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkNames, setBulkNames] = useState('');
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkWholesalerId, setBulkWholesalerId] = useState<string | null>(null);
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  // Delete Confirmation State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'item' | 'category' | 'order';
    id: string;
    title: string;
  }>({
    isOpen: false,
    type: 'item',
    id: '',
    title: ''
  });

  // Category Form State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<InventoryCategory | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [i, o, w, c] = await Promise.all([
        db.getInventoryItems().catch((e) => { console.error("Items load error:", e); return []; }),
        db.getInventoryOrders(), // Hata varsa catch bloğuna düşsün
        db.getWholesalers().catch((e) => { console.error("Wholesalers load error:", e); return []; }),
        db.getInventoryCategories().catch((e) => { console.error("Categories load error:", e); return []; })
      ]);
      setItems(i as InventoryItem[]);
      setOrders(o as InventoryOrder[]);
      setWholesalers(w as Wholesaler[]);
      setCategories(c as InventoryCategory[]);
    } catch (err) {
      console.error("Veri yükleme hatası:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveItem = async () => {
    let finalCategory = itemForm.category;

    if (showQuickAddCategory) {
      if (!newCategoryName.trim()) {
        alert("Lütfen yeni kategori adını girin.");
        return;
      }
      finalCategory = newCategoryName.trim();
    }

    if (!itemForm.name || !finalCategory) {
      alert("Lütfen isim ve kategori girin.");
      return;
    }

    setIsSavingItem(true);
    try {
      // Eğer yeni kategori ise önce onu kaydedelim (opsiyonel ama düzenli olması için iyi)
      if (showQuickAddCategory) {
        await db.upsertInventoryCategory({ id: '', name: finalCategory });
      }

      await db.upsertInventoryItem({
        id: editingItem?.id || '',
        ...itemForm,
        category: finalCategory
      });
      
      setIsItemModalOpen(false);
      setEditingItem(null);
      setItemForm({ name: '', category: '', wholesalerId: null, minStock: 0, unit: 'Adet' });
      setShowQuickAddCategory(false);
      setNewCategoryName('');
      await loadData();
    } catch (err: any) {
      console.error("Ürün kaydetme hatası:", err);
      alert("Ürün kaydedilemedi: " + (err.message || "Bilinmeyen hata"));
    } finally {
      setIsSavingItem(false);
    }
  };

  const handleBulkAdd = async () => {
    if (!bulkNames.trim() || !bulkCategory) {
      alert("Lütfen isimleri ve kategoriyi girin.");
      return;
    }

    setIsBulkSaving(true);
    const names = bulkNames.split('\n').map(n => n.trim()).filter(n => n !== '');
    const itemsToInsert = names.map(name => ({
      name,
      category: bulkCategory,
      wholesalerId: bulkWholesalerId,
      minStock: 0,
      unit: 'Adet'
    }));

    try {
      await db.bulkInsertInventoryItems(itemsToInsert);
      setIsBulkModalOpen(false);
      setBulkNames('');
      setBulkCategory('');
      setBulkWholesalerId(null);
      await loadData();
    } catch (err) {
      console.error("Toplu ekleme hatası:", err);
      alert("Ürünler eklenirken bir hata oluştu.");
    } finally {
      setIsBulkSaving(false);
    }
  };

  const handleInlineMinStockUpdate = async (item: InventoryItem, newMinStock: number) => {
    try {
      await db.upsertInventoryItem({
        ...item,
        minStock: newMinStock
      });
      // Local state update for immediate feedback
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, minStock: newMinStock } : i));
    } catch (err) {
      console.error("Inline min stok güncelleme hatası:", err);
      alert("Min stok güncellenemedi.");
      loadData(); // Revert on error
    }
  };

  const handleDeleteItem = (id: string, name: string) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'item',
      id,
      title: `"${name}" ürününü silmek istediğine emin misin?`
    });
  };

  const handleDeleteCategory = (id: string, name: string) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'category',
      id,
      title: `"${name}" kategorisini silmek istediğine emin misin? Bu kategoriye bağlı ürünler etkilenmez.`
    });
  };

  const handleDeleteOrder = (id: string, userName: string) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'order',
      id,
      title: `${userName} tarafından oluşturulan siparişi silmek istediğine emin misin?`
    });
  };

  const executeDelete = async () => {
    const { type, id } = deleteConfirm;
    try {
      if (type === 'item') {
        await db.deleteInventoryItem(id);
      } else if (type === 'category') {
        await db.deleteInventoryCategory(id);
      } else if (type === 'order') {
        await db.deleteOrder(id);
        if (onOrdersUpdate) onOrdersUpdate();
      }
      setDeleteConfirm({ ...deleteConfirm, isOpen: false });
      await loadData();
    } catch (err: any) {
      console.error(`${type} silme hatası:`, err);
      alert("Silme işlemi başarısız oldu: " + (err.message || "Bilinmeyen hata"));
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      alert("Lütfen kategori adı girin.");
      return;
    }
    setIsSavingCategory(true);
    try {
      await db.upsertInventoryCategory({
        id: editingCategory?.id || '',
        name: categoryName.trim()
      });
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      setCategoryName('');
      await loadData();
    } catch (err: any) {
      console.error("Kategori kaydetme hatası:", err);
      alert("Kategori kaydedilemedi: " + (err.message || "Bilinmeyen hata"));
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: 'PENDING' | 'COMPLETED') => {
    try {
      await db.updateOrderStatus(orderId, status);
      await loadData();
      if (onOrdersUpdate) onOrdersUpdate();
    } catch (err) {
      console.error("Sipariş güncelleme hatası:", err);
    }
  };

  const handleCopyOrder = (order: InventoryOrder) => {
    const shoppingList = getWholesalerShoppingList(order);
    let text = `*SİPARİŞ LİSTESİ - ${new Date(order.createdAt).toLocaleDateString('tr-TR')}*\n`;
    text += `*Hazırlayan:* ${order.userName}\n\n`;

    let hasItemsToOrder = false;

    Object.entries(shoppingList).forEach(([wholesalerName, items]) => {
      const itemsToOrder = items.filter(i => i.needsOrder);
      if (itemsToOrder.length > 0) {
        hasItemsToOrder = true;
        text += `*Toptancı: ${wholesalerName}*\n`;
        itemsToOrder.forEach(item => {
          text += `- ${item.itemName}: ${item.orderQty} ${item.unit}\n`;
        });
        text += `\n`;
      }
    });

    if (!hasItemsToOrder) {
      alert("Siparişte min stok altında ürün bulunamadı.");
      return;
    }

    navigator.clipboard.writeText(text.trim()).then(() => {
      alert("Sipariş listesi WhatsApp için kopyalandı!");
    }).catch(err => {
      console.error("Kopyalama hatası:", err);
      alert("Kopyalama başarısız oldu.");
    });
  };

  const handleCopyWholesalerOrder = (order: InventoryOrder, wholesalerName: string, items: any[]) => {
    const itemsToOrder = items.filter(i => i.needsOrder);
    
    if (itemsToOrder.length === 0) {
      alert(`${wholesalerName} için sipariş edilecek ürün bulunamadı.`);
      return;
    }

    let text = `*SİPARİŞ: ${wholesalerName}*\n`;
    text += `*Tarih:* ${new Date(order.createdAt).toLocaleDateString('tr-TR')}\n`;
    text += `*Hazırlayan:* ${order.userName}\n\n`;

    itemsToOrder.forEach(item => {
      text += `- ${item.itemName}: ${item.orderQty} ${item.unit}\n`;
    });

    navigator.clipboard.writeText(text.trim()).then(() => {
      alert(`${wholesalerName} sipariş listesi kopyalandı!`);
    }).catch(err => {
      console.error("Kopyalama hatası:", err);
      alert("Kopyalama başarısız oldu.");
    });
  };

  const getWholesalerShoppingList = (order: InventoryOrder) => {
    const list: Record<string, any[]> = {};
    
    order.details?.forEach(detail => {
      const wId = detail.wholesalerId || 'unassigned';
      const wName = wholesalers.find(w => w.id === wId)?.name || 'Toptancısı Belirsiz';
      
      if (!list[wName]) list[wName] = [];
      
      const orderQty = Math.max(0, (detail.itemMinStock || 0) - detail.countedQuantity);
      
      list[wName].push({
        itemName: detail.itemName,
        orderQty,
        countedQty: detail.countedQuantity,
        minStock: detail.itemMinStock,
        unit: detail.itemUnit,
        needsOrder: orderQty > 0
      });
    });
    
    return list;
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-400 font-bold animate-pulse">YÜKLENİYOR...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <Package className="text-indigo-600" />
            Envanter & Sipariş Yönetimi
          </h2>
          <p className="text-slate-500 text-sm font-medium">Stok takibi ve sipariş listeleri.</p>
        </div>
        
        <div className="flex bg-slate-100 p-1.5 rounded-2xl overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveSubTab('orders')}
            className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'orders' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Siparişler
          </button>
          <button 
            onClick={() => setActiveSubTab('archive')}
            className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'archive' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Sipariş Arşivi
          </button>
          <button 
            onClick={() => setActiveSubTab('items')}
            className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'items' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Ürün Tanımları
          </button>
          <button 
            onClick={() => setActiveSubTab('categories')}
            className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'categories' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Kategoriler
          </button>
        </div>
      </div>

      {activeSubTab === 'orders' && (
        <div className="space-y-6">
          <div className="space-y-4">
            {orders.filter(o => o.status === 'PENDING').length === 0 ? (
              <div className="bg-white p-12 rounded-[2rem] text-center border-2 border-dashed border-slate-100">
                <ShoppingBag className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">
                  Bekleyen sipariş bildirimi yok
                </p>
              </div>
            ) : (
              orders
                .filter(o => o.status === 'PENDING')
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map(order => {
                  const shoppingList = getWholesalerShoppingList(order);
                  return (
                    <div key={order.id} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden transition-all">
                      <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-50">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-amber-50 text-amber-500">
                            <Clock />
                          </div>
                          <div>
                            <h3 className="font-black text-slate-800">{order.userName}</h3>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                              {new Date(order.createdAt).toLocaleString('tr-TR')}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleCopyOrder(order)}
                            className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 transition-all flex items-center gap-2"
                            title="WhatsApp için Kopyala"
                          >
                            <Copy size={18} />
                            <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest">WhatsApp</span>
                          </button>
                          
                          <button 
                            onClick={() => handleUpdateOrderStatus(order.id, 'COMPLETED')}
                            className="px-6 py-3 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg shadow-emerald-200"
                          >
                            <CheckCircle2 size={16} /> Tamamlandı
                          </button>

                          <button 
                            onClick={() => handleDeleteOrder(order.id, order.userName || 'Bilinmeyen')}
                            className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>

                      <div className="p-6 bg-slate-50/30">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {Object.entries(shoppingList).map(([wholesalerName, items]) => (
                            <div key={wholesalerName} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="font-black text-indigo-600 text-xs uppercase tracking-widest flex items-center gap-2">
                                  <Truck size={14} /> {wholesalerName}
                                </h4>
                                <button 
                                  onClick={() => handleCopyWholesalerOrder(order, wholesalerName, items)}
                                  className="p-2 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                  title={`${wholesalerName} listesini kopyala`}
                                >
                                  <Copy size={14} />
                                </button>
                              </div>
                              <ul className="space-y-3">
                                {items.map((item, idx) => (
                                  <li key={idx} className="flex items-center justify-between gap-2 border-b border-slate-50 pb-2 last:border-0">
                                    <div className="flex flex-col">
                                      <span className="text-sm font-bold text-slate-700">{item.itemName}</span>
                                      <span className="text-[10px] text-slate-400 font-medium tracking-tight">Sayım: {item.countedQty} / Min: {item.minStock}</span>
                                    </div>
                                    {item.needsOrder ? (
                                      <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-black whitespace-nowrap">
                                        +{item.orderQty} SİPARİŞ
                                      </span>
                                    ) : (
                                      <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black whitespace-nowrap">
                                        YETERLİ
                                      </span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                              {items.length === 0 && (
                                <p className="text-[10px] text-slate-400 font-bold uppercase italic">Eksik ürün yok</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'archive' && (
        <div className="space-y-6">
          <div className="space-y-4">
            {orders.filter(o => o.status === 'COMPLETED').length === 0 ? (
              <div className="bg-white p-12 rounded-[2rem] text-center border-2 border-dashed border-slate-100">
                <CheckCircle2 className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">
                  Tamamlanmış sipariş yok
                </p>
              </div>
            ) : (
              orders
                .filter(o => o.status === 'COMPLETED')
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map(order => {
                  const shoppingList = getWholesalerShoppingList(order);
                  return (
                    <div key={order.id} className="bg-white rounded-[2.5rem] shadow-sm border border-emerald-100 overflow-hidden transition-all opacity-80 hover:opacity-100">
                      <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-50">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-emerald-50 text-emerald-500">
                            <CheckCircle2 />
                          </div>
                          <div>
                            <h3 className="font-black text-slate-800">{order.userName}</h3>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                              {new Date(order.createdAt).toLocaleString('tr-TR')}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleUpdateOrderStatus(order.id, 'PENDING')}
                            className="px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                          >
                            Geri Al
                          </button>
                          <button 
                            onClick={() => handleDeleteOrder(order.id, order.userName || 'Bilinmeyen')}
                            className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>

                      <div className="p-6 bg-slate-50/10">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {Object.entries(shoppingList).map(([wholesalerName, items]) => (
                            <div key={wholesalerName} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm opacity-60">
                              <h4 className="font-black text-slate-400 text-xs uppercase tracking-widest flex items-center gap-2 mb-4">
                                <Truck size={14} /> {wholesalerName}
                              </h4>
                              <ul className="space-y-3">
                                {items.map((item, idx) => (
                                  <li key={idx} className="flex items-center justify-between gap-2 border-b border-slate-50 pb-2 last:border-0">
                                    <div className="flex flex-col">
                                      <span className="text-sm font-bold text-slate-500">{item.itemName}</span>
                                      <span className="text-[10px] text-slate-400 font-medium tracking-tight">Sayım: {item.countedQty} / Min: {item.minStock}</span>
                                    </div>
                                    {item.needsOrder && (
                                      <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black whitespace-nowrap">
                                        +{item.orderQty} SİPARİŞ
                                      </span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'items' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
             <div className="flex gap-2">
                <button 
                  onClick={() => setIsBulkModalOpen(true)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2"
                >
                  <FileText size={16} /> Toplu Ekle
                </button>
             </div>
            <button 
              onClick={() => {
                setEditingItem(null);
                setItemForm({ name: '', category: '', wholesalerId: null, minStock: 0, unit: 'Adet' });
                setIsItemModalOpen(true);
              }}
              className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-200"
            >
              <Plus size={18} /> Yeni Ürün Ekle
            </button>
          </div>

          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Ürün Adı</th>
                  <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Kategori</th>
                  <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Toptancı</th>
                  <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Min Stok</th>
                  <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-5 font-bold text-slate-800">{item.name}</td>
                    <td className="p-5">
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                        {item.category}
                      </span>
                    </td>
                    <td className="p-5 text-sm text-slate-500 font-medium">
                      {wholesalers.find(w => w.id === item.wholesalerId)?.name || '-'}
                    </td>
                    <td className="p-5 text-center">
                      <div className="flex items-center justify-center gap-2 group/min">
                        <input 
                          type="number"
                          className="w-16 px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg text-center font-black text-slate-700 outline-none focus:border-indigo-500 transition-all"
                          value={item.minStock}
                          onChange={e => handleInlineMinStockUpdate(item, Number(e.target.value))}
                        />
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.unit}</span>
                      </div>
                    </td>
                    <td className="p-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => {
                            setEditingItem(item);
                            setItemForm({
                              name: item.name,
                              category: item.category,
                              wholesalerId: item.wholesalerId,
                              minStock: item.minStock,
                              unit: item.unit
                            });
                            setIsItemModalOpen(true);
                          }}
                          className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteItem(item.id, item.name)}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button 
              onClick={() => {
                setEditingCategory(null);
                setCategoryName('');
                setIsCategoryModalOpen(true);
              }}
              className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-200"
            >
              <Plus size={18} /> Yeni Kategori Ekle
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(cat => (
              <div key={cat.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                    <Settings2 size={20} />
                  </div>
                  <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">{cat.name}</h3>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => {
                      setEditingCategory(cat);
                      setCategoryName(cat.name);
                      setIsCategoryModalOpen(true);
                    }}
                    className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteCategory(cat.id, cat.name)}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Item Modal */}
      {isItemModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-slate-800">
                {editingItem ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle'}
              </h3>
              <button onClick={() => setIsItemModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X /></button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Ürün Adı</label>
                <input 
                  type="text"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-bold transition-all"
                  placeholder="Örn: Gin, Tonik, Limon..."
                  value={itemForm.name}
                  onChange={e => setItemForm({...itemForm, name: e.target.value})}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2 ml-1">
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest">Kategori</label>
                  <button 
                    type="button"
                    onClick={() => setShowQuickAddCategory(!showQuickAddCategory)}
                    className="text-[10px] font-black uppercase text-indigo-600 tracking-widest hover:underline"
                  >
                    {showQuickAddCategory ? 'Listeden Seç' : '+ Yeni Kategori'}
                  </button>
                </div>
                
                {showQuickAddCategory ? (
                  <input 
                    type="text"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-bold transition-all"
                    placeholder="Yeni kategori adı girin..."
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                  />
                ) : (
                  <select 
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-bold transition-all appearance-none"
                    value={itemForm.category}
                    onChange={e => setItemForm({...itemForm, category: e.target.value})}
                  >
                    <option value="">Kategori Seçin</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Toptancı</label>
                <select 
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-bold transition-all appearance-none"
                  value={itemForm.wholesalerId || ''}
                  onChange={e => setItemForm({...itemForm, wholesalerId: e.target.value || null})}
                >
                  <option value="">Toptancı Seçin</option>
                  {wholesalers.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Min Stok</label>
                  <input 
                    type="number"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-bold transition-all"
                    value={itemForm.minStock}
                    onChange={e => setItemForm({...itemForm, minStock: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Birim</label>
                  <input 
                    type="text"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-bold transition-all"
                    placeholder="Adet, Kg, Lt..."
                    value={itemForm.unit}
                    onChange={e => setItemForm({...itemForm, unit: e.target.value})}
                  />
                </div>
              </div>

              <button 
                onClick={handleSaveItem}
                disabled={isSavingItem}
                className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSavingItem ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                {isSavingItem ? 'KAYDEDİLİYOR...' : (editingItem ? 'GÜNCELLE' : 'KAYDET')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Add Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-slate-800">Toplu Ürün Ekle</h3>
              <button onClick={() => setIsBulkModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X /></button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Kategori</label>
                <select 
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-bold transition-all appearance-none"
                  value={bulkCategory}
                  onChange={e => setBulkCategory(e.target.value)}
                >
                  <option value="">Kategori Seçin</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Toptancı (Opsiyonel)</label>
                <select 
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-bold transition-all appearance-none"
                  value={bulkWholesalerId || ''}
                  onChange={e => setBulkWholesalerId(e.target.value || null)}
                >
                  <option value="">Toptancı Seçin</option>
                  {wholesalers.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Ürün İsimleri (Her satıra bir isim)</label>
                <textarea 
                  rows={6}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-bold transition-all resize-none"
                  placeholder="Gin&#10;Tonik&#10;Limon..."
                  value={bulkNames}
                  onChange={e => setBulkNames(e.target.value)}
                />
              </div>

              <button 
                onClick={handleBulkAdd}
                disabled={isBulkSaving}
                className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isBulkSaving ? <Loader2 className="animate-spin" /> : <Plus size={20} />}
                {isBulkSaving ? 'EKLENİYOR...' : 'ÜRÜNLERİ EKLE'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-slate-800">
                {editingCategory ? 'Kategoriyi Düzenle' : 'Yeni Kategori Ekle'}
              </h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X /></button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Kategori Adı</label>
                <input 
                  type="text"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-bold transition-all"
                  placeholder="Örn: Alkol, Mutfak, Temizlik..."
                  value={categoryName}
                  onChange={e => setCategoryName(e.target.value)}
                />
              </div>

              <button 
                onClick={handleSaveCategory}
                disabled={isSavingCategory}
                className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSavingCategory ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                {isSavingCategory ? 'KAYDEDİLİYOR...' : (editingCategory ? 'GÜNCELLE' : 'KAYDET')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 text-center">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={40} />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Emin misin?</h3>
            <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed">
              {deleteConfirm.title}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setDeleteConfirm({ ...deleteConfirm, isOpen: false })}
                className="py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
              >
                VAZGEÇ
              </button>
              <button 
                onClick={executeDelete}
                className="py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-600 transition-all shadow-lg shadow-red-100"
              >
                EVET, SİL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminInventory;
