'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';

import { submitBulkInbound } from '@/actions/inbound-actions';
import { Loader2, Save, MapPin, Package, Plus, PackageCheck, Trash2 } from 'lucide-react';
import { notify } from '@/lib/ui-helpers';
import { Product } from '@/types/inventory';
import { useGlobalLoading } from '@/components/providers/GlobalLoadingProvider';
// Import Components ที่เราแยกออกมา
import LocationSelector, { LocationData } from '@/components/shared/LocationSelector';
import ProductAutocomplete from './ProductAutocomplete';
import TransactionConfirmModal from '@/components/shared/TransactionConfirmModal';
import SuccessReceiptModal from '@/components/shared/SuccessReceiptModal';
import useTransactionFlow from '@/hooks/useTransactionFlow';

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
  units?: string[];
}

interface DynamicInboundFormProps {
  warehouseId: string;
  category: Category;
}
// ✅ Interface สำหรับ Queue Item
interface InboundQueueItem {
  id: string; // unique id for UI key
  product: Product;
  location: LocationData;
  quantity: number;
  attributes: Record<string, any>;
}

export default function DynamicInboundForm({ warehouseId, category }: DynamicInboundFormProps) {
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
  const [selectedUnit, setSelectedUnit] = useState<string>('');

  // Suggestion 1: Memoize schema extraction for performance and clarity.
  const lotSchema = useMemo(
    () => category.form_schema?.filter((f) => f.scope === 'LOT') ?? [],
    [category.form_schema],
  );

  // Track queued product IDs for filtering from search results
  const queuedProductIds = useMemo(() => new Set(queue.map((item) => item.product.id)), [queue]);

  // Reset lot attributes when the selected product is cleared
  useEffect(() => {
    if (!selectedProduct) {
      setAttributes({});
      setSelectedUnit('');
    } else {
      // Default to either product UOM or first category unit or 'UNIT'
      setSelectedUnit(selectedProduct.uom || category.units?.[0] || 'UNIT');
    }
  }, [selectedProduct, category.units]);

  const resetInput = useCallback(() => {
    setQuantity('');
    setAttributes({});
    setSelectedProduct(null);
    setSelectedLocation(null);
    setSelectedUnit('');
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

    const finalAttributes = { ...attributes };
    if (selectedUnit) {
      finalAttributes['Received Unit'] = selectedUnit;
    }

    const newItem: InboundQueueItem = {
      id: Date.now().toString(),
      product: selectedProduct,
      location: selectedLocation,
      quantity: qty,
      attributes: finalAttributes,
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
          <div className="bg-card p-6 rounded-3xl shadow-sm border border-border">
            <h3 className="font-bold text-foreground mb-6 flex items-center gap-2 text-lg border-b border-border pb-4">
              <Package className="text-indigo-600" /> ข้อมูลสินค้า
            </h3>
            <ProductAutocomplete
              selectedProduct={selectedProduct}
              onSelect={setSelectedProduct}
              queuedProductIds={queuedProductIds}
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
                        className="w-full p-2 bg-card border border-emerald-200 dark:border-emerald-700 rounded-lg text-sm text-foreground"
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

          <div className="bg-card p-6 rounded-3xl shadow-sm border border-border">
            <h3 className="font-bold text-foreground mb-6 flex items-center gap-2 text-lg border-b border-border pb-4">
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
                <label className="block text-sm font-bold text-foreground mb-2">จำนวน</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      disabled={!selectedLocation}
                      className="w-full text-3xl font-black text-foreground px-4 py-3 bg-muted border border-border rounded-xl"
                      placeholder="0"
                    />
                  </div>
                  {category.units && category.units.length > 0 ? (
                    <select
                      value={selectedUnit}
                      onChange={(e) => setSelectedUnit(e.target.value)}
                      disabled={!selectedLocation || !selectedProduct}
                      title="Select Unit"
                      className="w-1/3 text-sm font-bold text-foreground px-3 py-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23131313%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:0.6rem_auto]"
                    >
                      <option value={selectedProduct?.uom || 'UNIT'}>
                        {selectedProduct?.uom || 'UNIT'} (Base)
                      </option>
                      {category.units
                        .filter((u) => u !== (selectedProduct?.uom || 'UNIT'))
                        .map((unit) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                    </select>
                  ) : (
                    <div className="flex items-center justify-center px-4 py-3 bg-muted border border-border rounded-xl w-1/3">
                      <span className="text-muted-foreground text-sm font-bold">
                        {selectedProduct?.uom || 'UNIT'}
                      </span>
                    </div>
                  )}
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

      {/* --- Inline Queue Display --- */}
      <div className="mt-8 bg-card p-4 rounded-2xl border border-border shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="font-bold text-foreground flex items-center gap-2">
            <PackageCheck size={18} className="text-emerald-600" /> รายการรอรับเข้า ({queue.length})
          </h4>
          <div className="text-sm text-muted-foreground">ตรวจสอบและแก้ไขรายการก่อนยืนยัน</div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex-1 overflow-y-auto p-2 space-y-3 bg-muted/30 min-h-[200px] max-h-[60vh] custom-scrollbar">
            {queue.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">ยังไม่มีรายการ</div>
            ) : (
              queue.map((item, idx) => (
                <div
                  key={item.id}
                  className="bg-card p-3 rounded-xl border border-border shadow-sm flex items-start gap-3 group hover:border-emerald-200 dark:hover:border-emerald-700 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-foreground truncate text-sm">
                        {idx + 1}. {item.product.name}
                      </h4>
                      <button
                        onClick={() => removeFromQueue(item.id)}
                        aria-label="ลบรายการ"
                        className="text-muted-foreground hover:text-rose-500 transition-colors p-1 -mr-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono mt-1">
                      {item.location.code}
                    </div>
                    {lotSchema.length > 0 && Object.keys(item.attributes).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {lotSchema.map((field) => {
                          const value = item.attributes[field.key];
                          return value ? (
                            <span
                              key={field.key}
                              className="bg-muted text-muted-foreground text-xs px-1.5 py-0.5 rounded border border-border"
                            >
                              {field.label}: {value}
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                    <div className="flex justify-end mt-2">
                      <span className="text-emerald-600 font-black text-lg">+{item.quantity}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex justify-between items-center text-sm font-bold text-muted-foreground">
              <span>จำนวนรายการ:</span>
              <span className="text-lg text-emerald-600">{queue.length}</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setQueue([])}
                disabled={queue.length === 0}
                className="flex-1 py-3 border border-border rounded-xl bg-card font-bold text-sm text-foreground disabled:opacity-50"
              >
                ล้างทั้งหมด
              </button>
              <button
                onClick={handleConfirmAll}
                disabled={queue.length === 0 || submitting}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                ยืนยันรับเข้าทั้งหมด
              </button>
            </div>
          </div>
        </div>
      </div>

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
              <span className="text-muted-foreground">จำนวนรายการ</span>
              <span className="font-medium text-foreground">{queue.length} รายการ</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ประเภท</span>
              <span className="font-medium text-foreground">รับเข้า (Inbound)</span>
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
