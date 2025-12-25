
import React, { useState, useRef } from 'react';
import { User, UserRole } from '../types';
import { db } from '../services/supabaseService';
import { Plus, Trash2, Edit2, Save, X, RefreshCw, AlertTriangle, AlertCircle, ShieldAlert, Download, Upload, Eye, EyeOff } from 'lucide-react';

interface Props {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

const AdminPersonnel: React.FC<Props> = ({ users, setUsers }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<User>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [finalDeleteConfirmId, setFinalDeleteConfirmId] = useState<string | null>(null);
  const [confirmationInput, setConfirmationInput] = useState('');

  const personnelToDelete = users.find(u => u.id === (finalDeleteConfirmId || deleteConfirmId));
  const expectedPhrase = personnelToDelete ? `"${personnelToDelete.name}" adlı kullanıcıyı gerçekten silmek istiyorum yemin ederim` : '';

  const validatePassword = (pass?: string) => {
    if (!pass) return false;
    const regex = /^(?=.*[A-Za-z])(?=.*\d).{4,}$/;
    return regex.test(pass);
  };

  const handleExport = async () => {
    setBusy(true);
    try {
      const data = await db.exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PuantajPro_Yedek_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setErrorInfo("Yedek alınırken hata oluştu: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        await db.importAllData(json);
        window.location.reload();
      } catch (err: any) {
        setErrorInfo("Yükleme hatası: " + err.message);
        setBusy(false);
      }
    };
    reader.readAsText(file);
  };

  const startEdit = (user: User) => {
    setEditingId(user.id);
    setEditForm(user);
  };

  const handleSave = async () => {
    if (editingId && editForm.name) {
      if (editForm.password && !validatePassword(editForm.password)) {
        setErrorInfo("Şifre en az 4 karakter olmalı, 1 harf ve 1 rakam içermeli!");
        return;
      }

      setBusy(true);
      try {
        const updatedUser = { ...users.find(u => u.id === editingId), ...editForm } as User;
        await db.upsertUser(updatedUser);
        setUsers(users.map(u => u.id === editingId ? updatedUser : u));
        setEditingId(null);
        setErrorInfo(null);
      } catch (err: any) {
        setErrorInfo(err.message);
      } finally {
        setBusy(false);
      }
    }
  };

  const executeDelete = async (id: string) => {
    if (id === 'admin') {
      setErrorInfo("Kanka ana admini silemezsin!");
      setDeleteConfirmId(null);
      setFinalDeleteConfirmId(null);
      return;
    }
    setBusy(true);
    try {
      await db.deleteUser(id);
      setUsers(prev => prev.filter(u => u.id !== id));
      setFinalDeleteConfirmId(null);
      setConfirmationInput('');
    } catch (err: any) {
      setErrorInfo(err.message);
    } finally {
      setBusy(false);
    }
  };

  const togglePassVisibility = (id: string) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10 max-w-[1200px] mx-auto">
      {deleteConfirmId && !finalDeleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full text-center shadow-2xl">
            <div className="bg-red-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="text-red-500 w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">Emin misin?</h3>
            <p className="text-slate-500 text-sm font-medium mb-8">Bu personeli ve tüm geçmişini silmek üzeresin kanka.</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => { setFinalDeleteConfirmId(deleteConfirmId); setDeleteConfirmId(null); }} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black hover:bg-red-700 transition-all">İLERLE</button>
              <button onClick={() => setDeleteConfirmId(null)} className="w-full bg-slate-100 text-slate-500 py-4 rounded-2xl font-black hover:bg-slate-200 transition-all">VAZGEÇ</button>
            </div>
          </div>
        </div>
      )}

      {finalDeleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[250] flex items-center justify-center p-6 animate-in zoom-in-95">
          <div className="bg-white rounded-[3rem] p-12 max-w-lg w-full shadow-2xl border-4 border-red-500/20">
            <div className="bg-red-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-red-200">
              <ShieldAlert className="text-white w-10 h-10" />
            </div>
            <h3 className="text-3xl font-black text-slate-800 text-center mb-4 uppercase tracking-tight">SON GÜVENLİK!</h3>
            <p className="text-slate-500 text-center font-bold mb-8 leading-relaxed">
              Yanlışlıkla silme diye kanka, lütfen aşağıdaki cümleyi yaz: <br/> <span className="text-red-600 select-all font-mono">{expectedPhrase}</span>
            </p>
            <input 
              type="text"
              className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 focus:border-red-500 rounded-2xl outline-none font-bold mb-8"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
            />
            <div className="flex flex-col gap-3">
              <button 
                disabled={busy || confirmationInput !== expectedPhrase}
                onClick={() => executeDelete(finalDeleteConfirmId)} 
                className="w-full py-5 rounded-2xl font-black uppercase tracking-widest bg-red-600 text-white disabled:bg-slate-100 disabled:text-slate-300"
              >
                {busy ? <RefreshCw className="animate-spin" /> : 'EVET, SİL!'}
              </button>
              <button onClick={() => { setFinalDeleteConfirmId(null); setConfirmationInput(''); }} className="w-full bg-slate-50 text-slate-400 py-4 rounded-2xl font-black">VAZGEÇTİM</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight">Personel Yönetimi</h2>
          <div className="flex items-center gap-4 mt-2">
            <button onClick={handleExport} disabled={busy} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 transition-colors">
              <Download size={14} /> Yedek İndir
            </button>
            <button onClick={() => fileInputRef.current?.click()} disabled={busy} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-800 transition-colors">
              <Upload size={14} /> Yedek Yükle
            </button>
            <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
          </div>
        </div>
        <button
          onClick={() => { setIsAdding(true); setEditForm({ hourlyRate: 0, role: UserRole.STAFF, password: '' }); }}
          className="bg-indigo-600 text-white px-8 py-4 rounded-3xl flex items-center gap-3 font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 uppercase text-xs tracking-widest"
        >
          <Plus className="w-5 h-5" /> Yeni Personel
        </button>
      </div>

      {errorInfo && (
        <div className="bg-red-50 border-2 border-red-100 p-6 rounded-[2rem] flex items-center justify-between text-red-800">
          <div className="flex items-center gap-4"><AlertCircle /> <p className="font-bold">{errorInfo}</p></div>
          <button onClick={() => setErrorInfo(null)}><X /></button>
        </div>
      )}

      {isAdding && (
        <div className="bg-white p-10 rounded-[3rem] border-2 border-indigo-100 shadow-sm animate-in zoom-in-95">
          <h3 className="text-xl font-black mb-6 text-slate-800">Yeni Personel Bilgileri</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Ad Soyad</label>
              <input type="text" className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border border-transparent focus:border-indigo-500 transition-all outline-none" value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Giriş Şifresi</label>
              <input type="text" placeholder="En az 4 Karakter" className={`w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border transition-all outline-none ${editForm.password && !validatePassword(editForm.password) ? 'border-red-300' : 'border-transparent focus:border-indigo-500'}`} value={editForm.password || ''} onChange={e => setEditForm({ ...editForm, password: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Yetki</label>
              <select className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold appearance-none border border-transparent focus:border-indigo-500 outline-none" value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value as UserRole })}>
                <option value={UserRole.STAFF}>Personel</option>
                <option value={UserRole.ADMIN}>Yönetici</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-8">
            <button disabled={busy} onClick={async () => {
              if (editForm.name && editForm.password) {
                if (!validatePassword(editForm.password)) {
                  setErrorInfo("Şifre en az 4 karakter olmalı, 1 harf ve 1 rakam içermeli!");
                  return;
                }
                setBusy(true);
                try {
                  const newUser: User = { 
                    id: Math.random().toString(36).substr(2, 9), 
                    name: editForm.name, 
                    hourlyRate: 0, 
                    role: editForm.role || UserRole.STAFF,
                    password: editForm.password,
                    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${editForm.name}` 
                  };
                  await db.upsertUser(newUser);
                  setUsers([...users, newUser]);
                  setIsAdding(false);
                  setEditForm({});
                  setErrorInfo(null);
                } catch (err: any) { setErrorInfo(err.message); } finally { setBusy(false); }
              } else {
                setErrorInfo("Lütfen tüm alanları doldur kanka!");
              }
            }} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100">Personeli Ekle</button>
            <button onClick={() => setIsAdding(false)} className="bg-slate-100 text-slate-500 px-8 py-4 rounded-2xl font-black">İptal</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <tr>
              <th className="px-10 py-6">Personel</th>
              <th className="px-10 py-6">Yetki</th>
              <th className="px-10 py-6">Giriş Şifresi</th>
              <th className="px-10 py-6 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-10 py-6">
                  <div className="flex items-center gap-4">
                    <img src={user.avatar} className="w-10 h-10 rounded-xl bg-slate-100" />
                    {editingId === user.id ? (
                      <input className="bg-white border-2 border-indigo-500 rounded-xl px-4 py-2 text-sm font-bold outline-none w-full max-w-[150px]" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                    ) : (
                      <span className="font-bold text-slate-800">{user.name}</span>
                    )}
                  </div>
                </td>
                <td className="px-10 py-6">
                   {editingId === user.id ? (
                    <select className="bg-white border-2 border-indigo-500 rounded-xl px-4 py-2 text-xs font-black" value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value as UserRole})}>
                      <option value={UserRole.STAFF}>Personel</option>
                      <option value={UserRole.ADMIN}>Yönetici</option>
                    </select>
                  ) : (
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${user.role === UserRole.ADMIN ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>{user.role}</span>
                  )}
                </td>
                <td className="px-10 py-6">
                  {editingId === user.id ? (
                    <input type="text" className="bg-white border-2 border-indigo-500 rounded-xl px-4 py-2 text-sm font-bold w-32" value={editForm.password} onChange={e => setEditForm({...editForm, password: e.target.value})} />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-slate-400 font-bold">
                        {showPasswords[user.id] ? user.password : '••••••'}
                      </span>
                      <button onClick={() => togglePassVisibility(user.id)} className="text-slate-300 hover:text-indigo-500">
                        {showPasswords[user.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  )}
                </td>
                <td className="px-10 py-6 text-right">
                   <div className="flex justify-end gap-2">
                    {editingId === user.id ? (
                      <button onClick={handleSave} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl"><Save size={20}/></button>
                    ) : (
                      <button onClick={() => startEdit(user)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-xl"><Edit2 size={20}/></button>
                    )}
                    <button onClick={() => setDeleteConfirmId(user.id)} className="p-2 text-slate-400 hover:text-red-600 rounded-xl"><Trash2 size={20}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPersonnel;
