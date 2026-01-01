
import React, { useState, useEffect, useMemo } from 'react';
import { Wholesaler, AccTransaction, AccTransactionType } from '../types';
import { db } from '../services/supabaseService';
import { 
  Truck, 
  Receipt, 
  Wallet, 
  Plus, 
  Trash2, 
  ChevronRight, 
  X, 
  Calendar, 
  AlertCircle, 
  History, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownLeft,
  Search,
  RefreshCw,
  Phone,
  Clock,
  ChevronLeft,
  Calculator,
  Save,
  Edit2,
  ShieldAlert,
  AlertTriangle,
  Info,
  Check
} from 'lucide-react';

type AccountingTab = 'dashboard' | 'wholesalers' | 'transactions';

const AdminAccounting: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<AccountingTab>('dashboard');
  const [wholesalers, setWholesalers] = useState<Wholesaler[]>([]);
  const [transactions, setTransactions] = useState<AccTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWholesalerId, setSelectedWholesalerId] = useState<string | null>(null);
  
  // Calendar States
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDayForVade, setSelectedDayForVade] = useState<string | null>(new Date().toISOString().split('T')[0]);

  // Modals
  const [isWModalOpen, setIsWModalOpen] = useState(false);
  const [isTModalOpen, setIsTModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  
  // Security Modals for Wholesaler Delete
  const [deleteWConfirmId, setDeleteWConfirmId] = useState<string | null>(null);
  const [finalDeleteWConfirmId, setFinalDeleteWConfirmId] = useState<string | null>(null);
  const [confirmationInput, setConfirmationInput] = useState('');

  // Individual Transaction Delete Modal
  const [deleteTConfirmId, setDeleteTConfirmId] = useState<string | null>(null);

  // Forms
  const [wForm, setWForm] = useState<{name: string; openingBalance: string}>({ name: '', openingBalance: '' });
  const [tForm, setTForm] = useState<Partial<AccTransaction>>({ type: 'PURCHASE', date: new Date().toISOString().split('T')[0] });

  // Body scroll lock effect
  useEffect(() => {
    const anyModalOpen = isWModalOpen || isTModalOpen || deleteWConfirmId || finalDeleteWConfirmId || deleteTConfirmId;
    if (anyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { 
      document.body.style.overflow = 'unset';
    };
  }, [isWModalOpen, isTModalOpen, deleteWConfirmId, finalDeleteWConfirmId, deleteTConfirmId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [w, t] = await Promise.all([db.getWholesalers(), db.getAccTransactions()]);
      setWholesalers(w);
      setTransactions(t);
    } catch (e) {
      console.error("Yükleme Hatası:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  // Tarih Formatı: 15/05/2024 - Çarşamba
  const formatFullDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      const d = date.getDate().toString().padStart(2, '0');
      const m = (date.getMonth() + 1).toString().padStart(2, '0');
      const y = date.getFullYear();
      const dayName = date.toLocaleDateString('tr-TR', { weekday: 'long' });
      return `${d}/${m}/${y} - ${dayName}`;
    } catch (e) {
      return dateStr;
    }
  };

  // Toptancı Bazlı Net Bakiyeler
  const wholesalerBalances = useMemo(() => {
    return wholesalers.map(w => {
      const wTrans = transactions.filter(t => t.wholesalerId === w.id);
      const balance = wTrans.reduce((acc, curr) => {
        return curr.type === 'PURCHASE' ? acc + curr.amount : acc - curr.amount;
      }, 0);
      return { ...w, balance };
    }).sort((a, b) => b.balance - a.balance);
  }, [wholesalers, transactions]);

  const totalDebt = wholesalerBalances.reduce((acc, curr) => acc + curr.balance, 0);

  // AKILLI VADE TAKİBİ (FIFO): Sadece ödenmemiş faturaları baz alır
  const allUnpaidVades = useMemo(() => {
    const today = new Date();
    const list: any[] = [];

    wholesalers.forEach(w => {
      const wTrans = transactions.filter(t => t.wholesalerId === w.id);
      let totalPaid = wTrans.filter(t => t.type === 'PAYMENT').reduce((acc, curr) => acc + curr.amount, 0);

      const purchases = wTrans
        .filter(t => t.type === 'PURCHASE')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      purchases.forEach(p => {
        const paidForThis = Math.min(p.amount, totalPaid);
        totalPaid -= paidForThis;
        const remainingDebtForThis = p.amount - paidForThis;

        if (remainingDebtForThis > 0 && p.dueDate) {
          list.push({
            ...p,
            wholesalerName: w.name,
            unpaidAmount: remainingDebtForThis
          });
        }
      });
    });

    return list;
  }, [wholesalers, transactions]);

  // Dashboard Vade Listesi (Sadece Acil Olanlar: Geçmiş veya 6 Günden Az Kalanlar)
  const upcomingPayments = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Karşılaştırma için saati sıfırla

    return allUnpaidVades.filter(p => {
      const dDate = new Date(p.dueDate);
      dDate.setHours(0, 0, 0, 0);
      const diffDays = (dDate.getTime() - today.getTime()) / (1000 * 3600 * 24);
      
      // Kanka burada <= 6 diyerek hem geçmiştekileri (eksi değerler) 
      // hem de önümüzdeki 6 günü yakalıyoruz.
      return diffDays <= 6; 
    }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [allUnpaidVades]);

  // AKILLI BAKIYE YAŞLANDIRMA (LIFO)
  const agingStats = useMemo(() => {
    const today = new Date();
    const stats = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };

    wholesalers.forEach(w => {
      const wTrans = transactions.filter(t => t.wholesalerId === w.id);
      const balance = wTrans.reduce((acc, curr) => curr.type === 'PURCHASE' ? acc + curr.amount : acc - curr.amount, 0);
      if (balance <= 0) return;
      const purchases = wTrans.filter(t => t.type === 'PURCHASE').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      let remainingToAllocate = balance;
      for (const p of purchases) {
        if (remainingToAllocate <= 0) break;
        const amountToPlace = Math.min(p.amount, remainingToAllocate);
        const diffDays = Math.floor((today.getTime() - new Date(p.date).getTime()) / (1000 * 3600 * 24));
        if (diffDays <= 30) stats['0-30'] += amountToPlace;
        else if (diffDays <= 60) stats['31-60'] += amountToPlace;
        else if (diffDays <= 90) stats['61-90'] += amountToPlace;
        else stats['90+'] += amountToPlace;
        remainingToAllocate -= amountToPlace;
      }
      if (remainingToAllocate > 0) stats['90+'] += remainingToAllocate;
    });
    return stats;
  }, [wholesalers, transactions]);

  const handleAddWholesaler = async () => {
    if (!wForm.name.trim()) return;
    setBusy(true);
    try {
      const newId = Math.random().toString(36).substr(2, 9);
      const newW: Wholesaler = { id: newId, name: wForm.name.trim() };
      await db.upsertWholesaler(newW);
      const ob = parseFloat(wForm.openingBalance);
      if (!isNaN(ob) && ob > 0) {
        const openingT: AccTransaction = {
          id: Math.random().toString(36).substr(2, 9),
          wholesalerId: newId,
          type: 'PURCHASE',
          amount: ob,
          date: new Date().toISOString().split('T')[0],
          note: 'Açılış Bakiyesi'
        };
        await db.upsertAccTransaction(openingT);
        setTransactions(prev => [...prev, openingT]);
      }
      setWholesalers(prev => [...prev, newW]);
      setIsWModalOpen(false);
      setWForm({ name: '', openingBalance: '' });
    } catch (e) { console.error(e); } finally { setBusy(false); }
  };

  const handleAddTransaction = async () => {
    if (!tForm.wholesalerId || !tForm.amount || !tForm.date) return;
    setBusy(true);
    try {
      const newT: AccTransaction = { 
        id: tForm.id || Math.random().toString(36).substr(2, 9), 
        wholesalerId: tForm.wholesalerId, 
        type: tForm.type || 'PURCHASE', 
        amount: Number(tForm.amount), 
        date: tForm.date, 
        dueDate: tForm.dueDate, 
        note: tForm.note 
      };
      await db.upsertAccTransaction(newT);
      if (tForm.id) setTransactions(prev => prev.map(t => t.id === tForm.id ? newT : t));
      else setTransactions(prev => [...prev, newT]);
      setIsTModalOpen(false);
      setTForm({ type: 'PURCHASE', date: new Date().toISOString().split('T')[0] });
    } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  };

  const executeDeleteWholesaler = async (id: string) => {
    setBusy(true);
    try {
      await db.deleteWholesaler(id);
      setWholesalers(prev => prev.filter(w => w.id !== id));
      setTransactions(prev => prev.filter(t => t.wholesalerId !== id));
      if (selectedWholesalerId === id) setSelectedWholesalerId(null);
      setFinalDeleteWConfirmId(null);
      setConfirmationInput('');
    } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  };

  const executeDeleteTransaction = async () => {
    if (!deleteTConfirmId) return;
    setBusy(true);
    try {
      await db.deleteAccTransaction(deleteTConfirmId);
      setTransactions(prev => prev.filter(t => t.id !== deleteTConfirmId));
      setDeleteTConfirmId(null);
    } catch (e: any) { alert("Hata kanka: " + e.message); } finally { setBusy(false); }
  };

  const editTransaction = (t: AccTransaction) => {
    setTForm(t);
    setIsTModalOpen(true);
  };

  // Calendar Helpers
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1).getDay();
  const calendarDaysCount = getDaysInMonth(calendarDate.getFullYear(), calendarDate.getMonth());

  const vadesInSelectedMonth = useMemo(() => {
    return allUnpaidVades.filter(p => {
      const d = new Date(p.dueDate);
      return d.getMonth() === calendarDate.getMonth() && d.getFullYear() === calendarDate.getFullYear();
    });
  }, [allUnpaidVades, calendarDate]);

  const wholesalerToDelete = wholesalers.find(w => w.id === (finalDeleteWConfirmId || deleteWConfirmId));
  const expectedPhrase = wholesalerToDelete ? `"${wholesalerToDelete.name}" adlı toptancıyı gerçekten silmek istiyorum yemin ederim` : '';

  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-[1400px] mx-auto px-4 lg:px-0 relative z-[1]">
      
      {/* Toptancı Silme Güvenlik Modalları */}
      {deleteWConfirmId && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[9999] flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full text-center shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="bg-red-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"><AlertTriangle className="text-red-500 w-10 h-10" /></div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">Emin misin kanka?</h3>
            <p className="text-slate-500 text-sm font-medium mb-8">Bu toptancıyı ve tüm ekstre geçmişini geri alınamaz şekilde silmek üzeresin.</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => { setFinalDeleteWConfirmId(deleteWConfirmId); setDeleteWConfirmId(null); }} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black hover:bg-red-700 transition-all uppercase tracking-widest text-xs">İLERLE</button>
              <button onClick={() => setDeleteWConfirmId(null)} className="w-full bg-slate-100 text-slate-500 py-4 rounded-2xl font-black hover:bg-slate-200 transition-all uppercase tracking-widest text-xs">VAZGEÇ</button>
            </div>
          </div>
        </div>
      )}

      {finalDeleteWConfirmId && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[9999] flex items-center justify-center p-6 animate-in zoom-in-95">
          <div className="bg-white rounded-[3rem] p-12 max-w-lg w-full shadow-2xl border-4 border-red-500/20 overflow-y-auto max-h-[95vh]">
            <div className="bg-red-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-red-200"><ShieldAlert className="text-white w-10 h-10" /></div>
            <h3 className="text-3xl font-black text-slate-800 text-center mb-4 uppercase tracking-tight">SON GÜVENLİK!</h3>
            <p className="text-slate-500 text-center font-bold mb-8 leading-relaxed text-sm">Yanlışlıkla silme diye kanka, lütfen aşağıdaki cümleyi yaz: <br/> <span className="text-red-600 select-all font-mono text-xs block mt-3 bg-red-50 p-3 rounded-xl">{expectedPhrase}</span></p>
            <input type="text" placeholder="Cümleyi aynen yaz kanka..." className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 focus:border-red-500 rounded-2xl outline-none font-bold mb-8 text-sm" value={confirmationInput} onChange={(e) => setConfirmationInput(e.target.value)} />
            <div className="flex flex-col gap-3">
              <button disabled={busy || confirmationInput !== expectedPhrase} onClick={() => executeDeleteWholesaler(finalDeleteWConfirmId)} className="w-full py-5 rounded-2xl font-black uppercase tracking-widest bg-red-600 text-white disabled:bg-slate-100 disabled:text-slate-300 transition-all shadow-xl shadow-red-100">{busy ? <RefreshCw className="animate-spin" /> : 'EVET, HER ŞEYİ SİL!'}</button>
              <button onClick={() => { setFinalDeleteWConfirmId(null); setConfirmationInput(''); }} className="w-full bg-slate-50 text-slate-400 py-4 rounded-2xl font-black uppercase tracking-widest text-xs">VAZGEÇTİM</button>
            </div>
          </div>
        </div>
      )}

      {deleteTConfirmId && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[9999] flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full text-center shadow-2xl overflow-y-auto max-h-[90vh] border-t-8 border-red-500">
            <div className="bg-red-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-red-500 animate-pulse"><Trash2 size={40} /></div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">Bu Kayıt Silinsin mi?</h3>
            <p className="text-slate-500 text-sm font-bold mb-8 leading-relaxed">Kanka bu faturayı/ödemeyi siliyoruz, <br/> geri dönüşü olmayacak ona göre!</p>
            <div className="grid grid-cols-2 gap-4">
              <button disabled={busy} onClick={executeDeleteTransaction} className="bg-red-600 text-white py-4 rounded-2xl font-black hover:bg-red-700 transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2">{busy ? <RefreshCw className="animate-spin" size={16} /> : <Check size={16} />} EVET, SİL</button>
              <button onClick={() => setDeleteTConfirmId(null)} className="bg-slate-100 text-slate-500 py-4 rounded-2xl font-black hover:bg-slate-200 transition-all text-xs uppercase tracking-widest">HAYIR, KALSIN</button>
            </div>
          </div>
        </div>
      )}

      {/* Header & Stats */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-600 p-3 rounded-2xl shadow-lg shadow-emerald-100"><Calculator className="text-white w-6 h-6" /></div>
          <div><h2 className="text-3xl font-black text-slate-800 tracking-tight">Ön Muhasebe</h2><p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Tedarikçi ve Kasa Yönetimi</p></div>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm w-full lg:w-auto">
          <button onClick={() => setActiveSubTab('dashboard')} className={`flex-1 lg:flex-none px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeSubTab === 'dashboard' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Özet</button>
          <button onClick={() => setActiveSubTab('wholesalers')} className={`flex-1 lg:flex-none px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeSubTab === 'wholesalers' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Toptancılar</button>
        </div>
      </div>

      {activeSubTab === 'dashboard' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1 bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-10"><Wallet size={80} /></div>
               <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Net Toplam Borç</p>
               <p className="text-3xl font-black mt-2 text-emerald-400">{totalDebt.toLocaleString()} TL</p>
               <button onClick={() => { setTForm({ type: 'PURCHASE', date: new Date().toISOString().split('T')[0] }); setIsTModalOpen(true); }} className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition-all"><Plus size={14}/> Yeni İşlem</button>
            </div>
            <div className="md:col-span-3 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(agingStats).map(([range, val]) => (
                  <div key={range} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:border-emerald-300">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{range} GÜN</p>
                    <p className="text-lg font-black text-slate-800 mt-1">{val.toLocaleString()} TL</p>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden"><div className="bg-emerald-500 h-full" style={{ width: `${(Number(val) / (totalDebt || 1)) * 100}%` }} /></div>
                  </div>
                ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <h3 className="font-black text-slate-800 uppercase tracking-tight flex items-center gap-3"><div className="w-1.5 h-6 bg-orange-500 rounded-full" /> Ödenmemiş Vadeler</h3>
                <span className="text-[10px] font-black bg-orange-50 text-orange-600 px-3 py-1 rounded-full">{upcomingPayments.length} Kayıt</span>
              </div>
              <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[400px]">
                {upcomingPayments.map(p => {
                  const isPast = new Date(p.dueDate!) < new Date();
                  return (
                    <div key={p.id} className={`p-5 rounded-2xl border flex items-center justify-between group transition-all ${isPast ? 'bg-red-50/50 border-red-100' : 'bg-slate-50 border-slate-100 hover:border-emerald-200'}`}>
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${isPast ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}><Clock size={18} /></div>
                        <div><p className="font-black text-slate-800 text-sm">{p.wholesalerName}</p><p className={`text-[10px] font-black uppercase ${isPast ? 'text-red-500' : 'text-slate-400'}`}>{isPast ? 'GECİKTİ' : 'VADE'}: {formatFullDate(p.dueDate!)}</p></div>
                      </div>
                      <div className="text-right"><p className="font-black text-slate-800">{p.unpaidAmount.toLocaleString()} TL</p><p className="text-[9px] font-bold text-slate-400">Net Alacak</p></div>
                    </div>
                  );
                })}
                {upcomingPayments.length === 0 && <div className="flex flex-col items-center justify-center p-12 text-center opacity-40"><Check className="w-8 h-8 text-emerald-500 mb-2" /><p className="text-xs font-bold uppercase tracking-widest text-slate-500">Yakın Vadeli Borç Yok Kanka!</p></div>}
              </div>
            </div>

            <div className="lg:col-span-7 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between"><h3 className="font-black text-slate-800 uppercase tracking-tight flex items-center gap-3"><div className="w-1.5 h-6 bg-emerald-500 rounded-full" /> Toptancı Bakiyeleri</h3></div>
              <div className="flex-1 overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest"><tr><th className="px-8 py-5 text-left">Tedarikçi</th><th className="px-8 py-5 text-right">Net Bakiye</th><th className="px-8 py-5"></th></tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {wholesalerBalances.slice(0, 5).map(w => (
                      <tr key={w.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-5"><p className="font-black text-slate-700">{w.name}</p></td>
                        <td className="px-8 py-5 text-right font-black text-emerald-600">{w.balance.toLocaleString()} TL</td>
                        <td className="px-8 py-5 text-right"><button onClick={() => { setSelectedWholesalerId(w.id); setActiveSubTab('wholesalers'); }} className="p-2 text-slate-300 hover:text-emerald-500 transition-colors"><ChevronRight size={18} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* VADE TAKVİMİ BÖLÜMÜ */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
               <h3 className="font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                 <div className="w-1.5 h-6 bg-indigo-600 rounded-full" /> Vade Takvimi
               </h3>
               <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 w-full sm:w-auto justify-between">
                 <button onClick={() => setCalendarDate(new Date(calendarDate.setMonth(calendarDate.getMonth() - 1)))} className="p-1 hover:bg-white rounded-lg transition-colors"><ChevronLeft size={20} /></button>
                 <span className="text-xs font-black text-slate-700 uppercase tracking-widest">
                   {calendarDate.toLocaleString('tr-TR', { month: 'long', year: 'numeric' })}
                 </span>
                 <button onClick={() => setCalendarDate(new Date(calendarDate.setMonth(calendarDate.getMonth() + 1)))} className="p-1 hover:bg-white rounded-lg transition-colors"><ChevronRight size={20} /></button>
               </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12">
              <div className="xl:col-span-8 p-6 md:p-8">
                 <div className="grid grid-cols-7 gap-1 md:gap-2 mb-4">
                   {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(d => (
                     <div key={d} className="text-center text-[9px] font-black text-slate-300 uppercase py-2">{d}</div>
                   ))}
                 </div>
                 <div className="grid grid-cols-7 gap-1 md:gap-2">
                   {Array.from({ length: firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1 }).map((_, i) => (
                     <div key={`empty-${i}`} className="h-12 md:h-20 lg:h-24" />
                   ))}
                   {Array.from({ length: calendarDaysCount }).map((_, i) => {
                     const dayNum = i + 1;
                     const dayStr = `${calendarDate.getFullYear()}-${(calendarDate.getMonth() + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
                     const hasVades = vadesInSelectedMonth.filter(v => v.dueDate === dayStr);
                     const isToday = new Date().toISOString().split('T')[0] === dayStr;
                     const isSelected = selectedDayForVade === dayStr;
                     
                     return (
                       <div 
                         key={dayNum} 
                         onClick={() => setSelectedDayForVade(dayStr)}
                         className={`h-12 md:h-20 lg:h-24 border rounded-xl md:rounded-2xl p-2 cursor-pointer transition-all flex flex-col justify-between relative group ${
                           isSelected ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-100' : 
                           hasVades.length > 0 ? 'bg-orange-50/50 border-orange-100 hover:border-orange-300' :
                           'bg-slate-50/30 border-slate-50 hover:bg-white hover:border-slate-200'
                         }`}
                       >
                         <span className={`text-[10px] md:text-sm font-black ${isSelected ? 'text-white' : isToday ? 'text-indigo-600' : 'text-slate-400'}`}>
                           {dayNum}
                         </span>
                         {hasVades.length > 0 && (
                           <div className="flex flex-wrap gap-0.5 md:gap-1 mt-auto">
                              {hasVades.slice(0, 3).map((v, idx) => (
                                <div key={idx} className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-orange-500'}`} />
                              ))}
                              {hasVades.length > 3 && <span className={`text-[7px] md:text-[9px] font-black ${isSelected ? 'text-white' : 'text-orange-500'}`}>+</span>}
                           </div>
                         )}
                       </div>
                     );
                   })}
                 </div>
              </div>

              <div className="xl:col-span-4 bg-slate-50/50 border-l border-slate-50 p-6 md:p-8">
                 <div className="mb-6">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Seçilen Gün</p>
                   <h4 className="text-sm font-black text-slate-800">{formatFullDate(selectedDayForVade || '')}</h4>
                 </div>
                 <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                   {vadesInSelectedMonth.filter(v => v.dueDate === selectedDayForVade).length > 0 ? (
                     vadesInSelectedMonth.filter(v => v.dueDate === selectedDayForVade).map((v, idx) => (
                       <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm animate-in slide-in-from-right-4">
                         <div className="flex justify-between items-start mb-2">
                           <p className="font-black text-slate-700 text-xs">{v.wholesalerName}</p>
                           <span className="text-[10px] font-black text-orange-600">{v.unpaidAmount.toLocaleString()} TL</span>
                         </div>
                         <p className="text-[9px] font-medium text-slate-400 leading-tight italic">{v.note || 'Not yok'}</p>
                       </div>
                     ))
                   ) : (
                     <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
                       <div className="bg-slate-100 p-4 rounded-full mb-3"><Check className="text-emerald-500" /></div>
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Bu tarihte vade yok kanka!</p>
                     </div>
                   )}
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'wholesalers' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-4">
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
               <div className="flex justify-between items-center mb-6"><h3 className="font-black text-slate-800 uppercase text-sm tracking-tight">Cari Listesi</h3><button onClick={() => { setWForm({ name: '', openingBalance: '' }); setIsWModalOpen(true); }} className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all"><Plus size={18}/></button></div>
               <div className="space-y-2 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                 {wholesalerBalances.map(w => (
                   <div key={w.id} onClick={() => setSelectedWholesalerId(w.id)} className={`p-4 rounded-2xl cursor-pointer transition-all border flex items-center justify-between group ${selectedWholesalerId === w.id ? 'bg-emerald-600 border-emerald-500 shadow-lg shadow-emerald-100' : 'bg-slate-50 border-slate-50 hover:bg-white hover:border-emerald-200'}`}>
                     <div><p className={`font-black text-sm ${selectedWholesalerId === w.id ? 'text-white' : 'text-slate-800'}`}>{w.name}</p><p className={`text-[9px] font-bold uppercase tracking-widest ${selectedWholesalerId === w.id ? 'text-emerald-200' : 'text-slate-400'}`}>{w.balance.toLocaleString()} TL</p></div>
                     <ChevronRight size={16} className={selectedWholesalerId === w.id ? 'text-white' : 'text-slate-300'} />
                   </div>
                 ))}
               </div>
            </div>
          </div>
          <div className="lg:col-span-8">
            {selectedWholesalerId ? (
              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[700px]">
                {wholesalers.filter(w => w.id === selectedWholesalerId).map(w => {
                  const balance = wholesalerBalances.find(wb => wb.id === w.id)?.balance || 0;
                  return (
                    <div key={w.id} className="p-8 border-b border-slate-50 bg-slate-50/50">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-5">
                          <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 text-emerald-600"><Truck size={32} /></div>
                          <div><h3 className="text-2xl font-black text-slate-800">{w.name}</h3><div className="flex items-center gap-4 mt-1"><span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest"><History size={12}/> {transactions.filter(t => t.wholesalerId === w.id).length} İşlem</span></div></div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GÜNCEL BAKİYE</p>
                          <p className="text-3xl font-black text-emerald-600">{balance.toLocaleString()} TL</p>
                          <div className="flex justify-end gap-2 mt-4"><button onClick={() => setDeleteWConfirmId(w.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button><button onClick={() => { setTForm({ wholesalerId: w.id, type: 'PURCHASE', date: new Date().toISOString().split('T')[0] }); setIsTModalOpen(true); }} className="bg-emerald-600 text-white px-5 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all">İŞLEM EKLE</button></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="flex-1 overflow-x-auto">
                   <table className="w-full text-left">
                     <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest"><tr><th className="px-8 py-5">Tarih</th><th className="px-8 py-5">İşlem</th><th className="px-8 py-5">Not</th><th className="px-8 py-5 text-right">Borç (+)</th><th className="px-8 py-5 text-right">Ödeme (-)</th><th className="px-8 py-5 text-right">İşlem</th></tr></thead>
                     <tbody className="divide-y divide-slate-50">
                       {transactions.filter(t => t.wholesalerId === selectedWholesalerId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => (
                           <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                             <td className="px-8 py-5"><p className="font-bold text-slate-600 text-[11px] leading-tight">{formatFullDate(t.date)}</p>{t.dueDate && <p className="text-[9px] font-black text-orange-400 uppercase tracking-tighter mt-1">Vade: {formatFullDate(t.dueDate)}</p>}</td>
                             <td className="px-8 py-5"><span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase ${t.type === 'PURCHASE' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>{t.type === 'PURCHASE' ? 'Satınalma' : 'Ödeme'}</span></td>
                             <td className="px-8 py-5 text-xs font-medium text-slate-500 max-w-[200px] truncate">{t.note || '-'}</td>
                             <td className="px-8 py-5 text-right font-black text-slate-700">{t.type === 'PURCHASE' ? t.amount.toLocaleString() : '-'}</td>
                             <td className="px-8 py-5 text-right font-black text-emerald-600">{t.type === 'PAYMENT' ? t.amount.toLocaleString() : '-'}</td>
                             <td className="px-8 py-5 text-right"><div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => editTransaction(t)} className="p-1.5 text-slate-400 hover:text-emerald-500 rounded-lg hover:bg-white transition-all"><Edit2 size={14}/></button><button onClick={() => setDeleteTConfirmId(t.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-white transition-all"><Trash2 size={14}/></button></div></td>
                           </tr>
                         ))}
                     </tbody>
                   </table>
                </div>
              </div>
            ) : (
              <div className="h-full bg-white rounded-[2.5rem] border border-dashed border-slate-200 flex flex-col items-center justify-center p-20 text-center space-y-6"><div className="bg-slate-50 p-10 rounded-full text-slate-200"><Truck size={64}/></div><div className="max-w-xs"><h3 className="text-xl font-black text-slate-400">Toptancı Seç Kanka</h3><p className="text-sm font-bold text-slate-300 mt-2 italic">Soldaki listeden bir toptancı seçerek ekstre detaylarını ve ödemelerini görebilirsin.</p></div></div>
            )}
          </div>
        </div>
      )}

      {/* Toptancı Ekleme Modal */}
      {isWModalOpen && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[9999] flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="p-10 overflow-y-auto max-h-[90vh]">
               <div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black text-slate-800 tracking-tight">Cari Kart Oluştur</h3><button onClick={() => setIsWModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={24} /></button></div>
               <div className="space-y-6">
                 <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Toptancı Adı</label><input type="text" placeholder="Kasap Hacı, Manav vb." className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none font-bold" value={wForm.name} onChange={e => setWForm({...wForm, name: e.target.value})} /></div>
                 <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Mevcut Borç / Açılış Bakiyesi (TL)</label><input type="number" placeholder="0" className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none font-black text-xl" value={wForm.openingBalance} onChange={e => setWForm({...wForm, openingBalance: e.target.value})} /></div>
               </div>
               <button onClick={handleAddWholesaler} disabled={busy} className="w-full mt-10 bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-3">{busy ? <RefreshCw className="animate-spin" /> : <Save size={20} />} TOPTANCIYI KAYDET</button>
            </div>
          </div>
        </div>
      )}

      {/* İşlem Ekleme Modal */}
      {isTModalOpen && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[9999] flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            <div className="p-10 overflow-y-auto max-h-[90vh]">
               <div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black text-slate-800 tracking-tight text-emerald-600">{tForm.id ? 'İşlemi Düzenle' : 'Yeni Muhasebe Girişi'}</h3><button onClick={() => setIsTModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={24} /></button></div>
               <div className="space-y-5">
                 <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                    <button onClick={() => setTForm({...tForm, type: 'PURCHASE'})} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${tForm.type === 'PURCHASE' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>SATINALMA / BORÇ</button>
                    <button onClick={() => setTForm({...tForm, type: 'PAYMENT'})} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${tForm.type === 'PAYMENT' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>ÖDEME / TAHSİLAT</button>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Tutar (TL)</label><input type="number" className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none font-black text-2xl" value={tForm.amount || ''} onChange={e => setTForm({...tForm, amount: Number(e.target.value)})} /></div>
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Tarih</label><input type="date" className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none font-bold" value={tForm.date || ''} onChange={e => setTForm({...tForm, date: e.target.value})} /></div>
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Toptancı</label>
                   <select className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none font-bold appearance-none" value={tForm.wholesalerId || ''} onChange={e => setTForm({...tForm, wholesalerId: e.target.value})}>
                     <option value="">Seç kanka...</option>
                     {wholesalers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                   </select>
                 </div>
                 {tForm.type === 'PURCHASE' && (<div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3 text-orange-600">Vade Tarihi (Opsiyonel)</label><input type="date" className="w-full px-6 py-4 bg-orange-50 border-2 border-transparent focus:border-orange-500 rounded-2xl outline-none font-bold text-orange-600" value={tForm.dueDate || ''} onChange={e => setTForm({...tForm, dueDate: e.target.value})} /></div>)}
                 <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Not</label><input type="text" placeholder="Fatura no veya detay..." className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none font-bold" value={tForm.note || ''} onChange={e => setTForm({...tForm, note: e.target.value})} /></div>
               </div>
               <button onClick={handleAddTransaction} disabled={busy} className="w-full mt-10 bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all flex items-center justify-center gap-3">{busy ? <RefreshCw className="animate-spin" /> : <Receipt size={20}/>} {tForm.id ? 'İŞLEMİ GÜNCELLE' : (tForm.type === 'PURCHASE' ? 'BORCU KAYDET' : 'ÖDEMEYİ KAYDET')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAccounting;
