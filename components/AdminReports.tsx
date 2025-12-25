
import React, { useState, useMemo, useRef } from 'react';
import { User, PuantajEntry, UserRole } from '../types';
import { db } from '../services/supabaseService';
import { ShieldCheck, User as UserIcon, ChevronLeft, ChevronRight, MessageSquare, BarChart3, Calendar as CalendarIcon, Download, Upload, RefreshCw, Wallet, TrendingUp, ReceiptText } from 'lucide-react';

interface Props {
  users: User[];
  entries: PuantajEntry[];
}

const AdminReports: React.FC<Props> = ({ users, entries }) => {
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setBusy(true);
    try {
      const data = await db.exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PuantajPro_Yedek_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("Hata: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        await db.importAllData(json);
        window.location.reload();
      } catch (err: any) {
        alert("Hata: " + err.message);
        setBusy(false);
      }
    };
    reader.readAsText(file);
  };

  const staffBalances = useMemo(() => {
    return users.map(user => {
      // ÖNEMLİ: Bahşişleri bakiye hesabına katmıyoruz!
      const userEntries = entries.filter(e => e.userId === user.id && e.type !== 'TIP');
      const balance = userEntries.reduce((acc, curr) => acc + curr.amount, 0);
      return { ...user, balance };
    }).sort((a, b) => b.balance - a.balance);
  }, [users, entries]);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 1).getDay();
  const days = getDaysInMonth(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth());

  const selectedUserInfo = users.find(u => u.id === selectedUser);
  const selectedUserEntries = entries.filter(e => e.userId === selectedUser);

  const monthStats = useMemo(() => {
    const filtered = selectedUserEntries.filter(e => {
      const d = new Date(e.date);
      // Raporlarda da bahşişleri maaş/avans dengesinden ayırıyoruz
      return d.getMonth() === currentCalendarDate.getMonth() && d.getFullYear() === currentCalendarDate.getFullYear() && e.type !== 'TIP';
    });
    const income = filtered.filter(e => e.amount > 0).reduce((acc, curr) => acc + curr.amount, 0);
    const expense = filtered.filter(e => e.amount < 0).reduce((acc, curr) => acc + Math.abs(curr.amount), 0);
    return { income, expense };
  }, [selectedUserEntries, currentCalendarDate]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24 max-w-[1200px] mx-auto px-4 lg:px-0">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-100">
            <BarChart3 className="text-white w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Dükkan Alacakları</h2>
            <div className="flex items-center gap-4 mt-1">
              <button onClick={handleExport} disabled={busy} className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-700">
                <Download size={12} /> Snapshot İndir
              </button>
              <button onClick={() => fileInputRef.current?.click()} disabled={busy} className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-500 hover:text-emerald-700">
                <Upload size={12} /> Snapshot Yükle
              </button>
              <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
              {busy && <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />}
            </div>
          </div>
        </div>
        
        <div className="bg-white p-2 rounded-[1.5rem] border border-slate-100 shadow-sm w-full lg:w-auto">
          <select 
            value={selectedUser}
            onChange={e => setSelectedUser(e.target.value)}
            className="bg-slate-50 border border-slate-100 rounded-xl px-6 py-2.5 font-bold text-slate-700 outline-none text-sm cursor-pointer hover:bg-white transition-all w-full lg:min-w-[240px]"
          >
            <option value="all">Tüm Personel Özeti</option>
            {users.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {selectedUser === 'all' ? (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4">
          <div className="p-8 border-b border-slate-50">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
              <span className="w-1.5 h-6 bg-indigo-600 rounded-full" />
              Güncel Maaş/Avans Dengesi
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <tr>
                  <th className="px-6 md:px-10 py-5">Personel</th>
                  <th className="hidden md:table-cell px-10 py-5 text-center">Yetki</th>
                  <th className="px-6 md:px-10 py-5 text-right">Maaş Bakiyesi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {staffBalances.map(staff => (
                  <tr key={staff.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 md:px-10 py-5">
                      <div className="flex items-center gap-3 md:gap-4">
                        <img src={staff.avatar} className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-slate-50" />
                        <div>
                          <p className="font-black text-slate-700 text-sm md:text-base">{staff.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-10 py-5 text-center">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${staff.role === UserRole.ADMIN ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                        {staff.role}
                      </span>
                    </td>
                    <td className="px-6 md:px-10 py-5 text-right font-black text-base md:text-lg">
                      <span className={staff.balance > 0 ? 'text-emerald-600' : staff.balance < 0 ? 'text-red-600' : 'text-slate-400'}>
                        {staff.balance.toLocaleString()} TL
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 md:gap-6">
              <img src={selectedUserInfo?.avatar} className="w-12 h-12 md:w-16 md:h-16 rounded-2xl border bg-slate-50" />
              <div>
                <h3 className="text-lg md:text-xl font-black text-slate-800">{selectedUserInfo?.name}</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kalan Maaş Alacağı</p>
                <p className="text-xl md:text-2xl font-black text-indigo-600 mt-0.5">
                  {(staffBalances.find(b => b.id === selectedUser)?.balance || 0).toLocaleString()} TL
                </p>
              </div>
            </div>
            
            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bu Ayki Kazanç</p>
              <p className="text-xl md:text-2xl font-black text-emerald-600">+{monthStats.income.toLocaleString()} TL</p>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bu Ayki Ödemeler</p>
              <p className="text-xl md:text-2xl font-black text-red-600">-{monthStats.expense.toLocaleString()} TL</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm">
            <button onClick={() => setCurrentCalendarDate(new Date(currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1)))} className="p-3 hover:bg-slate-50 rounded-2xl transition-colors"><ChevronLeft /></button>
            <div className="text-center font-black text-slate-800 uppercase tracking-[0.2em] text-xs md:text-sm">
              {currentCalendarDate.toLocaleString('tr-TR', { month: 'long', year: 'numeric' })}
            </div>
            <button onClick={() => setCurrentCalendarDate(new Date(currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1)))} className="p-3 hover:bg-slate-50 rounded-2xl transition-colors"><ChevronRight /></button>
          </div>

          <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-4 md:p-8 border border-slate-100 shadow-sm relative overflow-visible">
            <div className="hidden md:grid grid-cols-7 gap-2 mb-4">
              {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(d => (
                <div key={d} className="text-center text-[10px] font-black text-slate-300 uppercase py-2 tracking-widest">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-7 gap-3 overflow-visible">
              {Array.from({ length: firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1 }).map((_, i) => (
                <div key={`empty-${i}`} className="hidden md:block min-h-[100px]" />
              ))}

              {Array.from({ length: days }).map((_, i) => {
                const dayNum = i + 1;
                const dateStr = `${currentCalendarDate.getFullYear()}-${(currentCalendarDate.getMonth() + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
                const dayEntries = selectedUserEntries.filter(e => e.date === dateStr);
                
                if (dayEntries.length === 0 && window.innerWidth < 768) return null;

                return (
                  <div key={dayNum} className="min-h-[80px] md:min-h-[120px] border border-slate-50 bg-slate-50/20 rounded-[1.5rem] p-3 md:p-4 hover:bg-white hover:shadow-lg transition-all group/day relative z-[1] hover:z-[99]">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-black text-slate-400">{dayNum}</span>
                      <span className="md:hidden text-[9px] font-black text-slate-300 uppercase tracking-widest">
                        {new Date(dateStr).toLocaleString('tr-TR', { weekday: 'short' })}
                      </span>
                    </div>
                    <div className="space-y-1.5 relative overflow-visible">
                      {dayEntries.map(e => (
                        <div key={e.id} className="relative group/entry z-[2] hover:z-[100]">
                          <div className={`text-[9px] font-black px-2 py-1.5 rounded-lg border flex items-center justify-between gap-1 transition-all cursor-help ${
                            e.type === 'TIP' 
                              ? 'bg-amber-50 text-amber-700 border-amber-100'
                              : e.amount < 0 
                                ? 'bg-red-50 text-red-600 border-red-100' 
                                : 'bg-white text-slate-700 border-slate-100 shadow-sm'
                          }`}>
                            <span className="whitespace-nowrap">{e.amount > 0 ? '+' : ''}{e.amount.toLocaleString()}</span>
                            {e.type === 'TIP' && <CalendarIcon size={10} className="text-amber-400 shrink-0" />}
                            {e.note && e.type !== 'TIP' && <MessageSquare size={10} className="text-indigo-400 shrink-0" />}
                          </div>

                          {e.note && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-3 bg-slate-900 text-white text-[10px] rounded-2xl opacity-0 invisible group-hover/entry:opacity-100 group-hover/entry:visible transition-all duration-200 pointer-events-none z-[9999] shadow-2xl min-w-[160px] max-w-[240px] border border-white/10">
                              <p className="font-bold leading-relaxed whitespace-pre-wrap break-words">{e.note}</p>
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-slate-900" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReports;
