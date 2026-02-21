
export enum UserRole {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  BOSS = 'BOSS'
}

export type EntryType = '5H' | '8H' | 'CUSTOM' | 'EXPENSE' | 'PAYMENT' | 'TIP';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  hourlyRate: number;
  password?: string;
  avatar?: string;
}

export interface PuantajEntry {
  id: string;
  userId: string;
  type: EntryType;
  amount: number;
  hours?: number;
  date: string;
  note?: string;
}

// --- Dashboard Tipleri ---

/**
 * Interface used by Dashboard.tsx component to represent daily attendance records.
 */
export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  status: 'present' | 'absent' | 'leave' | 'sick';
  entryTime?: string;
  exitTime?: string;
  overtime: number;
}

// --- Ön Muhasebe Tipleri ---

export type AccTransactionType = 'PURCHASE' | 'PAYMENT';

export interface Wholesaler {
  id: string;
  name: string;
  phone?: string;
  contactPerson?: string;
}

export interface AccTransaction {
  id: string;
  wholesalerId: string;
  type: AccTransactionType;
  amount: number;
  date: string;
  dueDate?: string;
  note?: string;
}

export interface AppState {
  users: User[];
  entries: PuantajEntry[];
  currentUser: User | null;
}

// --- Envanter ve Sipariş Tipleri ---

export interface InventoryCategory {
  id: string;
  name: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  wholesalerId: string | null;
  minStock: number;
  unit: string;
}

export interface InventoryOrder {
  id: string;
  userId: string;
  status: 'PENDING' | 'COMPLETED';
  createdAt: string;
  userName?: string; // Join ile gelecek
  details?: InventoryOrderDetail[];
}

export interface InventoryOrderDetail {
  id: string;
  orderId: string;
  itemId: string;
  countedQuantity: number;
  itemName?: string; // Join ile gelecek
  itemMinStock?: number; // Join ile gelecek
  itemUnit?: string; // Join ile gelecek
  wholesalerId?: string; // Join ile gelecek
}
