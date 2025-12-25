
import { createClient } from '@supabase/supabase-js';
import { User, PuantajEntry } from '../types';

const SUPABASE_URL = 'https://oytpzotrsvhnvznqzinj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95dHB6b3Ryc3ZobnZ6bnF6aW5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzNDMyODUsImV4cCI6MjA4MTkxOTI4NX0.lAr9M7yLpDbE7KSNFZIyssAlAyNMH1YOohpSg5l9Yxc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const db = {
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

  deleteTipsByDate: async (date: string) => {
    const { error } = await supabase
      .from('entries')
      .delete()
      .eq('date', date)
      .eq('type', 'TIP');
    if (error) throw error;
  },

  exportAllData: async () => {
    const { data: users } = await supabase.from('users').select('*');
    const { data: entries } = await supabase.from('entries').select('*');
    return {
      version: '1.0',
      timestamp: new Date().toISOString(),
      users: users || [],
      entries: entries || []
    };
  },

  importAllData: async (snapshot: any) => {
    if (!snapshot.users || !snapshot.entries) throw new Error("Geçersiz yedek dosyası kanka!");
    if (snapshot.users.length > 0) {
      const { error: uError } = await supabase.from('users').upsert(snapshot.users);
      if (uError) throw uError;
    }
    if (snapshot.entries.length > 0) {
      const { error: eError } = await supabase.from('entries').upsert(snapshot.entries);
      if (eError) throw eError;
    }
    return true;
  }
};
