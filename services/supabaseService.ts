
import { createClient } from '@supabase/supabase-js';
import { User, PuantajEntry, Wholesaler, AccTransaction } from '../types';

const SUPABASE_URL = 'https://oytpzotrsvhnvznqzinj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95dHB6b3Ryc3ZobnZ6bnF6aW5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzNDMyODUsImV4cCI6MjA4MTkxOTI4NX0.lAr9M7yLpDbE7KSNFZIyssAlAyNMH1YOohpSg5l9Yxc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const db = {
  // --- Kullanıcı ve Puantaj Metodları ---
  getUsers: async (): Promise<User[]> => {
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    return (data || []).map(u => ({
      id: u.id,
      name: u.name,
      role: u.role,
      hourlyRate: Number(u.hourly_rate),
      password: u.password,
      avatar: u.avatar
    }));
  },
  
  upsertUser: async (user: User) => {
    const { error } = await supabase.from('users').upsert({
      id: user.id,
      name: user.name,
      role: user.role,
      hourly_rate: user.hourlyRate,
      password: user.password,
      avatar: user.avatar
    });
    if (error) throw error;
  },

  deleteUser: async (id: string) => {
    const { error: eError } = await supabase.from('entries').delete().eq('user_id', id);
    if (eError) throw eError;
    const { error: uError } = await supabase.from('users').delete().eq('id', id);
    if (uError) throw uError;
    return true;
  },

  getEntries: async (): Promise<PuantajEntry[]> => {
    const { data, error } = await supabase.from('entries').select('*');
    if (error) throw error;
    return (data || []).map(e => ({
      id: e.id,
      userId: e.user_id,
      type: e.type,
      amount: Number(e.amount),
      hours: e.hours ? Number(e.hours) : undefined,
      date: e.date,
      note: e.note
    }));
  },

  upsertEntry: async (entry: PuantajEntry) => {
    const { error } = await supabase.from('entries').upsert({
      id: entry.id,
      user_id: entry.userId,
      type: entry.type,
      amount: entry.amount,
      hours: entry.hours,
      date: entry.date,
      note: entry.note
    });
    if (error) throw error;
  },

  deleteEntry: async (id: string) => {
    const { error } = await supabase.from('entries').delete().eq('id', id).select();
    if (error) throw error;
  },

  // --- Genel Ayarlar ---
  getSettings: async (): Promise<Record<string, string>> => {
    const { data, error } = await supabase.from('settings').select('*');
    if (error) return {};
    const settings: Record<string, string> = {};
    data.forEach(s => settings[s.key] = s.value);
    return settings;
  },

  upsertSetting: async (key: string, value: string) => {
    const { error } = await supabase.from('settings').upsert({ key, value });
    if (error) throw error;
  },

  // --- Ön Muhasebe Metodları ---
  getWholesalers: async (): Promise<Wholesaler[]> => {
    const { data, error } = await supabase.from('wholesalers').select('*');
    if (error) return [];
    return (data || []).map(w => ({
      id: w.id,
      name: w.name,
      phone: w.phone,
      contactPerson: w.contact_person
    }));
  },

  upsertWholesaler: async (w: Wholesaler) => {
    const { error } = await supabase.from('wholesalers').upsert({
      id: w.id,
      name: w.name,
      phone: w.phone,
      contact_person: w.contactPerson
    });
    if (error) throw error;
  },

  deleteWholesaler: async (id: string) => {
    const { error: tError } = await supabase.from('acc_transactions').delete().eq('wholesaler_id', id);
    if (tError) console.error("Wholesaler transactions delete error:", tError);
    const { error } = await supabase.from('wholesalers').delete().eq('id', id);
    if (error) throw error;
  },

  getAccTransactions: async (): Promise<AccTransaction[]> => {
    const { data, error } = await supabase.from('acc_transactions').select('*');
    if (error) return [];
    return (data || []).map(t => ({
      id: t.id,
      wholesalerId: t.wholesaler_id,
      type: t.type,
      amount: Number(t.amount),
      date: t.date,
      dueDate: t.due_date,
      note: t.note
    }));
  },

  upsertAccTransaction: async (t: AccTransaction) => {
    const { error } = await supabase.from('acc_transactions').upsert({
      id: t.id,
      wholesaler_id: t.wholesalerId,
      type: t.type,
      amount: t.amount,
      date: t.date,
      due_date: t.dueDate,
      note: t.note
    });
    if (error) throw error;
  },

  deleteAccTransaction: async (id: string) => {
    const { error } = await supabase.from('acc_transactions').delete().eq('id', id);
    if (error) throw error;
  },

  exportAllData: async () => {
    const { data: users } = await supabase.from('users').select('*');
    const { data: entries } = await supabase.from('entries').select('*');
    const { data: wholesalers } = await supabase.from('wholesalers').select('*');
    const { data: acc_transactions } = await supabase.from('acc_transactions').select('*');
    const { data: settings } = await supabase.from('settings').select('*');
    return {
      version: '1.6',
      timestamp: new Date().toISOString(),
      users: users || [],
      entries: entries || [],
      wholesalers: wholesalers || [],
      acc_transactions: acc_transactions || [],
      settings: settings || []
    };
  },

  importAllData: async (snapshot: any) => {
    if (snapshot.users?.length > 0) await supabase.from('users').upsert(snapshot.users);
    if (snapshot.entries?.length > 0) await supabase.from('entries').upsert(snapshot.entries);
    if (snapshot.wholesalers?.length > 0) await supabase.from('wholesalers').upsert(snapshot.wholesalers);
    if (snapshot.acc_transactions?.length > 0) await supabase.from('acc_transactions').upsert(snapshot.acc_transactions);
    if (snapshot.settings?.length > 0) await supabase.from('settings').upsert(snapshot.settings);
    return true;
  }
};
