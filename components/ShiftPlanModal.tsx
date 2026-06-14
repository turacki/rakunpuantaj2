
import React, { useState, useEffect } from 'react';
import { X, Calendar, Sparkles, Loader2, CheckCircle2, UserPlus, Trash2, LayoutGrid, Type as TypeIcon, Copy } from 'lucide-react';
import { parseWeeklyShift } from '../services/geminiService';
import { db } from '../services/supabaseService';
import { User, UserRole } from '../types';

interface Props {
  isOpen: boolean;
  users: User[];
  onClose: () => void;
  onSuccess: () => void;
}

const ShiftPlanModal: React.FC<Props> = ({ isOpen, users, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'ai' | 'manual'>('manual');
  const [rawText, setRawText] = useState('');
  const [weekStart, setWeekStart] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);

  const emptyPlan = {
    weekRange: "",
    days: {
      pzt: [],
      sal: [],
      cars: [],
      pers: [],
      cuma: [],
      cts: [],
      pazar: []
    }
  };

  useEffect(() => {
    if (isOpen && mode === 'manual' && !parsedData) {
      setParsedData(JSON.parse(JSON.stringify(emptyPlan)));
    }
  }, [isOpen, mode]);

  const handleCopyLastWeek = async () => {
    setIsProcessing(true);
    try {
      const plans = await db.getShiftPlans();
      if (plans.length > 0) {
        // Sort by weekStart descending
        const sorted = plans.sort((a, b) => b.weekStart.localeCompare(a.weekStart));
        setParsedData(JSON.parse(JSON.stringify(sorted[0].planData)));
        alert("Son kaydedilen plan kopyalandı.");
      } else {
        alert("Henüz kaydedilmiş bir plan bulunamadı.");
      }
    } catch (error) {
      console.error(error);
      alert("Plan kopyalanamadı.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleParse = async () => {
    if (!rawText.trim() || !weekStart) {
      alert("Lütfen hafta başlangıç tarihini seçin ve tabloyu yapıştırın.");
      return;
    }
    setIsProcessing(true);
    try {
      const result = await parseWeeklyShift(rawText, weekStart);
      if (result) {
        setParsedData(result);
      } else {
        alert("Tablo ayrıştırılamadı. Lütfen formatı kontrol edin.");
      }
    } catch (error) {
      console.error(error);
      alert("Bir hata oluştu.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!parsedData || !weekStart) return;
    setIsProcessing(true);
    try {
      await db.upsertShiftPlan({
        weekStart,
        planData: parsedData
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      alert("Kaydedilemedi.");
    } finally {
      setIsProcessing(false);
    }
  };

  const addStaffToDay = (day: string) => {
    setParsedData((prev: any) => {
      const newData = { ...prev };
      if (!newData.days) newData.days = JSON.parse(JSON.stringify(emptyPlan.days));
      newData.days[day] = [...(newData.days[day] || []), { name: '', role: '5-K', shiftType: '5K' }];
      return newData;
    });
  };

  const removeStaffFromDay = (day: string, idx: number) => {
    setParsedData((prev: any) => {
      const newData = { ...prev };
      newData.days[day] = newData.days[day].filter((_: any, i: number) => i !== idx);
      return newData;
    });
  };

  const updateStaffInDay = (day: string, idx: number, field: string, value: string) => {
    setParsedData((prev: any) => {
      const newData = { ...prev };
      newData.days[day] = newData.days[day].map((s: any, i: number) => 
        i === idx ? { ...s, [field]: value } : s
      );
      return newData;
    });
  };

  if (!isOpen) return null;

  const dayNames = {
    pzt: 'Pazartesi',
    sal: 'Salı',
    cars: 'Çarşamba',
    pers: 'Perşembe',
    cuma: 'Cuma',
    cts: 'Cumartesi',
    pazar: 'Pazar'
  };

  const roles = ['KAPI', 'ARACI', 'BAR', '5-K', '8-K', 'MUTFAK', 'EKSTRA'];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-100">
        <div className="p-8 border-b flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <Calendar size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Haftalık Shift Hazırla</h2>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Gelecek haftanın planını yapalım kanka</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-gray-100 p-1 rounded-xl flex gap-1">
              <button 
                onClick={() => setMode('manual')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${mode === 'manual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <LayoutGrid size={14} /> Manuel
              </button>
              <button 
                onClick={() => setMode('ai')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${mode === 'ai' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <TypeIcon size={14} /> Metin/AI
              </button>
            </div>
            <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-2xl transition-all text-gray-400 hover:text-gray-900">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          <div className="flex flex-col md:flex-row gap-6 items-end">
            <div className="flex-1 space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Hafta Başlangıcı (Pazartesi)</label>
              <input 
                type="date" 
                value={weekStart}
                onChange={(e) => setWeekStart(e.target.value)}
                className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold text-gray-700"
              />
            </div>
            {mode === 'manual' && (
              <button 
                onClick={handleCopyLastWeek}
                disabled={isProcessing}
                className="px-8 py-4 bg-white border-2 border-indigo-100 text-indigo-600 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 hover:bg-indigo-50 transition-all shadow-sm"
              >
                <Copy size={16} /> Son Haftayı Kopyala
              </button>
            )}
          </div>

          {mode === 'ai' ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Tablo Metni</label>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Excel'den kopyaladığın tabloyu buraya yapıştır..."
                  className="w-full h-64 px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-3xl outline-none transition-all font-medium text-gray-700 resize-none"
                />
              </div>
              <button
                onClick={handleParse}
                disabled={isProcessing}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
                Tabloyu Analiz Et (Gemini)
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Object.entries(dayNames).map(([key, label]) => (
                <div key={key} className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 flex flex-col min-h-[300px]">
                  <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
                    <h5 className="font-black text-indigo-600 uppercase text-[11px] tracking-widest">{label}</h5>
                    <span className="text-[10px] font-bold text-gray-400">{parsedData?.days?.[key]?.length || 0} Personel</span>
                  </div>
                  
                  <div className="flex-1 space-y-3 mb-4">
                    {parsedData?.days?.[key]?.map((s: any, idx: number) => (
                      <div key={idx} className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 space-y-2 group">
                        <div className="flex gap-2">
                          <select 
                            value={s.name}
                            onChange={(e) => updateStaffInDay(key, idx, 'name', e.target.value)}
                            className="flex-1 bg-gray-50 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 outline-none"
                          >
                            <option value="">Seç...</option>
                            {users.filter(u => u.role !== UserRole.ADMIN).map(u => (
                              <option key={u.id} value={u.name}>{u.name}</option>
                            ))}
                          </select>
                          <button 
                            onClick={() => removeStaffFromDay(key, idx)}
                            className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <select 
                            value={s.role}
                            onChange={(e) => updateStaffInDay(key, idx, 'role', e.target.value)}
                            className="flex-1 bg-gray-50 px-3 py-2 rounded-xl text-[10px] font-black text-gray-400 uppercase outline-none"
                          >
                            {roles.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                          <button 
                            onClick={() => updateStaffInDay(key, idx, 'shiftType', s.shiftType === '8K' ? '5K' : '8K')}
                            className={`px-3 py-2 rounded-xl font-black text-[10px] uppercase transition-all ${s.shiftType === '8K' ? 'bg-indigo-600 text-white' : 'bg-orange-500 text-white'}`}
                          >
                            {s.shiftType}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={() => addStaffToDay(key)}
                    className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 font-black text-[10px] uppercase tracking-widest hover:border-indigo-300 hover:text-indigo-500 transition-all flex items-center justify-center gap-2"
                  >
                    <UserPlus size={14} /> Ekle
                  </button>
                </div>
              ))}
            </div>
          )}

          {parsedData && (
            <div className="pt-8 border-t flex gap-4">
              <button
                onClick={() => {
                  setParsedData(null);
                  setRawText('');
                }}
                className="flex-1 py-5 rounded-2xl font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-all border-2 border-gray-100"
              >
                Temizle
              </button>
              <button
                onClick={handleSave}
                disabled={isProcessing || !weekStart}
                className="flex-2 bg-indigo-600 hover:bg-indigo-700 text-white py-5 px-12 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="animate-spin" /> : <Calendar size={20} />}
                Haftalık Planı Kaydet
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShiftPlanModal;
