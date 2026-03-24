
import { createClient } from '@supabase/supabase-js';
import { User, PuantajEntry, Wholesaler, AccTransaction, InventoryItem, InventoryOrder, InventoryOrderDetail, InventoryCategory } from '../types';

const SUPABASE_URL = 'https://oytpzotrsvhnvznqzinj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95dHB6b3Ryc3ZobnZ6bnF6aW5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzNDMyODUsImV4cCI6MjA4MTkxOTI4NX0.lAr9M7yLpDbE7KSNFZIyssAlAyNMH1YOohpSg5l9Yxc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Generic retry wrapper for Supabase operations
 */
const withRetry = async <T>(operation: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
  try {
    return await operation();
  } catch (error: any) {
    if (retries > 0) {
      console.warn(`Supabase operation failed, retrying... (${retries} attempts left)`, error.message || error);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(operation, retries - 1, delay * 2);
    }
    throw error;
  }
};

export const getLocalDateString = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const db = {
  // --- Kullanıcı ve Puantaj Metodları ---
  getUsers: async (): Promise<User[]> => {
    return withRetry(async () => {
      const { data, error } = await supabase.from('users').select('*');
      if (error) throw error;
      return (data || []).map(u => ({
        id: u.id,
        name: u.name,
        role: u.role,
        department: u.department,
        hourlyRate: Number(u.hourly_rate),
        password: u.password,
        avatar: u.avatar
      }));
    });
  },
  
  upsertUser: async (user: User) => {
    return withRetry(async () => {
      const { error } = await supabase.from('users').upsert({
        id: user.id,
        name: user.name,
        role: user.role,
        department: user.department || 'NORMAL',
        hourly_rate: user.hourlyRate,
        password: user.password,
        avatar: user.avatar
      });
      if (error) throw error;
    });
  },

  deleteUser: async (id: string) => {
    return withRetry(async () => {
      const { error: eError } = await supabase.from('entries').delete().eq('user_id', id);
      if (eError) throw eError;
      const { error: uError } = await supabase.from('users').delete().eq('id', id);
      if (uError) throw uError;
      return true;
    });
  },

  getEntries: async (): Promise<PuantajEntry[]> => {
    return withRetry(async () => {
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
    });
  },

  upsertEntry: async (entry: PuantajEntry) => {
    return withRetry(async () => {
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
    });
  },

  deleteEntry: async (id: string) => {
    return withRetry(async () => {
      const { error } = await supabase.from('entries').delete().eq('id', id).select();
      if (error) throw error;
    });
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

  // --- Envanter Metodları ---
  getInventoryItems: async (): Promise<InventoryItem[]> => {
    const { data, error } = await supabase.from('inventory_items').select('*').order('name');
    if (error) return [];
    return (data || []).map(i => ({
      id: i.id,
      name: i.name,
      category: i.category,
      wholesalerId: i.wholesaler_id,
      minStock: Number(i.min_stock),
      unit: i.unit
    }));
  },

  upsertInventoryItem: async (item: InventoryItem) => {
    const payload: any = {
      name: item.name,
      category: item.category,
      wholesaler_id: item.wholesalerId,
      min_stock: item.minStock,
      unit: item.unit
    };
    if (item.id && item.id.trim() !== '') {
      payload.id = item.id;
    }
    
    const { error } = await supabase.from('inventory_items').upsert(payload);
    if (error) throw error;
  },

  deleteInventoryItem: async (id: string) => {
    const { error } = await supabase.from('inventory_items').delete().eq('id', id);
    if (error) throw error;
  },

  bulkInsertInventoryItems: async (items: Omit<InventoryItem, 'id'>[]) => {
    const { error } = await supabase.from('inventory_items').insert(items.map(i => ({
      name: i.name,
      category: i.category,
      wholesaler_id: i.wholesalerId,
      min_stock: i.minStock,
      unit: i.unit
    })));
    if (error) throw error;
  },

  // --- Kategori Metodları ---
  getInventoryCategories: async (): Promise<InventoryCategory[]> => {
    const { data, error } = await supabase.from('inventory_categories').select('*').order('name');
    if (error) return [];
    return data || [];
  },

  upsertInventoryCategory: async (cat: InventoryCategory) => {
    const payload: any = { name: cat.name };
    if (cat.id && cat.id.trim() !== '') {
      payload.id = cat.id;
    }
    
    const { error } = await supabase.from('inventory_categories').upsert(payload);
    if (error) throw error;
  },

  deleteInventoryCategory: async (id: string) => {
    const { error } = await supabase.from('inventory_categories').delete().eq('id', id);
    if (error) throw error;
  },

  // --- Sipariş Metodları ---
  createInventoryOrder: async (userId: string, details: { itemId: string, countedQuantity: number }[]) => {
    const { data: order, error: oError } = await supabase
      .from('inventory_orders')
      .insert({ user_id: userId, status: 'PENDING' })
      .select()
      .single();
    
    if (oError) throw oError;

    const detailsToInsert = details.map(d => ({
      order_id: order.id,
      item_id: d.itemId,
      counted_quantity: d.countedQuantity
    }));

    const { error: dError } = await supabase.from('inventory_order_details').insert(detailsToInsert);
    if (dError) throw dError;

    return order.id;
  },

  getInventoryOrders: async (): Promise<InventoryOrder[]> => {
    // Önce siparişleri ve detayları çekelim
    const { data, error } = await supabase
      .from('inventory_orders')
      .select(`
        *,
        inventory_order_details (
          *,
          inventory_items (name, min_stock, wholesaler_id, unit)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Kullanıcı isimlerini ayrı bir sorguyla veya join ile almayı deneyelim
    // Ama join bazen RLS veya ilişki tanımı yüzünden sorun çıkarabiliyor.
    // Şimdilik kullanıcıları da çekip eşleştirelim (küçük veri seti olduğu için güvenli)
    const { data: users } = await supabase.from('users').select('id, name');
    const userMap = (users || []).reduce((acc: any, curr: any) => {
      acc[curr.id] = curr.name;
      return acc;
    }, {});

    return (data || []).map(o => ({
      id: o.id,
      userId: o.user_id,
      status: o.status as 'PENDING' | 'COMPLETED',
      createdAt: o.created_at,
      userName: userMap[o.user_id] || 'Bilinmeyen Kullanıcı',
      details: (o.inventory_order_details || []).map((d: any) => ({
        id: d.id,
        orderId: d.order_id,
        itemId: d.item_id,
        countedQuantity: Number(d.counted_quantity),
        itemName: d.inventory_items?.name || 'Bilinmeyen Ürün',
        itemMinStock: Number(d.inventory_items?.min_stock || 0),
        itemUnit: d.inventory_items?.unit || 'Adet',
        wholesalerId: d.inventory_items?.wholesaler_id
      }))
    }));
  },

  updateOrderStatus: async (orderId: string, status: 'PENDING' | 'COMPLETED') => {
    const { error } = await supabase
      .from('inventory_orders')
      .update({ status })
      .eq('id', orderId);
    if (error) throw error;
  },

  deleteOrder: async (orderId: string) => {
    const { error } = await supabase.from('inventory_orders').delete().eq('id', orderId);
    if (error) throw error;
  },

  exportAllData: async () => {
    const { data: users } = await supabase.from('users').select('*');
    const { data: entries } = await supabase.from('entries').select('*');
    const { data: wholesalers } = await supabase.from('wholesalers').select('*');
    const { data: acc_transactions } = await supabase.from('acc_transactions').select('*');
    const { data: settings } = await supabase.from('settings').select('*');
    const { data: ai_notes } = await supabase.from('ai_training_notes').select('*');
    return {
      version: '1.7',
      timestamp: new Date().toISOString(),
      users: users || [],
      entries: entries || [],
      wholesalers: wholesalers || [],
      acc_transactions: acc_transactions || [],
      settings: settings || [],
      ai_training_notes: ai_notes || []
    };
  },

  importAllData: async (snapshot: any) => {
    if (snapshot.users?.length > 0) await supabase.from('users').upsert(snapshot.users);
    if (snapshot.entries?.length > 0) await supabase.from('entries').upsert(snapshot.entries);
    if (snapshot.wholesalers?.length > 0) await supabase.from('wholesalers').upsert(snapshot.wholesalers);
    if (snapshot.acc_transactions?.length > 0) await supabase.from('acc_transactions').upsert(snapshot.acc_transactions);
    if (snapshot.settings?.length > 0) await supabase.from('settings').upsert(snapshot.settings);
    if (snapshot.ai_training_notes?.length > 0) await supabase.from('ai_training_notes').upsert(snapshot.ai_training_notes);
    return true;
  },

  // --- AI Eğitim Notları ---
  getAITrainingNotes: async (): Promise<{id: string, content: string, created_at: string}[]> => {
    const { data, error } = await supabase.from('ai_training_notes').select('*').order('created_at', { ascending: false });
    if (error) return [];
    return data || [];
  },

  upsertAITrainingNote: async (content: string, id?: string) => {
    const payload: any = { content };
    if (id) payload.id = id;
    const { error } = await supabase.from('ai_training_notes').upsert(payload);
    if (error) throw error;
  },

  deleteAITrainingNote: async (id: string) => {
    const { error } = await supabase.from('ai_training_notes').delete().eq('id', id);
    if (error) throw error;
  }
};
