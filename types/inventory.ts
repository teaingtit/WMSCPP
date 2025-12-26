// File: types/inventory.ts
export interface InventoryItem {
  id: string;
  item_name: string;
  code: string;
  quantity: number;
  warehouse: string;
  location: string;
  cart_no: string;
  lot: string;
  unit: string;
  remark?: string;
  created_at?: string;
  updated_at?: string;
  
}
// กำหนดโครงสร้างข้อมูลของ "ตะกร้า" (Cart)
export interface CartData {
  cartId: string;
  location: string;
  items: InventoryItem[];
}
export interface HistoryLogItem {
  id: number;
  timestamp: string;
  action: string;
  details: string;
  status: string;
}