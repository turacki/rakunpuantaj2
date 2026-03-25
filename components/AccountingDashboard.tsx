
import React, { useState, useMemo } from 'react';
import { Wholesaler, AccTransaction } from '../types';
import { db, getLocalDateString } from '../services/supabaseService';
import { ChevronRight, Plus, Calendar, ChevronLeft, RefreshCw, X, Receipt, Check, Save } from 'lucide-react';

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
      <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl flex justify-between items-center">
        <div>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Net Toplam Borç</p>
          <p className="text-4xl font-black mt-2 text-emerald-400">{totalDebt.toLocaleString()} TL</p>
        </div>
        <div className="flex gap-4">
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
          <button onClick={() => setIsTModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all"><Plus size={16}/> İşlem Ekle</button>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[500px]">
          <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/20">
            <h3 className="font-black text-slate-800 uppercase text-sm tracking-tight">Toptancı Bakiyeleri</h3>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left">
              <tbody className="divide-y divide-slate-50">
                {balances.map(w => (
                  <tr key={w.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5 font-black text-slate-700 text-sm">{w.name}</td>
                    <td className="px-8 py-5 text-right font-black text-emerald-600">{w.balance.toLocaleString()} TL</td>
                    <td className="px-8 py-5 text-right"><button onClick={() => onSelectWholesaler(w.id)} className="p-2 text-slate-300 hover:text-emerald-500 rounded-xl transition-all"><ChevronRight size={18}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[500px]">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between">
            <h3 className="font-black text-slate-800 uppercase text-sm tracking-tight">Kritik Vadeler (0-6 Gün)</h3>
          </div>
          <div className="flex-1 p-4 space-y-3 overflow-y-auto custom-scrollbar">
            {upcomingVades.map(p => {
              const today = new Date(); today.setHours(0,0,0,0);
              const isOverdue = new Date(p.dueDate).getTime() < today.getTime();
              return (
                <div key={p.id} className={`p-4 rounded-2xl border flex items-center justify-between ${isOverdue ? 'bg-red-50 border-red-100' : 'bg-orange-50 border-orange-100'}`}>
                  <div>
                    <p className="font-black text-slate-800 text-xs">{p.wholesalerName}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(p.dueDate).toLocaleDateString('tr-TR')}</p>
                  </div>
                  <div className={`text-right font-black ${isOverdue ? 'text-red-600' : 'text-orange-600'}`}>{p.unpaidAmount.toLocaleString()} TL</div>
                </div>
              );
            })}
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
