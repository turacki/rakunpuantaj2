
import React, { useState, useEffect } from 'react';
import { User, PuantajEntry, UserRole, EntryType } from '../types';
import { db } from '../services/supabaseService';
import { Coffee, Banknote, ShoppingBag, Trash2, Calendar, Edit2, X, Check, HandCoins, RefreshCw, Plus, ClipboardList, AlertTriangle, Copy, Check as CheckIcon, AlertCircle, Settings2 } from 'lucide-react';

interface Props {
  users: User[];
  entries: PuantajEntry[];
  setEntries: React.Dispatch<React.SetStateAction<PuantajEntry[]>>;
}

interface ModalState {
  isOpen: boolean;
  userId: string;
  type: EntryType;
  entryId?: string;
  amount: string;
  hours: string;
  note: string;
  title: string;
}

const AdminPuantaj: React.FC<Props> = ({ users, entries, setEntries }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [modal, setModal] = useState<ModalState>({ 
    isOpen: false, userId: '', type: 'CUSTOM', amount: '', hours: '', note: '', title: ''
  });
  const [busy, setBusy] = useState(false);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Sabit ücret ayarları
  const [config5K, setConfig5K] = useState(() => localStorage.getItem('config5K') || '500');
  const [config8K, setConfig8K] = useState(() => localStorage.getItem('config8K') || '800');

  useEffect(() => {
    localStorage.setItem('config5K', config5K);
  }, [config5K]);

  useEffect(() => {
    localStorage.setItem('config8K', config8K);
  }, [config8K]);

  const formatDisplayDate = (isoDate: string) => {
    if (!isoDate) return '';
    const [y, m, d] = isoDate.split('-');
    return `${d}/${m}/${y}`;
  };

  const titles = ["Ozan'a Kaydı", "PİÇİ SOY!"];

  const openModal = (userId: string, type: EntryType, entry?: PuantajEntry) => {
    const randomTitle = titles[Math.floor(Math.random() * titles.length)];
    setModal({
      isOpen: true,
      userId,
      type,
      entryId: entry?.id,
      amount: entry ? Math.abs(entry.amount).toString() : '',
      hours: entry?.hours ? entry.hours.toString() : '',
      note: entry?.note || (
        type === 'EXPENSE' ? 'Harcama' : 
        type === 'PAYMENT' ? 'Ödeme' : 
        type === '5H' ? '5 Saat Mesai' : 
        type === '8H' ? '8 Saat Tam Gün' : 'Ek Mesai / Prim'
      ),
      title: randomTitle
    });
  };

  const handleModalSubmit = async () => {
    const rawAmount = parseFloat(modal.amount);
    const rawHours = parseFloat(modal.hours);
    if (isNaN(rawAmount)) return;

    setBusy(true);
    setErrorInfo(null);
    try {
      const isDeduction = modal.type === 'EXPENSE' || modal.type === 'PAYMENT';
      const finalAmount = isDeduction ? -Math.abs(rawAmount) : Math.abs(rawAmount);

      const entryId = modal.entryId || Math.random().toString(36).substr(2, 9);
      const entryToSave: PuantajEntry = {
        id: entryId,
        userId: modal.userId,
        type: modal.type,
        amount: finalAmount,
        hours: isNaN(rawHours) ? undefined : rawHours,
        date: selectedDate,
        note: modal.note
      };

      await db.upsertEntry(entryToSave);

      if (modal.entryId) {
        setEntries(prev => prev.map(e => e.id === modal.entryId ? entryToSave : e));
      } else {
        setEntries(prev => [...prev, entryToSave]);
      }
      setModal({ ...modal, isOpen: false });
    } catch (err: any) {
      setErrorInfo(err.message);
    } finally {
      setBusy(false);
    }
  };

  const executeDelete = async (id: string) => {
    setBusy(true);
    setErrorInfo(null);
    try {
      await db.deleteEntry(id);
      setEntries(prev => prev.filter(e => e.id !== id));
      setDeleteConfirmId(null);
    } catch (err: any) {
      setErrorInfo(err.message);
    } finally {
      setBusy(false);
    }
  };

  const quickEntry = async (userId: string, type: EntryType, note: string, hours: number) => {
    setBusy(true);
    setErrorInfo(null);
    try {
      // 5K Butonu -> config5K TL ekler, 8 Saat mesai sayar
      // 8K Butonu -> config8K TL ekler, 5 Saat mesai sayar
      const amount = type === '8H' ? parseFloat(config5K) : parseFloat(config8K);
      const newEntry: PuantajEntry = {
        id: Math.random().toString(36).substr(2, 9),
        userId,
        type,
        amount,
        hours, 
        date: selectedDate,
        note
      };
      await db.upsertEntry(newEntry);
      setEntries(prev => [...prev, newEntry]);
    } catch (err: any) {
      setErrorInfo(err.message);
    } finally {
      setBusy(false);
    }
  };

  const calculateDailyTotal = () => {
    return todaysEntries
      .filter(e => e.amount > 0)
      .reduce((acc, curr) => acc + curr.amount, 0);
  };

  const todaysEntries = entries.filter(e => e.date === selectedDate);

  // Modal'da saat girişi gösterilsin mi? (Sadece Özel Giriş'te kalsın)
  const showHoursInModal = modal.type === 'CUSTOM';

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 max-w-[1400px] mx-auto">
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 border border-slate-100">
            <div className="bg-orange-50 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="text-orange-500 w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Kayıt Silinecek</h3>
            <p className="text-slate-500 text-xs font-bold mb-8 uppercase tracking-wider">Silmek istediğine emin misin?</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => executeDelete(deleteConfirmId)} disabled={busy} className="bg-red-600 text-white py-4 rounded-2xl font-black hover:bg-red-700 transition-all text-xs uppercase tracking-widest">SİL</button>
              <button onClick={() => setDeleteConfirmId(null)} className="bg-slate-100 text-slate-500 py-4 rounded-2xl font-black hover:bg-slate-200 transition-all text-xs uppercase tracking-widest">İPTAL</button>
            </div>
          </div>
        </div>
      )}

      {errorInfo && (
        <div className="bg-red-50 border-2 border-red-100 p-8 rounded-[2.5rem] animate-in slide-in-from-top-4 shadow-xl shadow-red-50/50">
          <div className="flex items-start gap-4 text-red-800">
            <AlertCircle className="w-8 h-8 shrink-0 text-red-500" />
            <div className="flex-1">
              <h4 className="text-lg font-black uppercase tracking-tight">Kanka Bir Hata Oluştu!</h4>
              <p className="text-sm font-medium mt-1 opacity-80 leading-relaxed whitespace-pre-wrap">{errorInfo}</p>
            </div>
            <button onClick={() => setErrorInfo(null)} className="p-2 hover:bg-red-100 rounded-full transition-colors"><X size={20} /></button>
          </div>
        </div>
      )}

      {/* Üst Ayarlar ve Tarih Barı */}
      <div className="flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4">
        <div className="flex-1 flex flex-col sm:flex-row gap-4 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="flex items-center gap-6">
            <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-100">
              <ClipboardList className="text-white w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Günlük Puantaj</h2>
              <div className="flex items-center gap-2 text-slate-400 group cursor-pointer relative">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-xs font-black text-indigo-600 hover:underline">{formatDisplayDate(selectedDate)}</span>
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>
            </div>
          </div>
          
          <div className="sm:ml-auto flex items-center gap-4 bg-slate-900 px-6 py-3 rounded-2xl text-white">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Günlük Hak Ediş:</p>
            <p className="text-xl font-black text-indigo-400">{calculateDailyTotal().toLocaleString()} <span className="text-xs text-slate-500">TL</span></p>
          </div>
        </div>

        {/* Ücret Ayarları */}
        <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-slate-50 rounded-xl text-slate-400"><Settings2 size={20} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-indigo-500 uppercase">5K:</span>
              <input type="number" className="pl-10 pr-3 py-2 bg-slate-50 rounded-lg outline-none font-black text-xs w-24 border border-transparent focus:border-indigo-500" value={config5K} onChange={e => setConfig5K(e.target.value)} />
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-sky-500 uppercase">8K:</span>
              <input type="number" className="pl-10 pr-3 py-2 bg-slate-50 rounded-lg outline-none font-black text-xs w-24 border border-transparent focus:border-sky-500" value={config8K} onChange={e => setConfig8K(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="hidden lg:grid grid-cols-[1.5fr_1fr_1.5fr_2fr] gap-4 px-8 py-4 bg-slate-50/50 border-b border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
          <div>Personel</div>
          <div>Günlük Durum</div>
          <div>Hızlı İşlemler</div>
          <div>Kayıtlar</div>
        </div>

        <div className="divide-y divide-slate-50">
          {users.map(person => {
            const personEntries = todaysEntries.filter(e => e.userId === person.id);
            const personDailyBalance = personEntries.reduce((acc, curr) => acc + curr.amount, 0);
            
            return (
              <div key={person.id} className={`grid grid-cols-1 lg:grid-cols-[1.5fr_1fr_1.5fr_2fr] gap-4 items-center px-6 lg:px-8 py-4 transition-colors hover:bg-slate-50/50 group ${person.role === UserRole.ADMIN ? 'bg-amber-50/10' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img src={person.avatar} className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 shadow-sm" />
                    {person.role === UserRole.ADMIN && <div className="absolute -top-1 -right-1 bg-amber-500 w-3 h-3 rounded-full border-2 border-white" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm truncate">{person.name}</h3>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Sabit Ücretli</p>
                  </div>
                </div>

                <div>
                  <div className={`px-3 py-1.5 rounded-xl font-black text-[11px] min-w-[80px] text-center ${personDailyBalance > 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : personDailyBalance < 0 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                    {personDailyBalance > 0 ? '+' : ''}{personDailyBalance.toLocaleString()} TL
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button 
                    disabled={busy} title="8 Saat Tam Gün (5K)" 
                    onClick={() => quickEntry(person.id, '8H', '8 Saat Tam Gün', 8)} 
                    className="w-10 h-10 flex items-center justify-center bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all active:scale-90 disabled:opacity-50 font-black text-[10px] shadow-sm"
                  >
                    5K
                  </button>
                  <button 
                    disabled={busy} title="5 Saat Mesai (8K)" 
                    onClick={() => quickEntry(person.id, '5H', '5 Saat Mesai', 5)} 
                    className="w-10 h-10 flex items-center justify-center bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-all active:scale-90 disabled:opacity-50 font-black text-[10px] shadow-sm"
                  >
                    8K
                  </button>
                  <button 
                    disabled={busy} title="Harcama/Düşüm" 
                    onClick={() => openModal(person.id, 'EXPENSE')} 
                    className="p-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-all active:scale-90 disabled:opacity-50"
                  >
                    <Coffee size={18} />
                  </button>
                  <button 
                    disabled={busy} title="Ödeme/Avans" 
                    onClick={() => openModal(person.id, 'PAYMENT')} 
                    className="p-2 bg-fuchsia-50 text-fuchsia-600 rounded-lg hover:bg-fuchsia-100 transition-all active:scale-90 disabled:opacity-50"
                  >
                    <Banknote size={18} />
                  </button>
                  <button 
                    disabled={busy} title="Özel Giriş" 
                    onClick={() => openModal(person.id, 'CUSTOM')} 
                    className="w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-all active:scale-90 disabled:opacity-50 font-black text-sm"
                  >
                    Ö
                  </button>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                  {personEntries.map(entry => (
                    <div key={entry.id} className={`group/chip relative flex items-center gap-1.5 border px-2.5 py-1 rounded-lg text-[9px] font-bold shrink-0 transition-all ${entry.amount < 0 ? 'bg-red-50/50 border-red-100 text-red-700' : 'bg-white border-slate-100 text-slate-600 hover:shadow-sm'}`}>
                      <span className="truncate max-w-[50px]">{entry.amount.toLocaleString()}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover/chip:opacity-100 transition-opacity bg-inherit pl-1 border-l border-current/10">
                        <button disabled={busy} onClick={() => openModal(person.id, entry.type, entry)} className="hover:scale-125 transition-transform"><Edit2 size={10} /></button>
                        <button disabled={busy} onClick={() => setDeleteConfirmId(entry.id)} className="hover:scale-125 transition-transform text-red-400 hover:text-red-600"><Trash2 size={10} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {modal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl ${modal.type === 'PAYMENT' || modal.type === 'EXPENSE' ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
                    {modal.type === 'PAYMENT' ? <HandCoins size={20} /> : modal.type === 'EXPENSE' ? <ShoppingBag size={20} /> : <Banknote size={20} />}
                  </div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">{modal.title}</h3>
                </div>
                <button onClick={() => setModal({...modal, isOpen: false})} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={24} /></button>
              </div>
              <div className="space-y-4">
                <div className={`grid ${showHoursInModal ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Tutar (TL)</label>
                    <input type="number" autoFocus disabled={busy} className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none font-black text-2xl transition-all" value={modal.amount} onChange={e => setModal({...modal, amount: e.target.value})} />
                  </div>
                  {showHoursInModal && (
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Saat (Opsiyonel)</label>
                      <input type="number" disabled={busy} className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none font-black text-2xl transition-all text-indigo-400" placeholder="0" value={modal.hours} onChange={e => setModal({...modal, hours: e.target.value})} />
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Not</label>
                  <textarea disabled={busy} className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none font-bold text-slate-600 transition-all resize-none h-24 text-sm" value={modal.note} onChange={e => setModal({...modal, note: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-8">
                <button onClick={() => setModal({...modal, isOpen: false})} className="py-4 rounded-2xl font-black text-slate-500 bg-slate-100 text-[11px] uppercase tracking-widest">İptal</button>
                <button disabled={busy} onClick={handleModalSubmit} className="py-4 rounded-2xl font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg text-[11px] uppercase tracking-widest flex items-center justify-center gap-2">
                  {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckIcon className="w-4 h-4" />} Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPuantaj;
