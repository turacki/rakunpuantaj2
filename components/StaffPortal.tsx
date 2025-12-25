
import React, { useState } from 'react';
import { User, PuantajEntry } from '../types';
import { db } from '../services/supabaseService';
import { Calendar, ChevronLeft, ChevronRight, Info, Wallet, TrendingUp, ReceiptText, MessageSquare, KeyRound, Save, CheckCircle2, AlertCircle, RefreshCw, Coins } from 'lucide-react';

interface Props {
  user: User;
  entries: PuantajEntry[];
  setUser: (user: User) => void;
}

const StaffPortal: React.FC<Props> = ({ user, entries, setUser }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [newPassword, setNewPassword] = useState('');
  const [passUpdateStatus, setPassUpdateStatus] = useState<'idle' | 'busy' | 'success' | 'error'>('idle');
  const [passErrorMessage, setPassErrorMessage] = useState('');

  const myEntries = entries.filter(e => e.userId === user.id);
  
  // ÖNEMLİ: Bahşişleri (TIP) bakiye hesabına katmıyoruz!
  const totalBalance = myEntries
    .filter(e => e.type !== 'TIP')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const monthEarnings = myEntries
    .filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear() && e.amount > 0 && e.type !== 'TIP';
    })
    .reduce((acc, curr) => acc + curr.amount, 0);

  const monthDeductions = myEntries
    .filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear() && e.amount < 0;
    })
    .reduce((acc, curr) => acc + Math.abs(curr.amount), 0);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const days = getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth());

  const handleUpdatePassword = async () => {
    const regex = /^(?=.*[A-Za-z])(?=.*\d).{4,}$/;
    if (!regex.test(newPassword)) {
      setPassUpdateStatus('error');
      setPassErrorMessage('Şifre en az 4 karakter olmalı, en az 1 harf ve 1 rakam içermeli kanka!');
      return;
    }

    setPassUpdateStatus('busy');
    try {
      const updatedUser = { ...user, password: newPassword };
      await db.upsertUser(updatedUser);
      setUser(updatedUser);
      setPassUpdateStatus('success');
      setNewPassword('');
      setTimeout(() => setPassUpdateStatus('idle'), 3000);
    } catch (err: any) {
      setPassUpdateStatus('error');
      setPassErrorMessage(err.message);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-32 px-4 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">Selam, {user.name.split(' ')[0]}!</h2>
          <p className="text-slate-500 mt-1 font-medium italic">Puantaj ve bakiye özetin kanka.</p>
        </div>
        <div className="bg-white p-2 md:p-4 rounded-3xl border border-slate-100 flex items-center gap-4 shadow-sm w-full md:w-auto justify-between">
          <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} className="p-2 hover:bg-slate-50 rounded-xl transition-colors"><ChevronLeft /></button>
          <span className="font-black text-slate-700 min-w-[120px] text-center uppercase tracking-widest text-xs md:text-sm">
            {currentMonth.toLocaleString('tr-TR', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} className="p-2 hover:bg-slate-50 rounded-xl transition-colors"><ChevronRight /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-indigo-600 p-6 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100 flex flex-col justify-between">
          <div>
            <div className="bg-white/20 w-8 h-8 rounded-xl flex items-center justify-center mb-3"><Wallet className="w-4 h-4" /></div>
            <p className="text-indigo-100 text-[9px] font-bold uppercase tracking-widest">Kalan Maaş Bakiyesi</p>
          </div>
          <p className="text-2xl font-black mt-2">{totalBalance.toLocaleString()} TL</p>
        </div>

        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="bg-emerald-50 w-8 h-8 rounded-xl flex items-center justify-center mb-3 text-emerald-600"><TrendingUp className="w-4 h-4" /></div>
            <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">Bu Ayki Maaş Kazancı</p>
          </div>
          <p className="text-2xl font-black text-slate-800 mt-2">+{monthEarnings.toLocaleString()} TL</p>
        </div>

        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="bg-red-50 w-8 h-8 rounded-xl flex items-center justify-center mb-3 text-red-600"><ReceiptText className="w-4 h-4" /></div>
            <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">Alınan Ödemeler</p>
          </div>
          <p className="text-2xl font-black text-slate-800 mt-2">-{monthDeductions.toLocaleString()} TL</p>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-4 md:p-10 border border-slate-100 shadow-xl relative overflow-visible">
        <div className="hidden md:grid grid-cols-7 gap-2 mb-6">
          {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(d => (
            <div key={d} className="text-center text-xs font-black text-slate-300 uppercase py-2 tracking-widest">{d}</div>
          ))}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3 overflow-visible">
          {Array.from({ length: firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1 }).map((_, i) => (
            <div key={`empty-${i}`} className="hidden md:block h-32" />
          ))}

          {Array.from({ length: days }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${currentMonth.getFullYear()}-${(currentMonth.getMonth() + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
            const dayEntries = myEntries.filter(e => e.date === dateStr);
            const isToday = new Date().toISOString().split('T')[0] === dateStr;
            
            if (dayEntries.length === 0 && window.innerWidth < 768) return null;

            return (
              <div 
                key={dayNum} 
                className={`min-h-[80px] md:h-32 border rounded-[2rem] p-4 transition-all flex flex-row md:flex-col justify-between items-center md:items-start group/day relative z-[1] hover:z-[99] ${
                  isToday ? 'border-indigo-500 bg-indigo-50/20 shadow-inner' : 'border-slate-50 bg-slate-50/30 hover:bg-white hover:border-slate-200 hover:shadow-lg'
                }`}
              >
                <div className="flex md:flex-col items-center md:items-start gap-4 md:gap-0">
                  <span className={`text-base md:text-sm font-black ${isToday ? 'text-indigo-600' : 'text-slate-400'}`}>{dayNum}</span>
                  <span className="md:hidden text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {new Date(dateStr).toLocaleString('tr-TR', { weekday: 'short' })}
                  </span>
                </div>
                
                <div className="flex flex-col gap-1 mt-1 flex-1 md:w-full overflow-visible relative items-end md:items-stretch">
                  {dayEntries.map(e => (
                    <div 
                      key={e.id} 
                      className="relative group/entry z-[2] hover:z-[100] w-fit md:w-full"
                    >
                      <div 
                        className={`text-[10px] md:text-[9px] font-black px-3 py-2 md:py-1.5 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-help ${
                          e.type === 'TIP'
                            ? 'bg-amber-50 text-amber-700 border-amber-100'
                            : e.amount < 0 
                              ? 'bg-red-50 text-red-700 border-red-100' 
                              : 'bg-white text-slate-700 border-slate-100 shadow-sm'
                        }`}
                      >
                        <span className="whitespace-nowrap">{e.amount > 0 ? '+' : ''}{e.amount} TL</span>
                        {e.type === 'TIP' ? <Coins size={10} className="text-amber-400" /> : e.note && <MessageSquare size={10} className={`${e.amount < 0 ? 'text-red-400' : 'text-indigo-400'}`} />}
                      </div>
                      
                      {e.note && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-5 py-4 bg-slate-900 text-white text-[11px] rounded-[1.5rem] opacity-0 invisible group-hover/entry:opacity-100 group-hover/entry:visible transition-all duration-300 pointer-events-none z-[99999] shadow-2xl min-w-[200px] max-w-[280px] scale-90 group-hover/entry:scale-100 origin-bottom border border-white/10">
                          <p className="font-bold leading-relaxed whitespace-pre-wrap break-words text-indigo-50 text-[12px]">
                            {e.note}
                          </p>
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
      
      <div className="bg-white border border-slate-100 p-8 rounded-[2.5rem] shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600"><KeyRound size={24} /></div>
          <h3 className="font-black text-xl text-slate-800 uppercase tracking-tight">Giriş Şifresini Güncelle</h3>
        </div>
        <div className="space-y-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Yeni şifren kanka..."
              className={`w-full px-6 py-4 bg-slate-50 border-2 rounded-2xl font-bold outline-none transition-all ${passUpdateStatus === 'error' ? 'border-red-300' : 'border-transparent focus:border-indigo-500'}`}
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if(passUpdateStatus !== 'idle') setPassUpdateStatus('idle');
              }}
            />
            <button 
              onClick={handleUpdatePassword}
              disabled={passUpdateStatus === 'busy'}
              className={`absolute right-2 top-2 bottom-2 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all ${passUpdateStatus === 'success' ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
            >
              {passUpdateStatus === 'busy' ? <RefreshCw className="animate-spin" /> : passUpdateStatus === 'success' ? <CheckCircle2 size={16} /> : <Save size={16} />}
              {passUpdateStatus === 'success' ? 'Güncellendi' : 'Kaydet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffPortal;
