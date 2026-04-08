
import React, { useState, useEffect, useMemo } from 'react';
import { User, ShiftPlan, PuantajEntry, UserRole } from '../types';
import { db, getLocalDateString } from '../services/supabaseService';
import { CheckCircle2, AlertCircle, Loader2, UserPlus, Trash2, Edit3, X, Save, RefreshCw, CalendarCheck } from 'lucide-react';

interface Props {
  users: User[];
  entries: PuantajEntry[];
  onSuccess: () => void;
}

const DailyShiftConfirmation: React.FC<Props> = ({ users, entries, onSuccess }) => {
  const [plans, setPlans] = useState<ShiftPlan[]>([]);
  const [config5K, setConfig5K] = useState('500');
  const [config8K, setConfig8K] = useState('800');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const today = new Date();
  const todayStr = getLocalDateString(today);
  const isAfter14 = today.getHours() >= 14;
  
  const dayNames = ['pazar', 'pzt', 'sal', 'cars', 'pers', 'cuma', 'cts'];
  const todayName = dayNames[today.getDay()];

  // Find the Monday of the current week
  const getMonday = (d: Date) => {
    const day = d.getDay(),
        diff = d.getDate() - day + (day === 0 ? -6 : 1); 
    return new Date(d.setDate(diff));
  };
  const mondayStr = getLocalDateString(getMonday(new Date(today)));

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [planData, settings] = await Promise.all([
          db.getShiftPlans(),
          db.getSettings()
        ]);
        setPlans(planData);
        if (settings.config5K) setConfig5K(settings.config5K);
        if (settings.config8K) setConfig8K(settings.config8K);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const currentPlan = useMemo(() => {
    return plans.find(p => p.weekStart === mondayStr);
  }, [plans, mondayStr]);

  const isAlreadyConfirmed = useMemo(() => {
    return entries.some(e => e.date === todayStr && e.note === 'Otomatik Shift Onayı');
  }, [entries, todayStr]);

  useEffect(() => {
    if (currentPlan && !isAlreadyConfirmed && isAfter14) {
      const todayStaff = currentPlan.planData?.days?.[todayName] || [];
      // Filter out admins
      const nonAdminStaff = todayStaff.filter((s: any) => {
        // Normalize shift types from old data if necessary
        if (s.shiftType === '8H') s.shiftType = '8K';
        if (s.shiftType === '5H') s.shiftType = '5K';
        
        const user = users.find(u => u.name.toLowerCase().includes(s.name.toLowerCase()));
        return !user || user.role !== UserRole.ADMIN;
      });
      setEditingStaff(nonAdminStaff);
    }
  }, [currentPlan, isAlreadyConfirmed, isAfter14, todayName, users]);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      for (const s of editingStaff) {
        const user = users.find(u => u.name.toLowerCase().includes(s.name.toLowerCase()));
        if (!user) continue;

        // 5K shift = 8 hours, 8K shift = 5 hours
        const amount = s.shiftType === '8K' ? parseFloat(config8K) : parseFloat(config5K);
        
        await db.upsertEntry({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          userId: user.id,
          type: s.shiftType as any,
          amount,
          hours: s.shiftType === '8K' ? 5 : 8,
          date: todayStr,
          note: 'Otomatik Shift Onayı'
        });
      }
      onSuccess();
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      alert("Hata oluştu.");
    } finally {
      setBusy(false);
    }
  };

  const removeStaff = (idx: number) => {
    setEditingStaff(prev => prev.filter((_, i) => i !== idx));
  };

  const addStaff = () => {
    setEditingStaff(prev => [...prev, { name: '', role: 'EKSTRA', shiftType: '5K' }]);
  };

  const updateStaff = (idx: number, field: string, value: string) => {
    setEditingStaff(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  if (loading) return null;
  if (!currentPlan || isAlreadyConfirmed || !isAfter14) return null;

  return (
    <div className="bg-white rounded-[2.5rem] border-2 border-indigo-100 shadow-xl shadow-indigo-100/50 p-8 animate-in slide-in-from-top-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-lg shadow-indigo-200 animate-pulse">
            <CalendarCheck size={32} />
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight">Bugünün Shiftleri Hazır Kanka!</h3>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Haftalık plandan bugünü onaylayalım mı?</p>
          </div>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all shadow-xl shadow-indigo-100"
          >
            <Edit3 size={16} /> İncele ve Onayla
          </button>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl p-10 max-h-[90vh] flex flex-col border border-gray-100">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Günlük Shift Onayı</h3>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">{todayStr} - {todayName.toUpperCase()}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-gray-100 rounded-2xl transition-all text-gray-400">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
              {editingStaff.map((s, idx) => (
                <div key={idx} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center gap-4 group hover:bg-white hover:shadow-md transition-all">
                  <div className="flex-1">
                    <select 
                      value={s.name}
                      onChange={(e) => updateStaff(idx, 'name', e.target.value)}
                      className="w-full bg-transparent font-bold text-gray-700 outline-none"
                    >
                      <option value="">Personel Seç...</option>
                      {users.filter(u => u.role !== UserRole.ADMIN).map(u => (
                        <option key={u.id} value={u.name}>{u.name}</option>
                      ))}
                    </select>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{s.role}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => updateStaff(idx, 'shiftType', s.shiftType === '8K' ? '5K' : '8K')}
                      className={`px-3 py-2 rounded-xl font-black text-[10px] uppercase transition-all ${s.shiftType === '8K' ? 'bg-indigo-600 text-white' : 'bg-orange-500 text-white'}`}
                    >
                      {s.shiftType}
                    </button>
                    <button 
                      onClick={() => removeStaff(idx)}
                      className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
              
              <button 
                onClick={addStaff}
                className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 font-black text-xs uppercase tracking-widest hover:border-indigo-300 hover:text-indigo-500 transition-all flex items-center justify-center gap-2"
              >
                <UserPlus size={16} /> Personel Ekle
              </button>
            </div>

            <div className="mt-10 flex gap-4">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-5 rounded-2xl font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-all border-2 border-gray-100"
              >
                Vazgeç
              </button>
              <button 
                onClick={handleConfirm}
                disabled={busy}
                className="flex-2 bg-indigo-600 hover:bg-indigo-700 text-white py-5 px-12 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
              >
                {busy ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                Bugünü Onayla ve İşle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyShiftConfirmation;
