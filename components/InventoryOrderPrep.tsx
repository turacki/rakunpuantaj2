
import React, { useState, useEffect } from 'react';
import { db } from '../services/supabaseService';
import { InventoryItem, User } from '../types';
import { Package, ChevronRight, ChevronDown, Plus, Minus, Send, CheckCircle2, Loader2, Search } from 'lucide-react';

interface Props {
  currentUser: User;
  onOrderCreated?: () => void;
}

const InventoryOrderPrep: React.FC<Props> = ({ currentUser, onOrderCreated }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await db.getInventoryItems();
      setItems(data);
      
      // Kategorileri başlangıçta açık yap
      const cats = [...new Set(data.map(i => i.category))];
      const expanded: Record<string, boolean> = {};
      cats.forEach(c => expanded[c] = true);
      setExpandedCategories(expanded);
    } catch (err) {
      console.error("Envanter yükleme hatası:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCountChange = (itemId: string, delta: number) => {
    setCounts(prev => {
      const current = prev[itemId] || 0;
      const next = Math.max(0, current + delta);
      
      // Eğer sayı 0'dan büyükse otomatik seçili yapalım mı? 
      // Kullanıcı talebi: checkbox işaretliyse 0 olsa da eklensin.
      // Sayı > 0 ise zaten ekleniyor.
      return { ...prev, [itemId]: next };
    });
  };

  const toggleSelection = (itemId: string) => {
    setSelectedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handleManualInput = (itemId: string, value: string) => {
    const num = parseInt(value) || 0;
    setCounts(prev => ({ ...prev, [itemId]: Math.max(0, num) }));
  };

  const handleSubmit = async () => {
    // Hem sayımı olanları hem de checkbox ile seçilenleri al
    const details = items
      .filter(item => (counts[item.id] || 0) > 0 || selectedItems[item.id])
      .map(item => ({ 
        itemId: item.id, 
        countedQuantity: counts[item.id] || 0 
      }));

    if (details.length === 0) {
      alert("Lütfen en az bir ürün seçin veya sayım girin.");
      return;
    }

    setSubmitting(true);
    try {
      await db.createInventoryOrder(currentUser.id, details);
      setSuccess(true);
      setCounts({});
      setSelectedItems({});
      if (onOrderCreated) onOrderCreated();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Sipariş gönderme hatası:", err);
      alert("Sipariş gönderilirken bir hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  const categories = ([...new Set(items.map(i => i.category))].sort()) as string[];
  
  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p className="text-sm font-bold uppercase tracking-widest">Ürünler Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pb-32">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
          <Package className="text-indigo-600" />
          Sipariş Hazırla
        </h2>
        <p className="text-slate-500 text-sm mt-1">Eksik ürünleri sayıp listeye ekle.</p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input 
          type="text"
          placeholder="Ürün veya kategori ara..."
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {categories.map(category => {
          const categoryItems = filteredItems.filter(i => i.category === category);
          if (categoryItems.length === 0) return null;

          const isExpanded = expandedCategories[category];

          return (
            <div key={category} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <button 
                onClick={() => setExpandedCategories(prev => ({ ...prev, [category]: !isExpanded }))}
                className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
              >
                <h3 className="font-black text-slate-700 uppercase tracking-wider text-sm">{category}</h3>
                {isExpanded ? <ChevronDown className="text-slate-400" /> : <ChevronRight className="text-slate-400" />}
              </button>

              {isExpanded && (
                <div className="divide-y divide-slate-50">
                  {categoryItems.map(item => (
                    <div key={item.id} className="p-5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1">
                        <div 
                          onClick={() => toggleSelection(item.id)}
                          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                            selectedItems[item.id] || (counts[item.id] || 0) > 0
                              ? 'bg-indigo-600 border-indigo-600 text-white' 
                              : 'border-slate-200 bg-white'
                          }`}
                        >
                          {(selectedItems[item.id] || (counts[item.id] || 0) > 0) && <CheckCircle2 size={14} />}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-slate-800">{item.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Min: {item.minStock} {item.unit}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-100">
                        <button 
                          onClick={() => handleCountChange(item.id, -1)}
                          className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-slate-600 hover:text-indigo-600 active:scale-95 transition-all"
                        >
                          <Minus size={18} />
                        </button>
                        
                        <input 
                          type="number"
                          className="w-12 text-center bg-transparent font-black text-slate-800 outline-none"
                          value={counts[item.id] || 0}
                          onChange={(e) => handleManualInput(item.id, e.target.value)}
                        />

                        <button 
                          onClick={() => handleCountChange(item.id, 1)}
                          className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-slate-600 hover:text-indigo-600 active:scale-95 transition-all"
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md px-6 z-50">
        <button 
          onClick={handleSubmit}
          disabled={submitting || (Object.values(counts).every(v => (v as number) === 0) && Object.values(selectedItems).every(v => !v))}
          className={`w-full py-5 rounded-[2rem] font-black text-white shadow-2xl flex items-center justify-center gap-3 transition-all active:scale-95 ${
            success ? 'bg-emerald-500' : 'bg-indigo-600 hover:bg-indigo-700'
          } disabled:opacity-50 disabled:pointer-events-none`}
        >
          {submitting ? (
            <Loader2 className="animate-spin" />
          ) : success ? (
            <>
              <CheckCircle2 />
              GÖNDERİLDİ!
            </>
          ) : (
            <>
              <Send size={20} />
              SİPARİŞİ TAMAMLA ({items.filter(item => (counts[item.id] || 0) > 0 || selectedItems[item.id]).length} Ürün)
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default InventoryOrderPrep;
