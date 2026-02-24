
import React, { useState, useEffect } from 'react';
import { Wholesaler, AccTransaction } from '../types';
import { db } from '../services/supabaseService';
import { Calculator, Download, Upload, RefreshCw, Plus } from 'lucide-react';
import AccountingDashboard from './AccountingDashboard';
import AccountingCariView from './AccountingCariView';

type AccountingTab = 'dashboard' | 'wholesalers';

const AdminAccounting: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<AccountingTab>('dashboard');
  const [wholesalers, setWholesalers] = useState<Wholesaler[]>([]);
  const [transactions, setTransactions] = useState<AccTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selectedWholesalerId, setSelectedWholesalerId] = useState<string | null>(null);

  const loadData = async () => {
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

  useEffect(() => { loadData(); }, []);

  const handleExport = async () => {
    setBusy(true);
    try {
      const data = await db.exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PuantajPro_Muhasebe_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) { alert("Hata: " + err.message); } finally { setBusy(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-[1400px] mx-auto px-4 lg:px-0">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-600 p-3 rounded-2xl shadow-lg shadow-emerald-100"><Calculator className="text-white w-6 h-6" /></div>
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Ön Muhasebe</h2>
            <button onClick={handleExport} disabled={busy} className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-700 mt-1">
              <Download size={12} /> Dışa Aktar
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm w-full lg:w-auto">
          <button onClick={() => setActiveSubTab('dashboard')} className={`flex-1 lg:flex-none px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeSubTab === 'dashboard' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Özet</button>
          <button onClick={() => setActiveSubTab('wholesalers')} className={`flex-1 lg:flex-none px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeSubTab === 'wholesalers' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Cariler</button>
        </div>
      </div>

      {activeSubTab === 'dashboard' ? (
        <AccountingDashboard 
          wholesalers={wholesalers} 
          transactions={transactions} 
          onRefresh={loadData}
          onSelectWholesaler={(id) => { setSelectedWholesalerId(id); setActiveSubTab('wholesalers'); }}
        />
      ) : (
        <AccountingCariView 
          wholesalers={wholesalers} 
          transactions={transactions} 
          selectedId={selectedWholesalerId}
          onRefresh={loadData}
          setSelectedId={setSelectedWholesalerId}
        />
      )}
    </div>
  );
};

export default AdminAccounting;
