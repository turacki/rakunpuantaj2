import React, { useState, useEffect } from 'react';
import { Bot, Sparkles, TrendingUp, AlertTriangle, Loader2, MessageSquare, Send, GraduationCap, Plus, Trash2, X } from 'lucide-react';
import { adisyoService } from '../services/adisyoService';
import { supabase, db as supabaseService } from '../services/supabaseService';
import { analyzeBusinessData, chatWithAnalyst } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'model';
  content: string;
}

interface AdisyoAnalystProps {
  startDate: string;
  endDate: string;
}

const AdisyoAnalyst: React.FC<AdisyoAnalystProps> = ({ startDate, endDate }) => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [showTraining, setShowTraining] = useState(false);
  const [trainingNotes, setTrainingNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [businessData, setBusinessData] = useState<any>(null);

  const fetchTrainingNotes = async () => {
    try {
      const notes = await supabaseService.getAITrainingNotes();
      setTrainingNotes(notes);
    } catch (error) {
      console.error("Fetch training notes error:", error);
    }
  };

  useEffect(() => {
    fetchTrainingNotes();
  }, []);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setIsSavingNote(true);
    try {
      await supabaseService.upsertAITrainingNote(newNote.trim());
      setNewNote('');
      await fetchTrainingNotes();
    } catch (error) {
      console.error("Note save error:", error);
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await supabaseService.deleteAITrainingNote(id);
      await fetchTrainingNotes();
    } catch (error) {
      console.error("Note delete error:", error);
    }
  };

  const fetchAndAnalyze = async () => {
    setLoading(true);
    try {
      // Fetch all necessary data with individual error handling
      const [
        salesByCategory,
        salesByProduct,
        salesByUsers,
        expenses,
        trainingNotes,
        users,
        entries,
        inventoryItems,
        inventoryOrders,
        accTransactions,
        settings,
        dailyTrend
      ] = await Promise.all([
        adisyoService.getTopSalesByCategory(startDate, endDate).catch(e => { console.error("Category sales fetch failed:", e); return []; }),
        adisyoService.getTopSalesByProduct(startDate, endDate).catch(e => { console.error("Product sales fetch failed:", e); return []; }),
        adisyoService.getSalesByUsers(startDate, endDate).catch(e => { console.error("User sales fetch failed:", e); return []; }),
        adisyoService.getExpenses(startDate, endDate).catch(e => { console.error("Expenses fetch failed:", e); return []; }),
        supabaseService.getAITrainingNotes().catch(e => { console.error("Training notes fetch failed:", e); return []; }),
        supabaseService.getUsers().catch(() => []),
        supabaseService.getEntries().catch(() => []),
        supabaseService.getInventoryItems().catch(() => []),
        supabaseService.getInventoryOrders().catch(() => []),
        supabaseService.getAccTransactions().catch(() => []),
        supabaseService.getSettings().catch(() => ({})),
        adisyoService.getDailySalesByCategory(startDate, endDate).catch(e => { console.error("Daily trend fetch failed:", e); return null; })
      ]);

      const businessData = {
        period: {
          startDate,
          endDate,
          salesByCategory: salesByCategory,
          salesByProduct: salesByProduct,
          salesByUsers: salesByUsers, // Bu sadece satış performansıdır, puantaj değildir
          dailyTrend: dailyTrend
        },
        expenses: expenses,
        systemData: {
          users,
          entries: entries.filter(e => e.date >= startDate && e.date <= endDate),
          inventoryItems,
          inventoryOrders: inventoryOrders.filter(o => o.createdAt >= startDate && o.createdAt <= endDate),
          accTransactions: accTransactions.filter(t => t.date >= startDate && t.date <= endDate),
          settings
        }
      };

      const notes = trainingNotes.map((n: any) => n.content);
      const aiResponse = await analyzeBusinessData(businessData, notes);
      setBusinessData(businessData);
      setAnalysis(aiResponse);
      setMessages([{ role: 'model', content: aiResponse }]);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Analysis failed:", error);
      setAnalysis("Veriler toplanırken bir hata oluştu. Lütfen bağlantılarınızı kontrol edin.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isSending || !businessData) return;

    const userMsg = userInput.trim();
    setUserInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsSending(true);

    try {
      const notes = trainingNotes.map((n: any) => n.content);
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));

      const aiResponse = await chatWithAnalyst(businessData, history, userMsg, notes);
      setMessages(prev => [...prev, { role: 'model', content: aiResponse }]);
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    fetchAndAnalyze();
  }, [startDate, endDate]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-bottom border-slate-100 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-indigo-200 shadow-lg">
            <Bot size={22} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 leading-tight">Baş Analist & Operasyon Direktörü</h3>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Sparkles size={10} className="text-amber-500" />
              Yapay Zeka Destekli Gerçek Zamanlı Analiz
            </p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-100 rounded-full">
          <AlertTriangle size={12} className="text-amber-500" />
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-tight">Puantaj Verisi Koruma Altında</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowTraining(!showTraining)}
            className={`p-2 rounded-lg transition-colors ${showTraining ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-white hover:text-indigo-600'}`}
            title="AI Eğitimi & Özel Notlar"
          >
            <GraduationCap size={20} />
          </button>
          <button 
            onClick={fetchAndAnalyze}
            disabled={loading}
            className="p-2 hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-indigo-600 disabled:opacity-50"
            title="Analizi Yenile"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <TrendingUp size={20} />}
          </button>
        </div>
      </div>

      {/* Training Overlay */}
      {showTraining && (
        <div className="p-4 bg-indigo-50 border-b border-indigo-100 animate-in slide-in-from-top duration-300">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
              <GraduationCap size={16} />
              AI Eğitim Notları & İşletme Kuralları
            </h4>
            <button onClick={() => setShowTraining(false)} className="text-indigo-400 hover:text-indigo-600">
              <X size={16} />
            </button>
          </div>
          <p className="text-[11px] text-indigo-700 mb-3 leading-relaxed">
            Buraya eklediğin her not, AI Analist'in dükkanını daha iyi tanımasını sağlar. 
            Örn: "Alkol maliyetimiz %25 olmalı", "Pazartesi günleri personel toplantısı var", "X ürünü aslında Y kategorisinde sayılmalı" gibi...
          </p>
          
          <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
            {trainingNotes.map(note => (
              <div key={note.id} className="bg-white p-2 rounded-lg border border-indigo-100 flex items-start justify-between group">
                <p className="text-xs text-slate-700">{note.content}</p>
                <button 
                  onClick={() => handleDeleteNote(note.id)}
                  className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {trainingNotes.length === 0 && (
              <div className="text-center py-4 border-2 border-dashed border-indigo-200 rounded-lg">
                <p className="text-[10px] text-indigo-400 italic">Henüz bir eğitim notu eklenmemiş.</p>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <input 
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
              placeholder="Yeni bir kural veya bilgi ekle..."
              className="flex-1 px-3 py-2 bg-white border border-indigo-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <button 
              onClick={handleAddNote}
              disabled={isSavingNote || !newNote.trim()}
              className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {isSavingNote ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 custom-scrollbar">
        {loading && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
            <Loader2 size={40} className="animate-spin text-indigo-600" />
            <p className="text-sm font-medium">Veriler toplanıyor ve analiz ediliyor...</p>
          </div>
        ) : messages.length > 0 ? (
          <div className="space-y-6">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-5 rounded-2xl shadow-sm relative overflow-hidden ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                }`}>
                  {msg.role === 'model' && <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600"></div>}
                  <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert' : 'prose-slate'}`}>
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            
            {isSending && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-indigo-600" />
                  <span className="text-xs text-slate-500 font-medium">Baş Analist düşünüyor...</span>
                </div>
              </div>
            )}

            {lastUpdate && messages.length === 1 && (
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                <span>Son Güncelleme: {lastUpdate.toLocaleTimeString()}</span>
                <span className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  Canlı Veri Analizi
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
            <MessageSquare size={40} />
            <p className="text-sm font-medium">Henüz bir analiz yapılmadı.</p>
            <button 
              onClick={fetchAndAnalyze}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Analizi Başlat
            </button>
          </div>
        )}
      </div>

      {/* Footer / Input */}
      <div className="p-4 bg-white border-t border-slate-100">
        <div className="relative">
          <input 
            type="text" 
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Baş Analist'e bir soru sor..."
            disabled={loading || isSending}
            className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:cursor-not-allowed"
          />
          <button 
            onClick={handleSendMessage}
            disabled={loading || isSending || !userInput.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all disabled:text-slate-300 disabled:cursor-not-allowed"
          >
            {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdisyoAnalyst;
