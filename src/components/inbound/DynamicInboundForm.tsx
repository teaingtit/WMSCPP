'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';

import { submitBulkInbound } from '@/actions/inbound-actions';
import { Loader2, Save, MapPin, Package, Plus, ListChecks, Trash2 } from 'lucide-react';
import { notify } from '@/lib/ui-helpers';
import { Product } from '@/types/inventory';
import { useGlobalLoading } from '@/components/providers/GlobalLoadingProvider';
// Import Components ที่เราแยกออกมา
import LocationSelector, { LocationData } from '@/components/shared/LocationSelector';
import ProductAutocomplete from './ProductAutocomplete';
import TransactionConfirmModal from '@/components/shared/TransactionConfirmModal';
import SuccessReceiptModal from '@/components/shared/SuccessReceiptModal';
import useTransactionFlow from '@/hooks/useTransactionFlow';
import { BaseCartDrawer } from '@/components/shared/BaseCartDrawer';
import { CartFloatingButton } from '@/components/shared/CartFloatingButton';

// --- Interfaces ---
interface FormSchemaField {
  key: string;
  label: string;
  type: string;
  required: boolean;
  scope: 'LOT' | 'PRODUCT';
}

export interface Category {
  id: string;
  name: string;
  form_schema?: FormSchemaField[];
}

interface DynamicInboundFormProps {
  warehouseId: string;
  category: Category;
  products: Product[];
}
// ✅ Interface สำหรับ Queue Item
interface InboundQueueItem {
  id: string; // unique id for UI key
  product: Product;
  location: LocationData;
  quantity: number;
  attributes: Record<string, any>;
}

export default function DynamicInboundForm({
  warehouseId,
  category,
  products,
}: DynamicInboundFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const { setIsLoading } = useGlobalLoading();
  const [formResetKey, setFormResetKey] = useState(Date.now());
  // ✅ Queue State
  const [queue, setQueue] = useState<InboundQueueItem[]>([]);
  // 1. Product State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // 2. Location State
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);

  // 3. Other States
  const [quantity, setQuantity] = useState('');
  const [attributes, setAttributes] = useState<Record<string, any>>({});
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Suggestion 1: Memoize schema extraction for performance and clarity.
  const lotSchema = useMemo(
    () => category.form_schema?.filter((f) => f.scope === 'LOT') ?? [],
    [category.form_schema],
  );

  // Reset lot attributes when the selected product is cleared
  useEffect(() => {
    if (!selectedProduct) {
      setAttributes({});
    }
  }, [selectedProduct]);

  // ✅ Reset แค่ Form Input (ไม่เคลียร์ Queue)
  const resetInput = useCallback(() => {
    setQuantity('');
    setAttributes({});
    setSelectedProduct(null);
    setSelectedLocation(null);
    setFormResetKey(Date.now());
  }, []);

  // ✅ ฟังก์ชันเพิ่มลงตะกร้า
  const handleAddToQueue = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!selectedLocation?.id) {
      notify.error('กรุณาระบุพิกัด');
      return;
    }
    if (!selectedProduct) {
      notify.error('กรุณาเลือกสินค้า');
      return;
    }
    const qty = Number(quantity);
    if (!quantity || qty <= 0) {
      notify.error('จำนวนไม่ถูกต้อง');
      return;
    }

    for (const field of lotSchema) {
      if (field.required && !attributes[field.key]) {
        notify.error(`กรุณากรอก: ${field.label}`);
        return;
      }
    }

    const newItem: InboundQueueItem = {
      id: Date.now().toString(),
      product: selectedProduct,
      location: selectedLocation,
      quantity: qty,
      attributes: { ...attributes },
    };

    setQueue((prev) => [...prev, newItem]);
    notify.success('เพิ่มรายการแล้ว');
    resetInput(); // เคลียร์ฟอร์มเพื่อให้กรอกต่อได้ทันที
  };

  const removeFromQueue = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  // ✅ ฟังก์ชันบันทึกทั้งหมด
  const handleConfirmAll = () => {
    if (queue.length === 0) return;
    openConfirm();
  };

  const executor = async () => {
    setIsLoading(true);
    setSubmitting(true);
    const payload = queue.map((item) => ({
      warehouseId,
      locationId: item.location.id,
      quantity: item.quantity,
      isNewProduct: false,
      productId: item.product.id,
      attributes: item.attributes,
      productName: item.product.name,
    }));

    try {
      const result = await submitBulkInbound(payload);
      if (result.success) {
        return {
          success: true,
          data: {
            title: 'บันทึกการรับเข้าสินค้าเรียบร้อย',
            details: [
              { label: 'จำนวนรายการ', value: `${result.details.success} รายการ` },
              { label: 'เวลา', value: new Date().toLocaleString('th-TH') },
            ],
          },
          redirect: true,
        } as const;
      }
      notify.error('มีบางรายการผิดพลาด กรุณาตรวจสอบ');
      console.error(result.details);
      return { success: false, details: result.details } as const;
    } catch (error) {
      notify.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
      return { success: false } as const;
    } finally {
      setIsLoading(false);
      setSubmitting(false);
      setIsCartOpen(false); // Close cart on finish
    }
  };

  const {
    isOpen,
    isLoading,
    openConfirm,
    closeConfirm,
    execute,
    successInfo,
    handleSuccessModalClose,
  } = useTransactionFlow(executor, (info) =>
    info?.redirect ? `/dashboard/${warehouseId}/inventory` : undefined,
  );

  return (
    <div className="pb-20 max-w-4xl mx-auto">
      {/* --- Main Form --- */}
      <div>
        <form onSubmit={handleAddToQueue} className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 text-lg border-b border-slate-100 pb-4">
              <Package className="text-indigo-600" /> ข้อมูลสินค้า (Product)
            </h3>
            <ProductAutocomplete
              products={products}
              selectedProduct={selectedProduct}
              onSelect={setSelectedProduct}
            />
            {/* Dynamic Attributes */}
            {lotSchema.length > 0 && selectedProduct && (
              <div className="mt-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <div className="grid grid-cols-2 gap-4">
                  {lotSchema.map((field) => (
                    <div key={field.key}>
                      <label className="block text-xs font-bold text-emerald-800 mb-1">
                        {field.label}
                      </label>
                      <input
                        type={field.type}
                        aria-label={field.label}
                        className="w-full p-2 bg-white border border-emerald-200 rounded-lg text-sm"
                        onChange={(e) =>
                          setAttributes({ ...attributes, [field.key]: e.target.value })
                        }
                        value={attributes[field.key] || ''}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 text-lg border-b border-slate-100 pb-4">
              <MapPin className="text-indigo-600" /> ระบุพิกัด & จำนวน
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <LocationSelector
                  key={formResetKey}
                  warehouseId={warehouseId}
                  onSelect={setSelectedLocation}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">จำนวน</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    disabled={!selectedLocation}
                    className="w-full text-3xl font-black text-slate-900 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
                    placeholder="0"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                    {selectedProduct?.uom || 'UNIT'}
                  </span>
                </div>
                {/* ปุ่ม Add to Queue */}
                <button
                  type="submit"
                  disabled={!selectedLocation || !selectedProduct || !quantity}
                  className="mt-4 w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Plus size={20} /> เพิ่มลงรายการ
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* --- Cart Trigger --- */}
      <CartFloatingButton
        itemCount={queue.length}
        onClick={() => setIsCartOpen(true)}
        label="รายการรับเข้า"
      />

      {/* --- Drawer --- */}
      <BaseCartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        title="รายการรอรับเข้า"
        icon={<ListChecks size={20} />}
        itemCount={queue.length}
        onClearAll={() => setQueue([])}
        footer={
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm font-bold text-slate-600">
              <span>Total Items:</span>
              <span className="text-lg text-emerald-600">{queue.length}</span>
            </div>
            <button
              onClick={handleConfirmAll}
              disabled={queue.length === 0 || submitting}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
            >
              {submitting ? <Loader2 className="animate-spin" /> : <Save size={20} />}
              ยืนยันรับเข้าทั้งหมด
            </button>
          </div>
        }
      >
        {queue.map((item, idx) => (
          <div
            key={item.id}
            className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-start gap-3 group hover:border-emerald-200 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <h4 className="font-bold text-slate-700 truncate text-sm">
                  {idx + 1}. {item.product.name}
                </h4>
                <button
                  onClick={() => removeFromQueue(item.id)}
                  className="text-slate-300 hover:text-rose-500 transition-colors p-1 -mr-1"
                >
                  <span className="sr-only">Remove {item.product.name} from queue</span>
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="text-xs text-slate-500 mb-1 font-mono">{item.location.code}</div>

              {lotSchema.length > 0 && Object.keys(item.attributes).length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {lotSchema.map((field) => {
                    const value = item.attributes[field.key];
                    return value ? (
                      <span
                        key={field.key}
                        className="bg-slate-100 text-slate-500 text-[10px] px-1.5 py-0.5 rounded border border-slate-200"
                      >
                        {field.label}: {value}
                      </span>
                    ) : null;
                  })}
                </div>
              )}

              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                  +{item.quantity} {item.product.uom}
                </span>
              </div>
            </div>
          </div>
        ))}
      </BaseCartDrawer>

      {/* --- Modals --- */}
      <TransactionConfirmModal
        isOpen={isOpen}
        onClose={closeConfirm}
        onConfirm={async () => {
          const res = await execute();
          if (res.success) setQueue([]);
        }}
        title="ยืนยันการรับเข้าสินค้า"
        details={
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">จำนวนรายการ</span>
              <span className="font-medium text-slate-900">{queue.length} รายการ</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">ประเภท</span>
              <span className="font-medium text-slate-900">รับเข้า (Inbound)</span>
            </div>
          </div>
        }
        confirmText="ยืนยันรับเข้า"
        isLoading={isLoading || submitting}
      />

      <SuccessReceiptModal
        isOpen={!!successInfo}
        onClose={handleSuccessModalClose}
        data={successInfo?.data ?? null}
      />
    </div>
  );
}
