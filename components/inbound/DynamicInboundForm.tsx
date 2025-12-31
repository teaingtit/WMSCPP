'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitInbound } from '@/actions/inbound-actions';
import { Loader2, Save, MapPin, Package, CheckCircle2, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { Product } from '@/types/inventory';

// Import Components ที่เราแยกออกมา
import LocationSelector, { LocationData } from '@/components/shared/LocationSelector';
import ProductAutocomplete from './ProductAutocomplete';

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

export default function DynamicInboundForm({ warehouseId, category, products }: DynamicInboundFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  // 1. Product State (Clean!)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // 2. Location State (Clean!)
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);

  // 3. Other States
  const [quantity, setQuantity] = useState('');
  const [attributes, setAttributes] = useState<Record<string, any>>({});
  
  // Extract Schema
  const lotSchema = category.form_schema 
      ? category.form_schema.filter((f) => f.scope === 'LOT')
      : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocation?.id) return toast.error("❌ กรุณาระบุพิกัดให้ครบถ้วน");
    if (!selectedProduct) return toast.error("❌ กรุณาเลือกสินค้า");

    setSubmitting(true);
    const payload = {
        warehouseId,
        locationId: selectedLocation.id,
        quantity: Number(quantity),
        isNewProduct: false,
        productId: selectedProduct.id,
        attributes
    };

    const result = await submitInbound(payload);
    if (result.success) {
        toast.success(result.message);
        setQuantity('');
        setAttributes({});
        // Optional: Reset Location เพื่อความสะดวกในการยิงตัวต่อไปใน Lot เดิม (ถ้าต้องการ)
        // setSelectedLocation(null); 
    } else {
        toast.error(result.message);
    }
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4">
       
       {/* --- Left Column: Product & Attributes --- */}
       <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 min-h-[200px]">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 text-lg border-b border-slate-100 pb-4">
                    <Package className="text-indigo-600" /> ข้อมูลสินค้า (Product)
                </h3>

                {/* ✅ ใช้ Component ใหม่ */}
                <ProductAutocomplete 
                    products={products}
                    selectedProduct={selectedProduct}
                    onSelect={setSelectedProduct}
                />
            </div>

            {/* Dynamic Attributes (Render เมื่อเลือกสินค้าแล้ว) */}
            {lotSchema.length > 0 && selectedProduct && (
                <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 animate-in fade-in slide-in-from-bottom-2">
                     <h4 className="font-bold text-emerald-700 mb-4 text-sm flex items-center gap-2"><Layers size={16}/> ข้อมูลล็อตสินค้า (Lot Data)</h4>
                     <div className="grid gap-4">
                        {lotSchema.map((field) => (
                            <div key={field.key}>
                                <label htmlFor={`attr-${field.key}`} className="block text-xs font-bold text-emerald-800 mb-1">
                                    {field.label} {field.required && <span className="text-rose-500">*</span>}
                                </label>
                                <input 
                                    id={`attr-${field.key}`}
                                    type={field.type} 
                                    required={field.required}
                                    className="w-full p-2.5 bg-white border border-emerald-200 rounded-lg focus:outline-none focus:border-emerald-500"
                                    onChange={e => setAttributes({...attributes, [field.key]: e.target.value})}
                                    value={attributes[field.key] || ''}
                                />
                            </div>
                        ))}
                     </div>
                </div>
            )}
       </div>

       {/* --- Right Column: Location & Quantity --- */}
       <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 text-lg border-b border-slate-100 pb-4">
                    <MapPin className="text-indigo-600" /> ระบุพิกัด (Coordinates)
                </h3>
                
                {/* ✅ ใช้ Component ใหม่ (จัดการ Logic Dropdown ทั้งหมดในนี้) */}
                <LocationSelector 
                    warehouseId={warehouseId}
                    onSelect={setSelectedLocation}
                />

                {/* Summary Card (แสดงเมื่อเลือกครบแล้ว) */}
                {selectedLocation && (
                    <div className="mt-6 p-4 bg-slate-900 text-white rounded-2xl flex justify-between items-center shadow-lg animate-in zoom-in duration-300">
                        <div>
                            <div className="text-xs text-slate-400 font-bold uppercase">Target Location</div>
                            <div className="text-xl font-bold font-mono tracking-wider">
                                {selectedLocation.lot}-{selectedLocation.cart}-{selectedLocation.level}
                            </div>
                        </div>
                        <div className="text-right">
                             <div className="text-xs text-emerald-400 font-bold flex items-center gap-1 justify-end"><CheckCircle2 size={12}/> READY</div>
                             <div className="text-[10px] text-slate-500 font-mono">{selectedLocation.code}</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Quantity Input */}
            <div className={`transition-all duration-500 ${selectedLocation ? 'opacity-100 translate-y-0' : 'opacity-50 translate-y-4 pointer-events-none blur-[1px]'}`}>
                <label htmlFor="inbound-qty" className="block text-sm font-bold text-slate-700 mb-2">จำนวนรับเข้า (Quantity)</label>
                <div className="relative">
                    <input 
                        id="inbound-qty"
                        type="number" min="1"
                        value={quantity}
                        onChange={e => setQuantity(e.target.value)}
                        disabled={!selectedLocation}
                        className="w-full text-4xl font-black text-slate-900 pl-6 pr-20 py-6 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none disabled:bg-slate-100"
                        placeholder="0"
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold bg-white px-3 py-1 rounded border text-xs">
                        {selectedProduct?.uom || 'UNIT'}
                    </span>
                </div>
            </div>

            <button 
                type="submit" 
                disabled={submitting || !selectedLocation || !selectedProduct || !quantity}
                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-bold text-xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
                {submitting ? <Loader2 className="animate-spin" /> : <Save size={24} className="group-hover:scale-110 transition-transform"/>}
                <span>บันทึกรับเข้า</span>
            </button>
       </div>
    </form>
  );
}