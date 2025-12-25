
import React, { useState, useEffect } from 'react';
import { User, UserRole, PuantajEntry } from './types';
import AdminPersonnel from './components/AdminPersonnel';
import AdminPuantaj from './components/AdminPuantaj';
import AdminReports from './components/AdminReports';
import AdminTips from './components/AdminTips';
import StaffPortal from './components/StaffPortal';
import { db } from './services/supabaseService';
import { Users, ClipboardList, BarChart3, LogOut, Briefcase, RefreshCw, KeyRound, Eye, EyeOff, X, ArrowRight, Coins, LayoutDashboard } from 'lucide-react';

interface Bubble {
  id: number;
  x: number;
  y: number;
}

type TabType = 'personnel' | 'puantaj' | 'reports' | 'tips' | 'portal';

const App: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [entries, setEntries] = useState<PuantajEntry[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('puantaj');
  const [loading, setLoading] = useState(true);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);

  // Login States
  const [selectedUserForLogin, setSelectedUserForLogin] = useState<User | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState(false);

  const loadData = async () => {
    setLoading(true);
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
          setActiveTab(user.role === UserRole.ADMIN ? 'puantaj' : 'portal');
        }
      }
    } catch (err: any) {
      console.error("Veri yükleme hatası:", err.message || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleClick = (e: MouseEvent) => {
      const newBubble = {
        id: Math.random() + Date.now(),
        x: e.clientX,
        y: e.clientY
      };
      setBubbles(prev => [...prev, newBubble]);
      
      setTimeout(() => {
        setBubbles(prev => prev.filter(b => b.id !== newBubble.id));
      }, 4000);
    };

    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <RefreshCw className="w-12 h-12 animate-spin text-indigo-500 mb-4" />
        <p className="font-bold tracking-widest text-sm uppercase opacity-50 text-center px-4 tracking-[0.3em]">
          Bulut Verileri Senkronize Ediliyor...
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 font-sans relative overflow-hidden">
        {bubbles.map(b => (
          <div key={b.id} className="bubble-effect bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full font-black text-white text-[10px] md:text-xs uppercase tracking-[0.3em] shadow-2xl">
            PİÇİ SOY!
          </div>
        ))}
        
        <div className="bg-white rounded-[3rem] shadow-2xl p-6 md:p-10 max-w-md w-full animate-in zoom-in-95 z-10 mx-auto">
          <div className="text-center mb-8">
            <div className="bg-indigo-600 w-16 h-16 md:w-20 md:h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-200">
              <Briefcase className="text-white w-8 h-8 md:w-10 md:h-10" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Puantaj Pro</h1>
            <p className="text-slate-500 mt-2 font-medium text-sm md:text-base">Bulut tabanlı akıllı takip sistemi.</p>
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
                  <p className="text-[9px] md:text-xs text-slate-400 font-bold uppercase tracking-widest">{user.role === UserRole.ADMIN ? 'Yönetici' : 'Personel'}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Password Modal */}
        {selectedUserForLogin && (
          <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[200] flex items-center justify-center p-6 animate-in fade-in">
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row relative">
      {bubbles.map(b => (
        <div key={b.id} className="bubble-effect bg-indigo-600/20 backdrop-blur-sm border border-indigo-500/30 px-6 py-3 rounded-full font-black text-indigo-700 text-xs md:text-sm uppercase tracking-[0.3em] shadow-2xl">
          PİÇİ SOY!
        </div>
      ))}

      <nav className="w-full lg:w-80 bg-white border-b lg:border-r border-slate-100 flex flex-col lg:sticky lg:top-0 lg:h-screen z-[100] shrink-0">
        <div className="p-6 lg:p-10">
          <h2 className="text-xl lg:text-2xl font-black flex items-center gap-3 text-slate-800">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-100"><Briefcase className="text-white w-5 h-5 lg:w-6 lg:h-6" /></div>
            Puantaj Pro
          </h2>
        </div>

        <div className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible px-4 lg:px-6 space-x-2 lg:space-x-0 lg:space-y-2 pb-4 lg:pb-0 no-scrollbar">
          {currentUser.role === UserRole.STAFF && (
             <button
              onClick={() => setActiveTab('portal')}
              className={`flex-1 lg:w-full flex items-center justify-center lg:justify-start gap-3 px-4 py-3 lg:py-4 rounded-2xl transition-all whitespace-nowrap ${activeTab === 'portal' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50 font-bold'}`}
            >
              <LayoutDashboard className="w-5 h-5 shrink-0" />
              <span className="font-bold text-xs lg:text-base">Maaş Özeti</span>
            </button>
          )}

          {currentUser.role === UserRole.ADMIN && (
            <>
              <button
                onClick={() => setActiveTab('puantaj')}
                className={`flex-1 lg:w-full flex items-center justify-center lg:justify-start gap-3 px-4 py-3 lg:py-4 rounded-2xl transition-all whitespace-nowrap ${activeTab === 'puantaj' ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'text-slate-500 hover:bg-slate-50 font-bold'}`}
              >
                <ClipboardList className="w-5 h-5 shrink-0" />
                <span className="font-bold text-xs lg:text-base">Puantaj</span>
              </button>
              <button
                onClick={() => setActiveTab('personnel')}
                className={`flex-1 lg:w-full flex items-center justify-center lg:justify-start gap-3 px-4 py-3 lg:py-4 rounded-2xl transition-all whitespace-nowrap ${activeTab === 'personnel' ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'text-slate-500 hover:bg-slate-50 font-bold'}`}
              >
                <Users className="w-5 h-5 shrink-0" />
                <span className="font-bold text-xs lg:text-base">Personel</span>
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`flex-1 lg:w-full flex items-center justify-center lg:justify-start gap-3 px-4 py-3 lg:py-4 rounded-2xl transition-all whitespace-nowrap ${activeTab === 'reports' ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'text-slate-500 hover:bg-slate-50 font-bold'}`}
              >
                <BarChart3 className="w-5 h-5 shrink-0" />
                <span className="font-bold text-xs lg:text-base">Raporlar</span>
              </button>
            </>
          )}

          {/* Bahşiş Artık Herkese Açık */}
          <button
            onClick={() => setActiveTab('tips')}
            className={`flex-1 lg:w-full flex items-center justify-center lg:justify-start gap-3 px-4 py-3 lg:py-4 rounded-2xl transition-all whitespace-nowrap ${activeTab === 'tips' ? 'bg-amber-500 text-white shadow-xl shadow-amber-100' : 'text-slate-500 hover:bg-slate-50 font-bold'}`}
          >
            <Coins className="w-5 h-5 shrink-0" />
            <span className="font-bold text-xs lg:text-base">Bahşiş</span>
          </button>
        </div>

        <div className="p-4 lg:p-8 mt-auto border-t border-slate-50 bg-white">
          <div className="flex items-center gap-3 md:gap-4 mb-4 lg:mb-8 bg-slate-50 p-3 lg:p-4 rounded-3xl border border-slate-100">
            <img src={currentUser.avatar} className="w-8 h-8 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl border-2 border-white shadow-sm" alt="profile" />
            <div className="overflow-hidden">
              <p className="text-[10px] lg:text-sm font-black truncate text-slate-800">{currentUser.name}</p>
              <p className="text-[8px] lg:text-[10px] font-black uppercase text-indigo-500 tracking-tighter">{currentUser.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 lg:gap-3 px-4 py-3 lg:px-6 lg:py-4 rounded-2xl text-red-500 bg-red-50 hover:bg-red-100 transition-all font-black text-[10px] lg:text-sm uppercase tracking-widest"
          >
            <LogOut className="w-4 h-4 lg:w-5 lg:h-5" />
            Çıkış
          </button>
        </div>
      </nav>

      <main className="flex-1 p-4 md:p-6 lg:p-12 lg:overflow-y-auto lg:h-screen custom-scrollbar mobile-scroll-fix">
        {activeTab === 'portal' && currentUser.role === UserRole.STAFF && (
          <StaffPortal user={currentUser} entries={entries} setUser={(updatedUser) => {
            setCurrentUser(updatedUser);
            setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
          }} />
        )}
        {activeTab === 'personnel' && currentUser.role === UserRole.ADMIN && <AdminPersonnel users={users} setUsers={setUsers} />}
        {activeTab === 'puantaj' && currentUser.role === UserRole.ADMIN && <AdminPuantaj users={users} entries={entries} setEntries={setEntries} />}
        {activeTab === 'reports' && currentUser.role === UserRole.ADMIN && <AdminReports users={users} entries={entries} />}
        {activeTab === 'tips' && <AdminTips users={users} entries={entries} setEntries={setEntries} />}
      </main>
    </div>
  );
};

export default App;
