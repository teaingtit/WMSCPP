export type UserRole = 'admin' | 'staff';

export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
  allowed_warehouses: string[]; // Array ของ Warehouse ID หรือ Code
  created_at?: string;
}