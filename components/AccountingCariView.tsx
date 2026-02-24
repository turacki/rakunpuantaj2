
import React, { useState } from 'react';
import { Wholesaler, AccTransaction } from '../types';
import { db } from '../services/supabaseService';
import { Plus, ChevronRight, Truck, Trash2, Edit2, X, Save, RefreshCw } from 'lucide-react';

interface Props {
  wholesalers: Wholesaler[];
  transactions: AccTransaction[];
  selectedId: string | null;
  onRefresh: () => void;
  setSelectedId: (id: string | null) => void;
}

const AccountingCariView: React.FC<Props> = ({ wholesalers, transactions, selectedId, onRefresh, setSelectedId }) => {
  const [isWModalOpen, setIsWModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [wForm, setWForm] = useState({ name: '', openingBalance: '' });

  const handleAddWholesaler = async () => {
    if (!wForm.name.trim()) return;
    setBusy(true);
    try {
      const newId = Math.random().toString(36).substr(2, 9);
      await db.upsertWholesaler({ id: newId, name: wForm.name.trim() });
      const ob = parseFloat(wForm.openingBalance);
      if (ob > 0) {
        await db.upsertAccTransaction({
          id: Math.random().toString(36).substr(2, 9),
          wholesalerId: newId,
          type: 'PURCHASE',
          amount: ob,
          date: new Date().toISOString().split('T')[0],
          note: 'Açılış Bakiyesi'
        });
      }
      setIsWModalOpen(false);
      setWForm({ name: '', openingBalance: '' });
      onRefresh();
    } catch (e) { console.error(e); } finally { setBusy(false); }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm("Bu işlem silinecek, emin misin?")) return;
    try {
      await db.deleteAccTransaction(id);
      onRefresh();
    } catch (e) { alert(e); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in">
      <div className="lg:col-span-4 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-black text-slate-800 uppercase text-xs tracking-tight">Cari Listesi</h3>
          <button onClick={() => setIsWModalOpen(true)} className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><Plus size={18}/></button>
        </div>
        <div className="space-y-2 overflow-y-auto max-h-[600px] custom-scrollbar">
          {wholesalers.map(w => (
            <div key={w.id} onClick={() => setSelectedId(w.id)} className={`p-4 rounded-2xl cursor-pointer transition-all border flex items-center justify-between ${selectedId === w.id ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-50 border-slate-50'}`}>
              <p className="font-black text-sm">{w.name}</p>
              <ChevronRight size={16} />
            </div>
          ))}
        </div>
      </div>

      <div className="lg:col-span-8">
        {selectedId ? (
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
            <div className="p-8 bg-slate-50/50 border-b border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-white p-3 rounded-2xl shadow-sm"><Truck size={24} className="text-emerald-600"/></div>
                <h3 className="text-xl font-black text-slate-800">{wholesalers.find(w => w.id === selectedId)?.name}</h3>
              </div>
            </div>
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <tr>
                    <th className="px-8 py-5">Tarih</th>
                    <th className="px-8 py-5">İşlem</th>
                    <th className="px-8 py-5 text-right">Tutar</th>
                    <th className="px-8 py-5 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {transactions.filter(t => t.wholesalerId === selectedId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => (
                    <tr key={t.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-5 text-xs font-bold text-slate-500">{new Date(t.date).toLocaleDateString('tr-TR')}</td>
                      <td className="px-8 py-5 text-xs font-black uppercase text-slate-700">{t.type === 'PURCHASE' ? 'Borç' : 'Ödeme'}</td>
                      <td className={`px-8 py-5 text-right font-black ${t.type === 'PURCHASE' ? 'text-slate-800' : 'text-emerald-600'}`}>{t.amount.toLocaleString()} TL</td>
                      <td className="px-8 py-5 text-right"><button onClick={() => handleDeleteTransaction(t.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="h-full bg-white rounded-[2.5rem] border border-dashed border-slate-200 flex flex-col items-center justify-center p-20 opacity-30">
            <Truck size={64} className="mb-4" />
            <p className="font-black text-sm uppercase tracking-widest">Toptancı Seç Kanka</p>
          </div>
        )}
      </div>

      {isWModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[9999] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] p-10 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black text-slate-800">Cari Kart</h3><button onClick={() => setIsWModalOpen(false)}><X/></button></div>
            <div className="space-y-4">
              <input type="text" placeholder="Toptancı Adı" className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none" value={wForm.name} onChange={e => setWForm({...wForm, name: e.target.value})} />
              <input type="number" placeholder="Açılış Borcu (TL)" className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-black text-xl outline-none" value={wForm.openingBalance} onChange={e => setWForm({...wForm, openingBalance: e.target.value})} />
            </div>
            <button onClick={handleAddWholesaler} className="w-full mt-8 bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase flex items-center justify-center gap-3">KAYDET</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountingCariView;
