// types/inventory.ts

export interface InventoryItem {
  id: string;
  itemName: string; // เปลี่ยนจาก item_name
  code: string;     // SKU
  quantity: number;
  warehouse: string; // Warehouse Code
  location: string;  // Location Code
  cartNo?: string;   // เปลี่ยนจาก cart_no (Optional?)
  lot?: string;
  unit: string;      // UOM
  remark?: string;
  createdAt?: string;
  updatedAt?: string;
}

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
  status: 'SUCCESS' | 'ERROR' | 'PENDING'; // ระบุ Type ชัดเจนดีกว่า string เฉยๆ
}