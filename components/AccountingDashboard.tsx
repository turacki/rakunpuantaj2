
import React, { useState, useMemo } from 'react';
import { Wholesaler, AccTransaction } from '../types';
import { db, getLocalDateString } from '../services/supabaseService';
import { ChevronRight, Plus, Calendar, ChevronLeft, RefreshCw, X, Receipt, Check, Save, Calculator } from 'lucide-react';

interface Props {
  wholesalers: Wholesaler[];
  transactions: AccTransaction[];
  onRefresh: () => void;
  onSelectWholesaler: (id: string) => void;
}

const AccountingDashboard: React.FC<Props> = ({ wholesalers, transactions, onRefresh, onSelectWholesaler }) => {
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [isTModalOpen, setIsTModalOpen] = useState(false);
  const [isPlannerOpen, setIsPlannerOpen] = useState(false);
  const [availableCash, setAvailableCash] = useState<number | ''>('');
  const [busy, setBusy] = useState(false);
  const [tForm, setTForm] = useState<Partial<AccTransaction>>({ type: 'PURCHASE', date: getLocalDateString() });

  const balances = useMemo(() => {
    return wholesalers.map(w => {
      const wTrans = transactions.filter(t => t.wholesalerId === w.id);
      const balance = wTrans.reduce((acc, curr) => curr.type === 'PURCHASE' ? acc + curr.amount : acc - curr.amount, 0);
      return { ...w, balance };
    }).sort((a, b) => b.balance - a.balance);
  }, [wholesalers, transactions]);

  const totalDebt = balances.reduce((acc, curr) => acc + curr.balance, 0);

  const unpaidPurchases = useMemo(() => {
    const list: any[] = [];
    wholesalers.forEach(w => {
      const wTrans = transactions.filter(t => t.wholesalerId === w.id);
      let totalPaid = wTrans.filter(t => t.type === 'PAYMENT').reduce((acc, curr) => acc + curr.amount, 0);
      const purchases = wTrans.filter(t => t.type === 'PURCHASE').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      purchases.forEach(p => {
        const paidForThis = Math.min(p.amount, totalPaid);
        totalPaid -= paidForThis;
        const remaining = p.amount - paidForThis;
        if (remaining > 0) {
          list.push({ ...p, wholesalerName: w.name, unpaidAmount: remaining });
        }
      });
    });
    return list;
  }, [wholesalers, transactions]);

  const unpaidVades = useMemo(() => {
    return unpaidPurchases.filter(p => p.dueDate);
  }, [unpaidPurchases]);

  const agingReport = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const report = {
      current: 0,
      overdue: 0,
      overdue30: 0,
      overdue60: 0,
      overdue90: 0,
    };

    unpaidPurchases.forEach(v => {
      const referenceDate = v.dueDate ? new Date(v.dueDate) : new Date(v.date);
      const diffDays = Math.floor((today.getTime() - referenceDate.getTime()) / (1000 * 3600 * 24));
      
      if (diffDays <= 0) {
        report.current += v.unpaidAmount;
      } else if (diffDays <= 30) {
        report.overdue += v.unpaidAmount;
      } else if (diffDays <= 60) {
        report.overdue30 += v.unpaidAmount;
      } else if (diffDays <= 90) {
        report.overdue60 += v.unpaidAmount;
      } else {
        report.overdue90 += v.unpaidAmount;
      }
    });
    return report;
  }, [unpaidPurchases]);

  const upcomingVades = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return unpaidVades.filter(p => {
      const dDate = new Date(p.dueDate);
      const diffDays = (dDate.getTime() - today.getTime()) / (1000 * 3600 * 24);
      return diffDays <= 6; 
    }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [unpaidVades]);

  const suggestedPayments = useMemo(() => {
    if (!availableCash || availableCash <= 0) return [];
    
    let remainingCash = Number(availableCash);
    const suggestions: any[] = [];
    const today = new Date();
    today.setHours(0,0,0,0);

    // Sort unpaid purchases by priority: Overdue first, then by date
    const sortedUnpaid = [...unpaidPurchases].sort((a, b) => {
      const aDate = a.dueDate ? new Date(a.dueDate) : new Date(a.date);
      const bDate = b.dueDate ? new Date(b.dueDate) : new Date(b.date);
      
      const aIsOverdue = aDate < today;
      const bIsOverdue = bDate < today;

      if (aIsOverdue && !bIsOverdue) return -1;
      if (!aIsOverdue && bIsOverdue) return 1;
      
      return aDate.getTime() - bDate.getTime();
    });

    for (const p of sortedUnpaid) {
      if (remainingCash <= 0) break;
      const payAmount = Math.min(p.unpaidAmount, remainingCash);
      suggestions.push({
        ...p,
        payAmount
      });
      remainingCash -= payAmount;
    }

    return suggestions;
  }, [unpaidPurchases, availableCash]);

  const handleAddTransaction = async () => {
    if (!tForm.wholesalerId || !tForm.amount || !tForm.date) return;
    setBusy(true);
    try {
      await db.upsertAccTransaction({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        wholesalerId: tForm.wholesalerId!,
        type: tForm.type || 'PURCHASE',
        amount: Number(tForm.amount),
        date: tForm.date!,
        dueDate: tForm.dueDate,
        note: tForm.note
      });
      setIsTModalOpen(false);
      setTForm({ type: 'PURCHASE', date: getLocalDateString() });
      onRefresh();
    } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDay = (new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1).getDay() + 6) % 7;
  const daysCount = getDaysInMonth(calendarDate.getFullYear(), calendarDate.getMonth());

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Net Toplam Borç</p>
          <p className="text-4xl font-black mt-2 text-emerald-400">{totalDebt.toLocaleString()} TL</p>
        </div>
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <div className="hidden md:flex gap-4 mr-8 border-r border-slate-800 pr-8">
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Günü Geçen</p>
              <p className="text-lg font-black text-red-400">{(agingReport.overdue + agingReport.overdue30 + agingReport.overdue60 + agingReport.overdue90).toLocaleString()} TL</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Vadesi Gelmemiş</p>
              <p className="text-lg font-black text-emerald-400">{agingReport.current.toLocaleString()} TL</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button onClick={() => setIsPlannerOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-900/20 w-full sm:w-auto"><Calendar size={16}/> Ödeme Planla</button>
            <button onClick={() => setIsTModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20 w-full sm:w-auto"><Plus size={16}/> İşlem Ekle</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">0-30 Gün Gecikme</p>
          <p className="text-xl font-black text-slate-800 mt-1">{agingReport.overdue.toLocaleString()} TL</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">31-60 Gün Gecikme</p>
          <p className="text-xl font-black text-slate-800 mt-1">{agingReport.overdue30.toLocaleString()} TL</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">61-90 Gün Gecikme</p>
          <p className="text-xl font-black text-slate-800 mt-1">{agingReport.overdue60.toLocaleString()} TL</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">90+ Gün Gecikme</p>
          <p className="text-xl font-black text-slate-800 mt-1">{agingReport.overdue90.toLocaleString()} TL</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[500px]">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/20">
            <h3 className="font-black text-slate-800 uppercase text-sm tracking-tight">Kritik Vadeler (0-6 Gün)</h3>
          </div>
          <div className="flex-1 p-8 space-y-4 overflow-y-auto custom-scrollbar">
            {upcomingVades.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingVades.map(p => {
                  const today = new Date(); today.setHours(0,0,0,0);
                  const isOverdue = new Date(p.dueDate).getTime() < today.getTime();
                  return (
                    <div key={p.id} className={`p-6 rounded-[2rem] border flex items-center justify-between transition-all hover:scale-[1.02] ${isOverdue ? 'bg-red-50 border-red-100' : 'bg-orange-50 border-orange-100'}`}>
                      <div>
                        <p className="font-black text-slate-800 text-sm">{p.wholesalerName}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{new Date(p.dueDate).toLocaleDateString('tr-TR')}</p>
                      </div>
                      <div className={`text-right font-black text-lg ${isOverdue ? 'text-red-600' : 'text-orange-600'}`}>{p.unpaidAmount.toLocaleString()} TL</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-40">
                <Check size={48} className="mb-4" />
                <p className="font-black text-xs uppercase tracking-widest">Yakın zamanda ödeme yok kanka</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8">
        <div className="flex justify-between items-center mb-8">
          <h3 className="font-black text-slate-800 uppercase tracking-tight">Tüm Vade Takvimi</h3>
          <div className="flex items-center gap-4">
            <button onClick={() => setCalendarDate(new Date(calendarDate.setMonth(calendarDate.getMonth() - 1)))}><ChevronLeft size={20}/></button>
            <span className="text-xs font-black uppercase tracking-widest">{calendarDate.toLocaleString('tr-TR', { month: 'long', year: 'numeric' })}</span>
            <button onClick={() => setCalendarDate(new Date(calendarDate.setMonth(calendarDate.getMonth() + 1)))}><ChevronRight size={20}/></button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-3">
          {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'].map(d => <div key={d} className="text-center text-[10px] font-black text-slate-300 uppercase">{d}</div>)}
          {Array.from({ length: firstDay }).map((_, i) => <div key={i} />)}
          {Array.from({ length: daysCount }).map((_, i) => {
            const dateStr = `${calendarDate.getFullYear()}-${(calendarDate.getMonth() + 1).toString().padStart(2, '0')}-${(i + 1).toString().padStart(2, '0')}`;
            const dayVades = unpaidVades.filter(v => v.dueDate === dateStr);
            const isToday = getLocalDateString() === dateStr;
            return (
              <button key={i} onClick={() => setSelectedDay(selectedDay === dateStr ? null : dateStr)} className={`h-14 rounded-2xl font-black text-xs border-2 transition-all relative ${selectedDay === dateStr ? 'bg-emerald-600 text-white border-emerald-500' : isToday ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-transparent'}`}>
                {i + 1}
                {dayVades.length > 0 && <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-red-400 shadow-sm" />}
              </button>
            );
          })}
        </div>
        {selectedDay && (
          <div className="mt-8 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 animate-in slide-in-from-bottom-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{selectedDay} Vadeleri</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {unpaidVades.filter(v => v.dueDate === selectedDay).map(v => (
                <div key={v.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                  <span className="font-black text-slate-700 text-xs">{v.wholesalerName}</span>
                  <span className="font-black text-red-600">{v.unpaidAmount.toLocaleString()} TL</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/20">
          <h3 className="font-black text-slate-800 uppercase text-sm tracking-tight">Son Cari İşlemler</h3>
          <div className="bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">Son 10 İşlem</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <tr>
                <th className="px-8 py-5">Tarih</th>
                <th className="px-8 py-5">Toptancı</th>
                <th className="px-8 py-5">İşlem</th>
                <th className="px-8 py-5 text-right">Tutar</th>
                <th className="px-8 py-5">Not</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10).map(t => {
                const w = wholesalers.find(wh => wh.id === t.wholesalerId);
                return (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5 text-xs font-bold text-slate-500">{new Date(t.date).toLocaleDateString('tr-TR')}</td>
                    <td className="px-8 py-5 font-black text-slate-700 text-sm">{w?.name || 'Bilinmeyen'}</td>
                    <td className="px-8 py-5">
                      <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${t.type === 'PURCHASE' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {t.type === 'PURCHASE' ? 'Borç' : 'Ödeme'}
                      </span>
                    </td>
                    <td className={`px-8 py-5 text-right font-black ${t.type === 'PURCHASE' ? 'text-slate-800' : 'text-emerald-600'}`}>{t.amount.toLocaleString()} TL</td>
                    <td className="px-8 py-5 text-xs text-slate-400 font-medium italic">{t.note || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isPlannerOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[9999] flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl p-10 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-800">Akıllı Ödeme Planlayıcı</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Bugün kime, ne kadar ödeyelim kanka?</p>
              </div>
              <button onClick={() => { setIsPlannerOpen(false); setAvailableCash(''); }} className="p-2 hover:bg-slate-100 rounded-full transition-all"><X/></button>
            </div>

            <div className="mb-8 p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
              <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 block">Eldeki Nakit (TL)</label>
              <div className="relative">
                <input 
                  type="number" 
                  placeholder="Örn: 40000" 
                  className="w-full bg-white px-6 py-4 rounded-2xl font-black text-3xl text-indigo-600 outline-none border-2 border-transparent focus:border-indigo-300 transition-all"
                  value={availableCash}
                  onChange={(e) => setAvailableCash(e.target.value ? Number(e.target.value) : '')}
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-indigo-300 font-black">TL</div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              {suggestedPayments.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Öneri Listesi (Öncelik: Günü Geçenler)</p>
                  {suggestedPayments.map((p, idx) => {
                    const today = new Date(); today.setHours(0,0,0,0);
                    const isOverdue = (p.dueDate ? new Date(p.dueDate) : new Date(p.date)) < today;
                    return (
                      <div key={idx} className={`p-4 rounded-2xl border flex items-center justify-between transition-all hover:scale-[1.02] ${isOverdue ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${isOverdue ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-black text-slate-800 text-sm">{p.wholesalerName}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              {p.dueDate ? `Vade: ${new Date(p.dueDate).toLocaleDateString('tr-TR')}` : `İşlem: ${new Date(p.date).toLocaleDateString('tr-TR')}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Önerilen</p>
                          <p className={`font-black text-lg ${isOverdue ? 'text-red-600' : 'text-indigo-600'}`}>{p.payAmount.toLocaleString()} TL</p>
                        </div>
                      </div>
                    );
                  })}
                  
                  <div className="mt-8 p-6 bg-emerald-50 rounded-3xl border border-emerald-100 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Toplam Dağıtılan</p>
                      <p className="text-2xl font-black text-emerald-600">{suggestedPayments.reduce((acc, curr) => acc + curr.payAmount, 0).toLocaleString()} TL</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest text-right">Kalan Nakit</p>
                      <p className="text-2xl font-black text-slate-400 text-right">{(Number(availableCash) - suggestedPayments.reduce((acc, curr) => acc + curr.payAmount, 0)).toLocaleString()} TL</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 py-12">
                  <Calculator size={64} className="mb-4 opacity-20" />
                  <p className="font-black text-sm uppercase tracking-widest opacity-40">Nakit miktarını gir kanka</p>
                </div>
              )}
            </div>

            <div className="mt-8 flex gap-4">
              <button 
                onClick={() => { setIsPlannerOpen(false); setAvailableCash(''); }} 
                className="flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
              >
                Kapat
              </button>
              <button 
                onClick={() => {
                  // This just closes for now, but in future could auto-fill payment forms
                  setIsPlannerOpen(false);
                  setAvailableCash('');
                }} 
                className="flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
              >
                Anladım Kanka
              </button>
            </div>
          </div>
        </div>
      )}

      {isTModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[9999] flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg p-10">
            <div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black text-slate-800">İşlem Girişi</h3><button onClick={() => setIsTModalOpen(false)}><X/></button></div>
            <div className="space-y-4">
              <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                <button onClick={() => setTForm({...tForm, type: 'PURCHASE'})} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${tForm.type === 'PURCHASE' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>BORÇ</button>
                <button onClick={() => setTForm({...tForm, type: 'PAYMENT'})} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${tForm.type === 'PAYMENT' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>ÖDEME</button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2">İşlem Tarihi</label>
                  <input type="date" className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none" value={tForm.date} onChange={e => setTForm({...tForm, date: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Vade Tarihi (Opsiyonel)</label>
                  <input type="date" className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-dashed border-red-100" value={tForm.dueDate || ''} onChange={e => setTForm({...tForm, dueDate: e.target.value})} />
                </div>
              </div>
              <input type="number" placeholder="Tutar (TL)" className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-black text-2xl outline-none" value={tForm.amount || ''} onChange={e => setTForm({...tForm, amount: Number(e.target.value)})} />
              <select className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none" value={tForm.wholesalerId || ''} onChange={e => setTForm({...tForm, wholesalerId: e.target.value})}>
                <option value="">Toptancı Seç...</option>
                {wholesalers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              <input type="text" placeholder="Not" className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none" value={tForm.note || ''} onChange={e => setTForm({...tForm, note: e.target.value})} />
            </div>
            <button onClick={handleAddTransaction} disabled={busy} className="w-full mt-8 bg-slate-900 text-white py-5 rounded-2xl font-black uppercase flex items-center justify-center gap-3">{busy ? <RefreshCw className="animate-spin" /> : <Save size={20}/>} KAYDET</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountingDashboard;
