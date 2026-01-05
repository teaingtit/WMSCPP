'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { submitInbound,submitBulkInbound } from '@/actions/inbound-actions';
import { Loader2, Save, MapPin, Package, CheckCircle2, Layers, Plus, ListChecks, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Product } from '@/types/inventory';
import { useGlobalLoading } from '@/components/providers/GlobalLoadingProvider';
// Import Components ที่เราแยกออกมา
import LocationSelector, { LocationData } from '@/components/shared/LocationSelector';
import ProductAutocomplete from './ProductAutocomplete';
import TransactionConfirmModal from '@/components/shared/TransactionConfirmModal';
import SuccessReceiptModal, { SuccessData } from '@/components/shared/SuccessReceiptModal';

// --- Interfaces ---
interface FormSchemaField {
  key: string;
  label: string;
  type: string;
  required: boolean;
  scope: 'LOT' | 'PRODUCT';
}

interface Category {
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

export default function DynamicInboundForm({ warehouseId, category, products }: DynamicInboundFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const { setIsLoading } = useGlobalLoading();
  const [showConfirm, setShowConfirm] = useState(false);
  const [formResetKey, setFormResetKey] = useState(Date.now());
  // State สำหรับ Success Modal
  const [successInfo, setSuccessInfo] = useState<{ data: SuccessData, redirect: boolean } | null>(null);
// ✅ Queue State
  const [queue, setQueue] = useState<InboundQueueItem[]>([]);
  // 1. Product State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // 2. Location State
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);

  // 3. Other States
  const [quantity, setQuantity] = useState('');
  const [attributes, setAttributes] = useState<Record<string, any>>({});

  // Suggestion 1: Memoize schema extraction for performance and clarity.
  const lotSchema = useMemo(() => 
    category.form_schema?.filter((f) => f.scope === 'LOT') ?? []
  , [category.form_schema]);

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
  const handleAddToQueue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocation?.id) return toast.error("กรุณาระบุพิกัด");
    if (!selectedProduct) return toast.error("กรุณาเลือกสินค้า");
    const qty = Number(quantity);
    if (!quantity || qty <= 0) return toast.error("จำนวนไม่ถูกต้อง");

    for (const field of lotSchema) {
        if (field.required && !attributes[field.key]) {
            return toast.error(`กรุณากรอก: ${field.label}`);
        }
    }

    const newItem: InboundQueueItem = {
        id: Date.now().toString(),
        product: selectedProduct,
        location: selectedLocation,
        quantity: qty,
        attributes: { ...attributes }
    };

    setQueue(prev => [...prev, newItem]);
    toast.success("เพิ่มรายการแล้ว");
    resetInput(); // เคลียร์ฟอร์มเพื่อให้กรอกต่อได้ทันที
  };

  const removeFromQueue = (id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  };

  // ✅ ฟังก์ชันบันทึกทั้งหมด
  const handleConfirmAll = () => {
    if (queue.length === 0) return;
    setShowConfirm(true);
  };

  const executeSubmission = async () => {
    setShowConfirm(false);
    setIsLoading(true);
    setSubmitting(true);

    // Prepare Payload
    const payload = queue.map(item => ({
        warehouseId,
        locationId: item.location.id,
        quantity: item.quantity,
        isNewProduct: false,
        productId: item.product.id,
        attributes: item.attributes,
        productName: item.product.name // ส่งไปเพื่อ Log Error ถ้ามี
    }));

    try {
        const result = await submitBulkInbound(payload);
        if (result.success) {
            setQueue([]); // Clear Queue
            setSuccessInfo({
                data: {
                    details: [
                        { label: 'จำนวนรายการ', value: `${result.details.success} รายการ` },
                        { label: 'เวลา', value: new Date().toLocaleString('th-TH') }
                    ]
                },
                redirect: true
            });
        } else {
            toast.error("มีบางรายการผิดพลาด กรุณาตรวจสอบ");
            // อาจจะลบรายการที่สำเร็จออก หรือเหลือไว้ทั้งหมด (ในที่นี้ขอเหลือไว้)
            console.error(result.details);
        }
    } catch (error) {
        toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
        setIsLoading(false);
        setSubmitting(false);
    }
  };

  const handleSuccessClose = () => {
      const shouldRedirect = successInfo?.redirect;
      setSuccessInfo(null);
      if (shouldRedirect) {
          router.push(`/dashboard/${warehouseId}/inventory`);
      }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 pb-20">
      {/* --- Left Column: Form (2/3 width) --- */}
      <div className="xl:col-span-2">
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
                                    <label className="block text-xs font-bold text-emerald-800 mb-1">{field.label}</label>
                                    <input 
                                        type={field.type} 
                                        aria-label={field.label}
                                        className="w-full p-2 bg-white border border-emerald-200 rounded-lg text-sm"
                                        onChange={e => setAttributes({...attributes, [field.key]: e.target.value})}
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
                                type="number" min="1"
                                value={quantity}
                                onChange={e => setQuantity(e.target.value)}
                                disabled={!selectedLocation}
                                className="w-full text-3xl font-black text-slate-900 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
                                placeholder="0"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">{selectedProduct?.uom || 'UNIT'}</span>
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

      {/* --- Right Column: Queue List (1/3 width) --- */}
      <div className="xl:col-span-1">
        <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl sticky top-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <ListChecks className="text-emerald-400"/> รายการรอรับเข้า ({queue.length})
            </h3>
            
            <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2 mb-6">
                {queue.length === 0 ? (
                    <div className="text-slate-500 text-center py-8 border-2 border-dashed border-slate-700 rounded-xl">
                        ยังไม่มีรายการ
                    </div>
                ) : (
                    queue.map((item, idx) => (
                        <div key={item.id} className="bg-slate-800 p-3 rounded-xl border border-slate-700 flex justify-between items-start animate-in fade-in slide-in-from-right-4">
                            <div className="flex-1 min-w-0 pr-2">
                                <div className="font-bold text-sm truncate text-slate-200">{idx + 1}. {item.product.name}</div>
                                <div className="text-xs text-slate-400 font-mono mt-1">
                                    {item.location.code} {lotSchema.length > 0 && Object.keys(item.attributes).length > 0 && '•'} {lotSchema.map((field) => {
                                        const value = item.attributes[field.key];
                                        return value ? (
                                            <span key={field.key} className="inline-flex items-center rounded-md bg-slate-700 px-2 py-1 text-xs font-medium text-slate-300 ring-1 ring-inset ring-slate-600 mr-1">
                                                {field.label}: {String(value)}
                                            </span>
                                        ) : null;
                                    }).filter(Boolean)}
                                </div>
                            </div>
                            <div className="text-right flex flex-col items-end gap-2">
                                <span className="text-emerald-400 font-black text-lg">{item.quantity}</span>
                                <button onClick={() => removeFromQueue(item.id)} aria-label="ลบรายการ" className="text-rose-400 hover:text-rose-300">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="border-t border-slate-700 pt-4">
                <div className="flex justify-between mb-4 text-sm text-slate-400">
                    <span>รวมทั้งสิ้น</span>
                    <span className="text-white font-bold">{queue.length} รายการ</span>
                </div>
                <button 
                    onClick={handleConfirmAll}
                    disabled={queue.length === 0 || submitting}
                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
                >
                    {submitting ? <Loader2 className="animate-spin"/> : <Save size={20}/>}
                    ยืนยันรับเข้าทั้งหมด
                </button>
            </div>
        </div>
      </div>

      {/* --- Modals --- */}
      <TransactionConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={executeSubmission}
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
        isLoading={submitting}
      />

      <SuccessReceiptModal
        isOpen={!!successInfo}
        onClose={handleSuccessClose}
        data={successInfo?.data ?? null}
      />
    </div>
  );
}