
import React, { useState } from 'react';
import { AttendanceRecord } from '../types';
import { processAIPuantaj } from '../services/geminiService';
import { Sparkles, CheckCircle2, XCircle, Clock, Search, Filter, MessageSquareCode } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DashboardProps {
  records: AttendanceRecord[];
  setRecords: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  activeTab: 'home' | 'history';
}

const Dashboard: React.FC<DashboardProps> = ({ records, setRecords, activeTab }) => {
  const [aiInput, setAiInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAISubmit = async () => {
    if (!aiInput.trim()) return;
    setIsProcessing(true);
    const result = await processAIPuantaj(aiInput);
    if (result && result.records) {
      // Mock converting result to actual records
      // Real app would match staff names to IDs
      alert(`${result.records.length} personelin puantajı başarıyla işlendi! (Simülasyon)`);
      setAiInput('');
    }
    setIsProcessing(false);
  };

  const chartData = [
    { name: 'Geldi', value: records.filter(r => r.status === 'present').length, color: '#4F46E5' },
    { name: 'İzinli', value: records.filter(r => r.status === 'leave').length, color: '#10B981' },
    { name: 'Hasta', value: records.filter(r => r.status === 'sick').length, color: '#F59E0B' },
    { name: 'Yok', value: records.filter(r => r.status === 'absent').length, color: '#EF4444' },
  ];

  if (activeTab === 'history') {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Genel Puantaj Geçmişi</h2>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center bg-gray-50">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input type="text" placeholder="Personel ara..." className="w-full pl-10 pr-4 py-2 bg-white border rounded-lg text-sm" />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm hover:bg-gray-50">
              <Filter className="w-4 h-4" /> Filtrele
            </button>
          </div>
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Tarih</th>
                <th className="px-6 py-4">Personel</th>
                <th className="px-6 py-4">Giriş</th>
                <th className="px-6 py-4">Çıkış</th>
                <th className="px-6 py-4">Mesai</th>
                <th className="px-6 py-4">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map(record => (
                <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium">{record.date}</td>
                  <td className="px-6 py-4 text-sm">Personel #{record.userId}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{record.entryTime || '--:--'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{record.exitTime || '--:--'}</td>
                  <td className="px-6 py-4 text-sm text-indigo-600 font-semibold">{record.overtime} dk</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      record.status === 'present' ? 'bg-green-100 text-green-700' : 
                      record.status === 'absent' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {record.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium">Toplam Personel</p>
          <p className="text-3xl font-bold mt-1">42</p>
          <div className="mt-2 text-green-500 text-xs flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> %95 Katılım Oranı
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium">Bugün Gelen</p>
          <p className="text-3xl font-bold mt-1">{records.filter(r => r.status === 'present').length}</p>
          <div className="mt-2 text-indigo-500 text-xs flex items-center gap-1">
            <Clock className="w-3 h-3" /> Ortalama giriş: 08:05
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium">Beklenen Mesai</p>
          <p className="text-3xl font-bold mt-1">12.5 Sa</p>
          <div className="mt-2 text-amber-500 text-xs flex items-center gap-1">
            <XCircle className="w-3 h-3" /> 3 Kişi İzinli
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold mb-6">Bugünkü Dağılım</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Quick Entry */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-2xl shadow-lg text-white">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-6 h-6 text-indigo-200" />
            <h3 className="text-lg font-bold">Zeki Puantaj (Gemini)</h3>
          </div>
          <p className="text-sm text-indigo-100 mb-4">
            Sadece kimin geldiğini, geç kaldığını veya izinli olduğunu buraya yaz. Ben her şeyi işlerim!
          </p>
          <textarea
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            placeholder="Örn: Ayşe bugün izinli, Mehmet 10 dk geç geldi, gerisi tam zamanında giriş yaptı."
            className="w-full h-32 bg-white/10 border border-white/20 rounded-xl p-4 text-white placeholder-white/50 focus:ring-2 focus:ring-white/30 outline-none transition-all resize-none"
          />
          <button
            onClick={handleAISubmit}
            disabled={isProcessing}
            className="w-full mt-4 bg-white text-indigo-700 font-bold py-3 rounded-xl hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isProcessing ? 'İşleniyor...' : (
              <>
                <MessageSquareCode className="w-5 h-5" />
                Analiz Et ve Kaydet
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
