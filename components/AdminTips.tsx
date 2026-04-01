
import React, { useState, useMemo } from 'react';
import { User, PuantajEntry } from '../types';
import { Coins, Calendar, Info, Calculator, User as UserIcon } from 'lucide-react';

interface Props {
  users: User[];
  entries: PuantajEntry[];
  setEntries: React.Dispatch<React.SetStateAction<PuantajEntry[]>>;
}

const AdminTips: React.FC<Props> = ({ users, entries }) => {
  const [selectedSunday, setSelectedSunday] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() + (day === 0 ? 0 : 7 - day);
    const lastSun = new Date(today.setDate(diff));
    return lastSun.toISOString().split('T')[0];
  });

  const [totalTipPool, setTotalTipPool] = useState('');

  // Haftalık aralığı hesapla (Pazartesi'den Pazar'a)
  const weekRange = useMemo(() => {
    const end = new Date(selectedSunday);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    return { 
      start: start.toISOString().split('T')[0], 
      end: end.toISOString().split('T')[0] 
    };
  }, [selectedSunday]);

  // Personel bazlı haftalık çalışma saatlerini hesapla
  const staffWeeklyHours = useMemo(() => {
    return users.map(user => {
      const userWeekEntries = entries.filter(e => {
        // Sadece çalışma saatlerini (maaş kalemlerini) sayıyoruz
        return e.userId === user.id && e.date >= weekRange.start && e.date <= weekRange.end && e.hours;
      });
      const totalHours = userWeekEntries.reduce((acc, curr) => acc + (curr.hours || 0), 0);
      return { ...user, totalHours };
    }).filter(u => u.totalHours > 0); // Sadece o hafta çalışanları göster
  }, [users, entries, weekRange]);

  const totalShopHours = staffWeeklyHours.reduce((acc, curr) => acc + curr.totalHours, 0);
  
  // Saat başına düşen oran (Anlık hesaplama)
  const hourlyTipRate = useMemo(() => {
    const pool = parseFloat(totalTipPool);
    if (isNaN(pool) || pool <= 0 || totalShopHours === 0) return 0;
    return pool / totalShopHours;
  }, [totalTipPool, totalShopHours]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-[1100px] mx-auto pb-20 px-4 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-amber-500 p-3 rounded-2xl shadow-lg shadow-amber-100">
            <Coins className="text-white w-6 h-6" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Bahşiş Hesaplayıcı</h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Haftalık Dağılım Analizi</p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm w-full md:w-auto">
          <Calendar className="w-5 h-5 text-slate-400 ml-2" />
          <input 
            type="date" 
            value={selectedSunday} 
            onChange={e => {
              setSelectedSunday(e.target.value);
              setTotalTipPool(''); 
            }}
            className="font-black text-slate-700 outline-none text-sm cursor-pointer px-2 flex-1 md:flex-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sol Panel: Girdi Alanı */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-amber-500 rounded-full" />
              Tip Box Tutarı
            </h3>
            
            <div className="space-y-6">
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Haftalık Toplam Mesai</span>
                  <span className="font-black text-slate-800 text-xl">{totalShopHours} <span className="text-xs text-slate-400">SAAT</span></span>
                </div>
                <div className="text-[10px] text-slate-400 font-bold uppercase italic">
                  Aralık: {weekRange.start} / {weekRange.end}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Dağıtılacak Toplam (TL)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    placeholder="Miktarı gir kanka..."
                    className="w-full px-8 py-6 bg-slate-50 border-2 border-transparent focus:border-amber-500 focus:bg-white rounded-3xl outline-none font-black text-4xl transition-all"
                    value={totalTipPool}
                    onChange={e => setTotalTipPool(e.target.value)}
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-slate-300">TL</div>
                </div>
              </div>

              {hourlyTipRate > 0 ? (
                <div className="p-8 bg-amber-50 border border-amber-100 rounded-[2rem] text-center animate-in zoom-in-95">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2">Saat Başına Düşen Pay</p>
                  <p className="text-4xl font-black text-amber-700">{hourlyTipRate.toFixed(2)} TL</p>
                </div>
              ) : (
                <div className="p-8 bg-slate-50 border border-dashed border-slate-200 rounded-[2rem] text-center">
                  <Calculator className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hesaplamak için miktar gir kanka</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-[2.5rem] flex gap-4 text-indigo-800">
            <Info className="shrink-0 w-6 h-6 text-indigo-500" />
            <p className="text-xs font-bold leading-relaxed">
              Kanka burası sadece anlık hesaplama içindir. Hiçbir yere kayıt yapılmaz, personelin alacağına eklenmez. Payları buradan görüp elden dağıtabilirsin.
            </p>
          </div>
        </div>

        {/* Sağ Panel: Dağılım Listesi */}
        <div className="lg:col-span-7 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-slate-300 rounded-full" />
              Pay Dağılım Tablosu
            </h3>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-slate-100">
              {staffWeeklyHours.length} Personel
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto max-h-[600px] divide-y divide-slate-50 custom-scrollbar">
            {staffWeeklyHours.map(staff => {
              const share = Math.floor(staff.totalHours * hourlyTipRate);
              
              return (
                <div key={staff.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <img src={staff.avatar} className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 shadow-sm" />
                    <div>
                      <p className="font-black text-slate-800">{staff.name}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{staff.totalHours} Saat Mesai</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-2">
                       <p className={`font-black text-2xl ${share > 0 ? 'text-indigo-600' : 'text-slate-200'}`}>
                        {share > 0 ? share.toLocaleString() : '0'}
                      </p>
                      <span className="text-[10px] font-black text-slate-300 uppercase">TL</span>
                    </div>
                    {hourlyTipRate > 0 && (
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-tighter mt-1">
                        ({staff.totalHours} x {hourlyTipRate.toFixed(1)})
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            
            {staffWeeklyHours.length === 0 && (
              <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
                <div className="bg-slate-50 p-6 rounded-full text-slate-200">
                  <UserIcon size={48} />
                </div>
                <p className="text-slate-400 font-bold italic text-sm">
                  Seçilen haftada çalışma kaydı bulunamadı kanka. <br/> Önce puantaj girmen lazım.
                </p>
              </div>
            )}
          </div>

          {hourlyTipRate > 0 && (
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Dağıtılan Toplam</p>
                <p className="text-xl font-black text-amber-400">
                  {Math.floor(staffWeeklyHours.reduce((acc, curr) => acc + (curr.totalHours * hourlyTipRate), 0)).toLocaleString()} TL
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Kalan Artık</p>
                <p className="text-xl font-black text-slate-300">
                  {(parseFloat(totalTipPool) - Math.floor(staffWeeklyHours.reduce((acc, curr) => acc + (curr.totalHours * hourlyTipRate), 0))).toFixed(0)} TL
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminTips;
