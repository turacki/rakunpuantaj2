
import React, { useState, useEffect } from 'react';
import { User, UserRole, PuantajEntry } from './types';
import AdminPersonnel from './components/AdminPersonnel';
import AdminPuantaj from './components/AdminPuantaj';
import AdminReports from './components/AdminReports';
import AdminTips from './components/AdminTips';
import AdminAccounting from './components/AdminAccounting';
import AdminInventory from './components/AdminInventory';
import InventoryOrderPrep from './components/InventoryOrderPrep';
import AdisyoModule from './components/AdisyoModule';
import StaffPortal from './components/StaffPortal';
import "react-datepicker/dist/react-datepicker.css";
import { db } from './services/supabaseService';
import { Users, ClipboardList, BarChart3, LogOut, RefreshCw, KeyRound, Eye, EyeOff, X, ArrowRight, Coins, LayoutDashboard, Calculator, ChevronDown, ChevronRight, Package, ShoppingCart, Database } from 'lucide-react';

type TabType = 'personnel' | 'puantaj' | 'reports' | 'tips' | 'portal' | 'accounting' | 'inventory' | 'orderPrep' | 'adisyo';

const App: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [entries, setEntries] = useState<PuantajEntry[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('puantaj');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Login States
  const [selectedUserForLogin, setSelectedUserForLogin] = useState<User | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState(false);

  const LOGO_URL = "https://i.ibb.co/Wb7Z5x2/rakun30cmpng.png";

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [u, e] = await Promise.all([db.getUsers(), db.getEntries()]);
      
      let finalUsers = u;
      if (u.length === 0) {
        const admin: User = { 
          id: 'admin', 
          name: 'Patron (Yönetici)', 
          role: UserRole.ADMIN, 
          hourlyRate: 0, 
          password: 'admin123', 
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin' 
        };
        await db.upsertUser(admin);
        finalUsers = [admin];
      }
      setUsers(finalUsers);
      setEntries(e);

      const savedUserId = localStorage.getItem('puantaj_pro_user');
      if (savedUserId) {
        const user = finalUsers.find(usr => usr.id === savedUserId);
        if (user) {
          setCurrentUser(user);
          // Only set active tab if not already set (prevents reset on refresh)
          if (!currentUser) {
            setActiveTab(user.role === UserRole.ADMIN ? 'puantaj' : 'portal');
          }
        }
      }
    } catch (err: any) {
      console.error("Veri yükleme hatası:", err.message || err);
      setLoadError("Veriler yüklenirken bir sorun oluştu. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLoginAttempt = () => {
    if (selectedUserForLogin && (selectedUserForLogin.password === passwordInput || (!selectedUserForLogin.password && passwordInput === ''))) {
      setCurrentUser(selectedUserForLogin);
      localStorage.setItem('puantaj_pro_user', selectedUserForLogin.id);
      setActiveTab(selectedUserForLogin.role === UserRole.ADMIN ? 'puantaj' : 'portal');
      setSelectedUserForLogin(null);
      setPasswordInput('');
      setLoginError(false);
    } else {
      setLoginError(true);
      setTimeout(() => setLoginError(false), 500);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('puantaj_pro_user');
  };

  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <img src={LOGO_URL} alt="Rakun Logo" className="w-16 h-16 mb-6 object-contain animate-pulse" />
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-500 mb-4" />
        <p className="font-bold tracking-widest text-[10px] uppercase opacity-50 text-center px-4 tracking-[0.3em]">
          Veriler Yükleniyor...
        </p>
      </div>
    );
  }

  if (loadError && users.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white/5 p-10 rounded-[3rem] border border-white/10 max-w-md shadow-2xl backdrop-blur-xl">
          <div className="w-20 h-20 bg-red-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <X className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-black text-white mb-3 tracking-tight">Bağlantı Hatası</h2>
          <p className="text-slate-400 text-sm font-medium mb-8 leading-relaxed">{loadError}</p>
          <button 
            onClick={loadData}
            className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/20"
          >
            <RefreshCw size={18} /> Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 font-sans relative overflow-hidden">
        <div className="bg-white rounded-[3rem] shadow-2xl p-6 md:p-10 max-w-md w-full animate-in zoom-in-95 z-10 mx-auto">
          <div className="text-center mb-8">
            <div className="mb-6 flex items-center justify-center">
               <img src={LOGO_URL} alt="Puantaj Pro Logo" className="w-20 h-20 object-contain" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Puantaj Pro</h1>
            <p className="text-slate-500 mt-2 font-medium text-sm md:text-base">Akıllı Personel Takip Sistemi</p>
          </div>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {users.map(user => (
              <button
                key={user.id}
                onClick={() => setSelectedUserForLogin(user)}
                className="w-full flex items-center p-4 md:p-5 border border-slate-100 hover:border-indigo-500 bg-slate-50 rounded-3xl transition-all hover:shadow-lg group text-left"
              >
                <img src={user.avatar} className="w-10 h-10 md:w-12 md:h-12 rounded-2xl mr-4 bg-white shadow-sm border border-slate-100" alt={user.name} />
                <div className="flex-1">
                  <p className="font-black text-slate-800 group-hover:text-indigo-600 transition-colors text-sm md:text-base">{user.name}</p>
                  <p className="text-[9px] md:text-xs text-slate-400 font-bold uppercase tracking-widest">
                    {user.role === UserRole.ADMIN ? 'Yönetici' : user.role === UserRole.BOSS ? 'Patron' : 'Personel'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {selectedUserForLogin && (
          <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[9999] flex items-center justify-center p-6 animate-in fade-in">
            <div className={`bg-white rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl transition-all ${loginError ? 'animate-bounce' : ''}`}>
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <img src={selectedUserForLogin.avatar} className="w-12 h-12 rounded-2xl border bg-slate-50" />
                  <div>
                    <h3 className="font-black text-slate-800">{selectedUserForLogin.name}</h3>
                    <p className="text-[10px] font-black uppercase text-indigo-500 tracking-widest">Giriş Yapılıyor</p>
                  </div>
                </div>
                <button onClick={() => setSelectedUserForLogin(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X /></button>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    autoFocus
                    type={showPassword ? "text" : "password"}
                    placeholder="Şifreni gir kanka..."
                    className={`w-full pl-12 pr-12 py-5 bg-slate-50 border-2 rounded-2xl outline-none font-bold transition-all ${loginError ? 'border-red-500 bg-red-50 text-red-900' : 'border-slate-100 focus:border-indigo-500'}`}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLoginAttempt()}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                
                {loginError && <p className="text-center text-red-500 font-bold text-xs uppercase tracking-widest animate-pulse">Hatalı Şifre Kanka!</p>}

                <button
                  onClick={handleLoginAttempt}
                  className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3"
                >
                  Giriş Yap <ArrowRight size={20} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const isPuantajGroupActive = ['puantaj', 'personnel', 'reports', 'tips'].includes(activeTab);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row relative">
      <nav className="w-full lg:w-80 bg-white border-b lg:border-r border-slate-100 flex flex-col lg:sticky lg:top-0 lg:h-screen z-10 shrink-0">
        <div className="p-4 lg:p-6 flex items-center justify-between border-b border-slate-50 lg:border-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white flex items-center justify-center shadow-lg shadow-slate-200 border border-slate-50 shrink-0">
               <img src={LOGO_URL} alt="Rakun" className="w-8 h-8 object-contain" />
            </div>
            <div className="hidden sm:block lg:block">
              <h2 className="text-lg font-black text-slate-800 tracking-tight leading-none">Dükkan Paneli</h2>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Puantaj Pro</p>
                <button 
                  onClick={loadData}
                  disabled={loading}
                  className={`p-0.5 rounded-md transition-all ${loading ? 'text-slate-300' : 'text-slate-400 hover:text-indigo-600'}`}
                  title="Verileri Yenile"
                >
                  <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 pr-3 rounded-2xl border border-slate-100 max-w-[140px]">
              <img src={currentUser.avatar} className="w-7 h-7 rounded-lg border border-white shadow-sm shrink-0" alt="profile" />
              <div className="overflow-hidden hidden min-[400px]:block">
                <p className="text-[9px] font-black truncate text-slate-800 leading-none">{currentUser.name}</p>
                <p className="text-[7px] font-black uppercase text-indigo-500 tracking-tighter mt-0.5">{currentUser.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-red-500 bg-red-50 hover:bg-red-100 transition-all shadow-sm shrink-0"
              title="Çıkış Yap"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible px-4 lg:px-6 space-x-2 lg:space-x-0 lg:space-y-1 pb-4 lg:pb-0 scrollbar-hide">
          {/* Ortak Menüler */}
          <button
            onClick={() => setActiveTab('orderPrep')}
            className={`flex-1 lg:w-full min-w-[140px] lg:min-w-0 flex items-center justify-center lg:justify-start gap-3 px-6 py-3 lg:py-4 rounded-2xl transition-all whitespace-nowrap border-2 ${activeTab === 'orderPrep' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-100' : 'text-slate-600 bg-white border-slate-100 hover:bg-slate-50 font-bold'}`}
          >
            <ShoppingCart className="w-5 h-5 shrink-0" />
            <span className="font-bold text-xs lg:text-base">Sipariş Hazırla</span>
          </button>

          {(currentUser.role === UserRole.STAFF || currentUser.role === UserRole.BOSS) && (
             <div className="flex flex-row lg:flex-col gap-1 w-full">
               <button
                onClick={() => setActiveTab('portal')}
                className={`flex-1 lg:w-full flex items-center justify-center lg:justify-start gap-3 px-4 py-3 lg:py-4 rounded-2xl transition-all whitespace-nowrap ${activeTab === 'portal' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50 font-bold'}`}
              >
                <LayoutDashboard className="w-5 h-5 shrink-0" />
                <span className="font-bold text-xs lg:text-base">Maaş Özeti</span>
              </button>
              <button
                onClick={() => setActiveTab('tips')}
                className={`flex-1 lg:w-full flex items-center justify-center lg:justify-start gap-3 px-4 py-3 lg:py-4 rounded-2xl transition-all whitespace-nowrap ${activeTab === 'tips' ? 'bg-amber-500 text-white shadow-xl shadow-amber-100' : 'text-slate-500 hover:bg-slate-50 font-bold'}`}
              >
                <Coins className="w-5 h-5 shrink-0" />
                <span className="font-bold text-xs lg:text-base">Bahşiş Hesapla</span>
              </button>
            </div>
          )}

          {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.BOSS) && (
            <>
              {currentUser.role === UserRole.ADMIN && (
                <>
                  {/* Puantaj Ana Grubu */}
                  <div className="flex flex-col lg:space-y-1">
                    <button
                      onClick={() => setActiveTab('puantaj')}
                      className={`flex-1 lg:w-full flex items-center justify-between gap-3 px-4 py-3 lg:py-4 rounded-2xl transition-all whitespace-nowrap ${activeTab === 'puantaj' ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : isPuantajGroupActive ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:bg-slate-50 font-bold'}`}
                    >
                      <div className="flex items-center gap-3">
                        <ClipboardList className="w-5 h-5 shrink-0" />
                        <span className="font-bold text-xs lg:text-base">Puantaj Yönetimi</span>
                      </div>
                      {isPuantajGroupActive ? <ChevronDown size={16} className="hidden lg:block opacity-50" /> : <ChevronRight size={16} className="hidden lg:block opacity-30" />}
                    </button>

                    {/* Puantaj Alt Menüleri */}
                    <div className={`lg:pl-6 flex flex-row lg:flex-col gap-1 mt-1 ${isPuantajGroupActive ? 'flex' : 'hidden lg:hidden'}`}>
                      <button
                        onClick={() => setActiveTab('personnel')}
                        className={`flex-1 lg:w-full flex items-center gap-3 px-4 py-2 lg:py-3 rounded-xl transition-all whitespace-nowrap ${activeTab === 'personnel' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-400 hover:bg-slate-50'}`}
                      >
                        <Users className="w-4 h-4 shrink-0" />
                        <span className="font-black text-[10px] lg:text-xs uppercase tracking-widest">Personel</span>
                      </button>
                      
                      <button
                        onClick={() => setActiveTab('reports')}
                        className={`flex-1 lg:w-full flex items-center gap-3 px-4 py-2 lg:py-3 rounded-xl transition-all whitespace-nowrap ${activeTab === 'reports' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-400 hover:bg-slate-50'}`}
                      >
                        <BarChart3 className="w-4 h-4 shrink-0" />
                        <span className="font-black text-[10px] lg:text-xs uppercase tracking-widest">Raporlar</span>
                      </button>

                      <button
                        onClick={() => setActiveTab('tips')}
                        className={`flex-1 lg:w-full flex items-center gap-3 px-4 py-2 lg:py-3 rounded-xl transition-all whitespace-nowrap ${activeTab === 'tips' ? 'bg-amber-50 text-amber-700' : 'text-slate-400 hover:bg-slate-50'}`}
                      >
                        <Coins className="w-4 h-4 shrink-0" />
                        <span className="font-black text-[10px] lg:text-xs uppercase tracking-widest">Bahşiş</span>
                      </button>
                    </div>
                  </div>

                  <div className="lg:h-px lg:bg-slate-100 lg:my-2 hidden lg:block" />

                  <button
                    onClick={() => setActiveTab('accounting')}
                    className={`flex-1 lg:w-full flex items-center justify-center lg:justify-start gap-3 px-4 py-3 lg:py-4 rounded-2xl transition-all whitespace-nowrap ${activeTab === 'accounting' ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-100' : 'text-slate-500 hover:bg-slate-50 font-bold'}`}
                  >
                    <Calculator className="w-5 h-5 shrink-0" />
                    <span className="font-bold text-xs lg:text-base">Ön Muhasebe</span>
                  </button>
                </>
              )}

              <button
                onClick={() => setActiveTab('inventory')}
                className={`flex-1 lg:w-full flex items-center justify-center lg:justify-start gap-3 px-4 py-3 lg:py-4 rounded-2xl transition-all whitespace-nowrap ${activeTab === 'inventory' ? 'bg-indigo-900 text-white shadow-xl shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50 font-bold'}`}
              >
                <Package className="w-5 h-5 shrink-0" />
                <span className="font-bold text-xs lg:text-base">Envanter Yönetimi</span>
              </button>

              <button
                onClick={() => setActiveTab('adisyo')}
                className={`flex-1 lg:w-full flex items-center justify-center lg:justify-start gap-3 px-4 py-3 lg:py-4 rounded-2xl transition-all whitespace-nowrap ${activeTab === 'adisyo' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50 font-bold'}`}
              >
                <Database className="w-5 h-5 shrink-0" />
                <span className="font-bold text-xs lg:text-base">Adisyo</span>
              </button>
            </>
          )}
        </div>

        <div className="p-4 lg:p-6 mt-auto border-t border-slate-50 bg-white hidden lg:hidden">
          {/* Profile moved to header */}
        </div>
      </nav>

      <main className="flex-1 p-4 md:p-6 lg:p-12 lg:overflow-y-auto lg:h-screen custom-scrollbar mobile-scroll-fix z-20 relative">
        <div className="relative z-10">
          {activeTab === 'portal' && (currentUser.role === UserRole.STAFF || currentUser.role === UserRole.BOSS) && (
            <StaffPortal user={currentUser} entries={entries} setUser={(updatedUser) => {
              setCurrentUser(updatedUser);
              setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
            }} />
          )}
          {activeTab === 'personnel' && currentUser.role === UserRole.ADMIN && <AdminPersonnel users={users} setUsers={setUsers} />}
          {activeTab === 'puantaj' && currentUser.role === UserRole.ADMIN && <AdminPuantaj users={users} entries={entries} setEntries={setEntries} />}
          {activeTab === 'reports' && currentUser.role === UserRole.ADMIN && <AdminReports users={users} entries={entries} />}
          {activeTab === 'tips' && <AdminTips users={users} entries={entries} setEntries={setEntries} />}
          {activeTab === 'accounting' && currentUser.role === UserRole.ADMIN && <AdminAccounting />}
          {activeTab === 'inventory' && (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.BOSS) && <AdminInventory />}
          {activeTab === 'orderPrep' && <InventoryOrderPrep currentUser={currentUser} />}
          {activeTab === 'adisyo' && (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.BOSS) && <AdisyoModule />}
        </div>
      </main>
    </div>
  );
};

export default App;
