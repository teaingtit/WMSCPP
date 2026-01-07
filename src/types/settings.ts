import { Product } from './inventory';

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  axis_x?: number;
  axis_y?: number;
  axis_z?: number;
  created_at?: string;
}

export interface Category {
  id: string;
  name: string;
  form_schema?: any; // JSON Schema
  units?: string[]; // Unit of Measure options
}

export interface User {
  id: string;
  email: string | undefined;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  is_active: boolean;
  is_banned: boolean;
  last_sign_in_at: string | undefined;
  created_at: string;
  allowed_warehouses: string[];
}

export type { Product };
