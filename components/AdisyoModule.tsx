
import React, { useState, useMemo, useEffect } from 'react';
import { Database, RefreshCw, Download, AlertCircle, CheckCircle2, Terminal, Calendar, BarChart2, TrendingUp, Settings, X, ChevronDown, Bot, LayoutDashboard, Search, Send, AlertTriangle, Loader2 } from 'lucide-react';
import { adisyoService } from '../services/adisyoService';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import DatePicker, { registerLocale } from "react-datepicker";
import { tr } from 'date-fns/locale';
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subYears } from 'date-fns';
import AdisyoAnalyst from './AdisyoAnalyst';

registerLocale('tr', tr);

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f43f5e', '#14b8a6', '#10b981', '#ef4444'];

const EXPENSE_MAPPING: Record<string, string[]> = {
  'EFES': ['EFES'],
  'BAR': ['Ağır alkol', 'Market/Pazar Bar ve diğer', 'Buz ve Fıstık', 'Softlar (Su soda kola kahve)', 'Bar Aleti', 'çekirdek kahve'],
  'PERSONEL': ['Personel', 'personel turaç'],
  'KİRA VE FATURALAR': ['kira', 'faturalar', 'odun', 'muhasebe', 'adisyo', 'POS Komisyonu', 'Vergi ve sigorta ödemeleri'],
  'MUTFAK': ['palmiye', 'taksi', 'Mutfak Perso', 'Ekmek', 'Market/Pazar Mutfak', 'Mutfak Toptan'],
  'TEMİZLİK': ['Temizlik Malzemeleri ve Ambalaj', 'Çarşı Giderleri (Güvenlik,Aidat)']
};

const UPPER_CATEGORY_MAP: Record<string, string> = {
  'Fıçı biralar': 'Bira',
  'Şişe biralar': 'Bira',
  'Bira kokteylleri': 'Bira',
  'Bira': 'Bira',
  'Şarap': 'Şarap',
  'Kokteyller': 'Ağır Alkol',
  'Rakun Lab Kokteylleri': 'Ağır Alkol',
  'Rakun\'dan': 'Ağır Alkol',
  'Shotlar': 'Ağır Alkol',
  'Viskiler': 'Ağır Alkol',
  'Atıştırmalıklar': 'Mutfak',
  'Burgerler': 'Mutfak',
  'Wrapler': 'Mutfak',
  'Ana Yemekler': 'Mutfak',
  'Börekler': 'Mutfak',
  'Vegan Yemekler': 'Mutfak',
  'Salatalar': 'Mutfak',
  'Soslar': 'Mutfak',
  'Mutfak': 'Mutfak',
  'Sıcak içecekler': 'Softlar',
  'soğuk içecekler': 'Softlar',
  'Softlar': 'Softlar',
  'Sıcak İçecekler': 'Softlar',
  'Soğuk İçecekler': 'Softlar'
};

const AdisyoModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analyst'>('dashboard');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [fetchedData, setFetchedData] = useState<any>(null);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [expensesData, setExpensesData] = useState<any[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<any[]>([]);
  const [includeTrend, setIncludeTrend] = useState(false);

  const [orderIdInput, setOrderIdInput] = useState('');
  const [orderDetail, setOrderDetail] = useState<any>(null);
  const [isFetchingOrder, setIsFetchingOrder] = useState(false);

  // Tarih Seçimi
  const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const setRange = (start: Date, end: Date) => {
    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
    setIsDatePickerOpen(false);
  };

  const presets = [
    { label: 'Son 30 Gün', range: [subDays(new Date(), 30), new Date()] },
    { label: 'Bu Ay', range: [startOfMonth(new Date()), endOfMonth(new Date())] },
    { label: 'Bu Yıl', range: [startOfYear(new Date()), new Date()] },
    { label: 'Son 12 Ay', range: [subMonths(new Date(), 12), new Date()] },
    { label: 'Geçen Yıl', range: [startOfYear(subYears(new Date(), 1)), endOfYear(subYears(new Date(), 1))] },
  ];

  const handleFetchData = async () => {
    setLoading(true);
    setStatus('idle');
    setMessage('Veri çekme işlemi başlatıldı...');
    
    try {
      setMessage('Adisyo API ile bağlantı kuruluyor...');
      console.log('Fetching data for range:', startDate, 'to', endDate);
      
      const data = await adisyoService.getTopSalesByCategory(startDate, endDate);
      
      console.log('Data received:', data);
      setFetchedData(data);

      // Giderleri çek
      setMessage('Gider verileri çekiliyor...');
      try {
        const [expenses, types] = await Promise.all([
          adisyoService.getExpenses(startDate, endDate),
          adisyoService.getExpenseTypes()
        ]);
        setExpensesData(expenses);
        setExpenseTypes(types);
      } catch (err) {
        console.error("Expense or Types fetch error:", err);
        // Eğer tipler başarısız olursa sadece giderleri dene
        try {
          const expenses = await adisyoService.getExpenses(startDate, endDate);
          setExpensesData(expenses);
        } catch (e) {}
      }

      // Günlük verileri çek (Trend için) - Opsiyonel
      if (includeTrend) {
        setMessage('Haftalık trend verileri hazırlanıyor (Pazartesi-Pazar)...');
        const weekly = await adisyoService.getWeeklySalesByCategory(startDate, endDate);
        setWeeklyData(weekly);
        
        // Günlük veriyi sadece kısa aralıklar için çekelim (API'yi yormamak için)
        const diffDays = Math.ceil(Math.abs(new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 31) {
          setMessage('Günlük detaylı trend verileri hazırlanıyor...');
          const daily = await adisyoService.getDailySalesByCategory(startDate, endDate);
          setDailyData(daily);
        } else {
          setDailyData([]);
        }
      } else {
        setWeeklyData([]);
        setDailyData([]);
      }

      setLoading(false);
      setStatus('success');
      setMessage('Veriler başarıyla çekildi!');

    } catch (error: any) {
      console.error("Adisyo API Error Detail:", error);
      setLoading(false);
      setStatus('error');
      
      let errorMsg = error.message || 'Bilinmeyen bir hata oluştu.';
      if (errorMsg.includes('401')) {
        errorMsg = 'Yetkilendirme Hatası (401): Token geçersiz veya süresi dolmuş olabilir. Lütfen tokenı kontrol edin.';
      }
      
      setMessage(errorMsg);
      // Hata detayını da gösterelim
      setFetchedData({ error: true, detail: error.message, hint: 'Konsol (F12) üzerinden detaylı network loglarını kontrol edebilirsiniz.' });
    }
  };

  const handleFetchOrderDetail = async () => {
    if (!orderIdInput.trim()) return;
    setIsFetchingOrder(true);
    setOrderDetail(null);
    try {
      const data = await adisyoService.getOrderForDetail(orderIdInput.trim());
      setOrderDetail(data);
    } catch (error: any) {
      console.error("Order fetch error:", error);
      setOrderDetail({ error: error.message || "Adisyon bulunamadı veya bir hata oluştu." });
    } finally {
      setIsFetchingOrder(false);
    }
  };

  // Veriyi sadeleştir ve grafik için hazırla
  const chartData = useMemo(() => {
    if (!fetchedData || !Array.isArray(fetchedData)) return [];
    
    return fetchedData.map((item: any) => ({
      name: item.name,
      sum: item.sum,
      quantity: item.quantity
    })).sort((a, b) => b.sum - a.sum);
  }, [fetchedData]);

  // Üst kategori verilerini hesapla
  const upperCategoryData = useMemo(() => {
    if (!chartData || chartData.length === 0) return [];

    const groups: Record<string, { name: string, sum: number, quantity: number }> = {};

    // Case-insensitive map lookup için yardımcı fonksiyon
    const getUpperCategory = (catName: string): string => {
      const normalized = catName.trim().toLowerCase();
      
      // Map'teki anahtarları da normalize edip kontrol edelim
      for (const [key, value] of Object.entries(UPPER_CATEGORY_MAP)) {
        if (key.toLowerCase() === normalized) {
          return value;
        }
      }
      return 'Diğer';
    };

    chartData.forEach(item => {
      const upperName = getUpperCategory(item.name);
      if (!groups[upperName]) {
        groups[upperName] = { name: upperName, sum: 0, quantity: 0 };
      }
      groups[upperName].sum += item.sum;
      groups[upperName].quantity += item.quantity;
    });

    return Object.values(groups).sort((a, b) => b.sum - a.sum);
  }, [chartData]);

  // Giderleri grupla ve Kar-Zarar verisini hazırla
  const profitLossData = useMemo(() => {
    if (!fetchedData || !expensesData || !Array.isArray(fetchedData)) return [];

    const totalRevenue = fetchedData.reduce((acc: number, curr: any) => acc + (curr.sum || 0), 0);
    
    const expenseGroups: Record<string, number> = {
      'EFES': 0,
      'BAR': 0,
      'PERSONEL': 0,
      'KİRA VE FATURALAR': 0,
      'MUTFAK': 0,
      'TEMİZLİK': 0,
      'DİĞER': 0
    };

    expensesData.forEach((exp: any) => {
      const type = expenseTypes.find(t => t.id === exp.expenseTypeId);
      const typeName = type ? (type.title || type.name || '') : '';
      const normalized = typeName.toLowerCase().trim();
      
      let found = false;
      for (const [upper, keywords] of Object.entries(EXPENSE_MAPPING)) {
        if (keywords.some(k => k.toLowerCase().trim() === normalized)) {
          expenseGroups[upper] += (exp.amount || 0);
          found = true;
          break;
        }
      }
      if (!found) {
        expenseGroups['DİĞER'] += (exp.amount || 0);
      }
    });

    const totalExpenses = Object.values(expenseGroups).reduce((a, b) => a + b, 0);
    const profit = Math.max(0, totalRevenue - totalExpenses);

    const chartData = Object.entries(expenseGroups)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({
        name,
        sum: value,
        type: 'expense'
      }));

    if (profit > 0) {
      chartData.push({
        name: 'NET KAR',
        sum: profit,
        type: 'profit'
      });
    }

    return chartData.sort((a, b) => b.sum - a.sum);
  }, [fetchedData, expensesData, expenseTypes]);

  const totalUpperSum = useMemo(() => upperCategoryData.reduce((acc, curr) => acc + curr.sum, 0), [upperCategoryData]);
  const totalProfitLossSum = useMemo(() => profitLossData.reduce((acc, curr) => acc + curr.sum, 0), [profitLossData]);

  // Birim Ekonomisi ve Kategori Analizi
  const unitEconomicsData = useMemo(() => {
    if (!upperCategoryData.length || !expensesData.length) return [];

    const totalRevenue = upperCategoryData.reduce((acc, curr) => acc + curr.sum, 0);
    
    // Gider gruplarını hesapla
    const expenseGroups: Record<string, number> = {
      'EFES': 0, 'BAR': 0, 'PERSONEL': 0, 'KİRA VE FATURALAR': 0, 'MUTFAK': 0, 'TEMİZLİK': 0, 'DİĞER': 0
    };

    expensesData.forEach((exp: any) => {
      const type = expenseTypes.find(t => t.id === exp.expenseTypeId);
      const typeName = type ? (type.title || type.name || '') : '';
      const normalized = typeName.toLowerCase().trim();
      
      let found = false;
      for (const [upper, keywords] of Object.entries(EXPENSE_MAPPING)) {
        if (keywords.some(k => k.toLowerCase().trim() === normalized)) {
          expenseGroups[upper] += (exp.amount || 0);
          found = true;
          break;
        }
      }
      if (!found) expenseGroups['DİĞER'] += (exp.amount || 0);
    });

    // Her gelir kategorisi için analiz yap
    return upperCategoryData.map(cat => {
      const share = totalRevenue > 0 ? cat.sum / totalRevenue : 0;
      let allocatedExpense = 0;

      // Ortak giderler (Ciro payı oranında dağıtılanlar)
      const sharedExpenses = expenseGroups['PERSONEL'] + expenseGroups['TEMİZLİK'] + expenseGroups['DİĞER'] + expenseGroups['KİRA VE FATURALAR'];
      allocatedExpense += sharedExpenses * share;

      // Direkt giderler
      if (cat.name === 'Bira') allocatedExpense += expenseGroups['EFES'];
      if (cat.name === 'Ağır Alkol') allocatedExpense += expenseGroups['BAR'];
      if (cat.name === 'Mutfak') allocatedExpense += expenseGroups['MUTFAK'];

      const avgRevenue = cat.quantity > 0 ? cat.sum / cat.quantity : 0;
      const avgCost = cat.quantity > 0 ? allocatedExpense / cat.quantity : 0;
      const avgProfit = avgRevenue - avgCost;
      const margin = avgCost > 0 ? (avgProfit / avgCost) * 100 : 0;

      return {
        ...cat,
        allocatedExpense,
        avgRevenue,
        avgCost,
        avgProfit,
        margin,
        share: share * 100
      };
    }).filter(item => item.name !== 'Diğer' && item.name !== 'Softlar').sort((a, b) => b.avgProfit - a.avgProfit);
  }, [upperCategoryData, expensesData, expenseTypes]);

  // Pasta grafik için özel etiket render fonksiyonu
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius * 1.2;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.03) return null; // %3'ten küçükleri kalabalık yapmasın diye gizle (Tooltip'te görünecek)

    return (
      <text 
        x={x} 
        y={y} 
        fill="#475569" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-[10px] font-bold"
      >
        {`${name} (${(percent * 100).toFixed(0)}%)`}
      </text>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header & Controls */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div>
              <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                <Database className="text-indigo-600 w-8 h-8" />
                Adisyo Analiz
              </h2>
              <p className="text-slate-500 font-medium mt-2">Kategori bazlı satış performansını takip edin.</p>
            </div>

            <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  activeTab === 'dashboard' 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <LayoutDashboard size={16} /> Dashboard
              </button>
              <button
                onClick={() => setActiveTab('analyst')}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  activeTab === 'analyst' 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Bot size={16} /> AI Analist
              </button>
            </div>
          </div>

          {activeTab === 'dashboard' && (
            <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <button 
                onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                className="flex items-center gap-3 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100 hover:bg-slate-100 transition-all shadow-sm group"
              >
                <Calendar size={16} className="text-indigo-500 group-hover:scale-110 transition-transform" />
                <div className="flex flex-col items-start">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Tarih Aralığı</span>
                  <span className="text-[11px] font-black text-slate-700 uppercase tracking-tighter">
                    {format(new Date(startDate), 'dd MMM yyyy', { locale: tr })} - {format(new Date(endDate), 'dd MMM yyyy', { locale: tr })}
                  </span>
                </div>
                <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isDatePickerOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDatePickerOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDatePickerOpen(false)} />
                  <div className="absolute top-full left-0 mt-3 bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-6 z-50 animate-in fade-in zoom-in-95 duration-200 min-w-[320px] md:min-w-[450px]">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-1 border-r border-slate-50 pr-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2">Hızlı Seçim</p>
                        {presets.map((preset) => (
                          <button
                            key={preset.label}
                            onClick={() => setRange(preset.range[0], preset.range[1])}
                            className="w-full text-left px-4 py-2 rounded-xl text-[11px] font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                      <div className="md:col-span-2">
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Başlangıç</p>
                              <DatePicker
                                selected={new Date(startDate)}
                                onChange={(date) => date && setStartDate(format(date, 'yyyy-MM-dd'))}
                                selectsStart
                                startDate={new Date(startDate)}
                                endDate={new Date(endDate)}
                                locale="tr"
                                dateFormat="dd/MM/yyyy"
                                showMonthDropdown
                                showYearDropdown
                                dropdownMode="select"
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 transition-colors"
                              />
                            </div>
                            <div className="flex-1">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Bitiş</p>
                              <DatePicker
                                selected={new Date(endDate)}
                                onChange={(date) => date && setEndDate(format(date, 'yyyy-MM-dd'))}
                                selectsEnd
                                startDate={new Date(startDate)}
                                endDate={new Date(endDate)}
                                minDate={new Date(startDate)}
                                locale="tr"
                                dateFormat="dd/MM/yyyy"
                                showMonthDropdown
                                showYearDropdown
                                dropdownMode="select"
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 transition-colors"
                              />
                            </div>
                          </div>
                          <button 
                            onClick={() => setIsDatePickerOpen(false)}
                            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
                          >
                            Uygula
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 hover:bg-slate-100 transition-colors">
              <input 
                type="checkbox" 
                checked={includeTrend} 
                onChange={(e) => setIncludeTrend(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Trend Analizi</span>
            </label>

            <button
              onClick={handleFetchData}
              disabled={loading}
              className="flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
              Verileri Güncelle
            </button>
          </div>
          )}
        </div>
      </div>

      {activeTab === 'analyst' ? (
        <div className="h-[calc(100vh-300px)] min-h-[600px]">
          <AdisyoAnalyst startDate={startDate} endDate={endDate} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar: Status */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
            <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-widest">
              <AlertCircle className="w-4 h-4 text-amber-500" /> Durum
            </h3>
            
            <div className={`p-4 rounded-2xl border ${
              status === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
              status === 'error' ? 'bg-red-50 border-red-100 text-red-700' :
              'bg-slate-50 border-slate-100 text-slate-600'
            }`}>
              <p className="font-bold text-xs leading-relaxed">{message}</p>
            </div>
          </div>

          {/* Adisyon Sorgulama Alanı */}
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
            <h3 className="font-black text-slate-800 flex items-center gap-2 text-sm uppercase tracking-widest">
              <Search size={16} className="text-amber-500" /> Adisyon Sorgula
            </h3>
            
            <div className="flex gap-2">
              <input 
                type="text"
                value={orderIdInput}
                onChange={(e) => setOrderIdInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFetchOrderDetail()}
                placeholder="Adisyon No"
                className="flex-1 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 transition-all"
              />
              <button 
                onClick={handleFetchOrderDetail}
                disabled={isFetchingOrder || !orderIdInput.trim()}
                className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {isFetchingOrder ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>

            {orderDetail && (
              <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 animate-in fade-in slide-in-from-top-2">
                {orderDetail.error ? (
                  <div className="text-red-500 text-[10px] font-bold flex items-center gap-2">
                    <AlertTriangle size={12} />
                    {orderDetail.error}
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">#{orderDetail.id}</span>
                      <span className="text-xs font-black text-indigo-600">{orderDetail.totalAmount} TL</span>
                    </div>
                    <div className="space-y-1 max-h-40 overflow-y-auto no-scrollbar">
                      {orderDetail.orderDetails?.map((item: any, i: number) => (
                        <div key={i} className="flex justify-between text-[10px] py-1">
                          <span className="text-slate-600 font-bold">{item.quantity}x {item.product?.name || item.productName || 'Bilinmeyen Ürün'}</span>
                          <span className="text-slate-800 font-black">{item.totalAmount} TL</span>
                        </div>
                      ))}
                    </div>
                    <details className="pt-2 border-t border-slate-200">
                      <summary className="text-[9px] font-black text-slate-400 cursor-pointer uppercase tracking-widest">JSON Detay</summary>
                      <pre className="mt-2 text-[8px] bg-slate-900 text-slate-300 p-2 rounded-lg overflow-x-auto">
                        {JSON.stringify(orderDetail, null, 2)}
                      </pre>
                    </details>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main Content: Charts */}
        <div className="lg:col-span-3 space-y-6">
          {chartData.length > 0 ? (
            <>
              {/* Weekly Trend Chart (New) */}
              {includeTrend && weeklyData.length > 0 && (
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 animate-in fade-in slide-in-from-top-4 duration-700">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase tracking-widest text-sm">
                      <TrendingUp className="w-4 h-4 text-indigo-600" /> Haftalık Satış Trendi (Pzt - Paz)
                    </h3>
                    <div className="px-4 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                      Haftalık Toplam Ciro
                    </div>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={weeklyData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="label" 
                          tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                        />
                        <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          formatter={(value: number) => [`₺${value.toLocaleString('tr-TR')}`, 'Haftalık Toplam']}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="sum" 
                          stroke="#4f46e5" 
                          strokeWidth={4} 
                          dot={{ r: 6, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 8, strokeWidth: 0 }}
                          name="Haftalık Ciro" 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Summary Cards */}
              <div className="grid grid-cols-1 gap-6">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                      <TrendingUp size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Toplam Ciro</p>
                      <h4 className="text-2xl font-black text-slate-800">
                        ₺{chartData.reduce((acc, curr) => acc + curr.sum, 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </h4>
                    </div>
                  </div>
                </div>
              </div>

              {/* Distribution Charts */}
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                <h3 className="font-black text-slate-800 mb-8 flex items-center gap-2 uppercase tracking-widest text-sm">
                  <Database className="w-4 h-4 text-indigo-600" /> Üst Kategori Dağılımı (Ciro)
                </h3>
                <div className="h-[500px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={upperCategoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={renderCustomizedLabel}
                        outerRadius={130}
                        innerRadius={80}
                        paddingAngle={5}
                        fill="#8884d8"
                        dataKey="sum"
                      >
                        {upperCategoryData.map((entry: any, index: number) => (
                          <Cell key={`cell-upper-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number, name: string) => {
                          const percent = totalUpperSum > 0 ? ((value / totalUpperSum) * 100).toFixed(1) : 0;
                          return [`${value.toLocaleString('tr-TR')} ₺ (%${percent})`, name];
                        }}
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Kar-Zarar Analizi Section */}
              <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
                <h3 className="font-black text-slate-800 mb-8 flex items-center gap-2 uppercase tracking-widest text-sm">
                  <TrendingUp className="w-4 h-4 text-emerald-600" /> Kar-Zarar Analizi (Ciro Bazlı)
                </h3>
                <div className="h-[500px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={profitLossData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={renderCustomizedLabel}
                        outerRadius={130}
                        innerRadius={80}
                        paddingAngle={5}
                        fill="#8884d8"
                        dataKey="sum"
                      >
                        {profitLossData.map((entry: any, index: number) => (
                          <Cell 
                            key={`cell-profit-${index}`} 
                            fill={entry.name === 'NET KAR' ? '#10b981' : COLORS[index % COLORS.length]} 
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                        formatter={(value: number, name: string) => {
                          const percent = totalProfitLossSum > 0 ? ((value / totalProfitLossSum) * 100).toFixed(1) : 0;
                          return [`${value.toLocaleString('tr-TR')} ₺ (%${percent})`, name];
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-6 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Toplam Ciro:</span>
                    <span className="text-sm font-black text-slate-800">
                      {fetchedData?.reduce((acc: number, curr: any) => acc + (curr.sum || 0), 0).toLocaleString('tr-TR')} ₺
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Toplam Gider:</span>
                    <span className="text-sm font-black text-rose-600">
                      {expensesData?.reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0).toLocaleString('tr-TR')} ₺
                    </span>
                  </div>
                  <div className="h-px bg-slate-200 my-4"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Net Kar:</span>
                    <span className={`text-lg font-black ${
                      (fetchedData?.reduce((acc: number, curr: any) => acc + (curr.sum || 0), 0) - 
                        expensesData?.reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0)) > 0 
                      ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {(fetchedData?.reduce((acc: number, curr: any) => acc + (curr.sum || 0), 0) - 
                        expensesData?.reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0)).toLocaleString('tr-TR')} ₺
                    </span>
                  </div>
                </div>
              </div>

              {/* Birim Ekonomisi ve Kategori Analizi Section */}
              <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase tracking-widest text-sm">
                    <BarChart2 className="w-4 h-4 text-indigo-600" /> Birim Ekonomisi ve Kategori Analizi
                  </h3>
                  <div className="px-4 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                    Faaliyet Tabanlı Maliyetlendirme
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-separate border-spacing-y-3">
                    <thead>
                      <tr className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                        <th className="px-6 py-2">Kategori</th>
                        <th className="px-6 py-2 text-right">Ciro Payı</th>
                        <th className="px-6 py-2 text-right">Birim Satış</th>
                        <th className="px-6 py-2 text-right">Birim Maliyet</th>
                        <th className="px-6 py-2 text-right">Birim Kar</th>
                        <th className="px-6 py-2 text-right">Marj</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unitEconomicsData.map((item, index) => (
                        <tr key={`econ-${index}`} className="bg-slate-50/50 hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-5 rounded-l-3xl">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-8 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                              <span className="font-black text-slate-800 text-sm">{item.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <span className="text-xs font-bold text-slate-500">%{item.share.toFixed(1)}</span>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <span className="font-bold text-slate-800 text-sm">{item.avgRevenue.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</span>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <span className="font-bold text-rose-500 text-sm">{item.avgCost.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</span>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <span className={`font-black text-sm ${item.avgProfit > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {item.avgProfit.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right rounded-r-3xl">
                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black ${
                              item.margin > 30 ? 'bg-emerald-100 text-emerald-700' : 
                              item.margin > 15 ? 'bg-amber-100 text-amber-700' : 
                              'bg-rose-100 text-rose-700'
                            }`}>
                              %{item.margin.toFixed(1)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-6 bg-indigo-50/50 rounded-[2rem] border border-indigo-100">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">En Karlı Kategori</p>
                    <h5 className="text-lg font-black text-indigo-900">
                      {unitEconomicsData.length > 0 ? unitEconomicsData.reduce((prev, current) => (prev.margin > current.margin) ? prev : current).name : '-'}
                    </h5>
                  </div>
                  <div className="p-6 bg-emerald-50/50 rounded-[2rem] border border-emerald-100">
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Ortalama Marj</p>
                    <h5 className="text-lg font-black text-emerald-900">
                      %{unitEconomicsData.length > 0 ? (unitEconomicsData.reduce((acc, curr) => acc + curr.margin, 0) / unitEconomicsData.length).toFixed(1) : '0'}
                    </h5>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white p-12 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center h-full min-h-[500px]">
              <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200 mb-6">
                <BarChart2 size={40} />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">Veri Bekleniyor</h3>
              <p className="text-slate-400 max-w-xs mx-auto text-sm font-medium">
                Tarih aralığını seçip "Verileri Güncelle" butonuna basarak analizi başlatabilirsiniz.
              </p>
            </div>
          )}
        </div>
      </div>
    )}
  </div>
);
};

export default AdisyoModule;
