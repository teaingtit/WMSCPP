// components/inbound/DynamicInboundForm.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { submitInbound } from '@/actions/inbound-actions';
import { Loader2, Save, PackagePlus, Box } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DynamicInboundFormProps {
  warehouseId: string;
  category: any;
  products: any[];
  locations: any[];
}

export default function DynamicInboundForm({ 
  warehouseId, category, products, locations 
}: DynamicInboundFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // --- 1. Mode Selection State ---
  const [isNewProduct, setIsNewProduct] = useState(false);

  // --- 2. Form State ---
  const [formData, setFormData] = useState({
    productId: '',
    locationId: '',
    quantity: '',
  });

  // State สำหรับสินค้าใหม่
  const [newProd, setNewProd] = useState({
    sku: '',
    name: '',
    uom: 'PCS',
    minStock: 0
  });

  // State สำหรับพิกัด (Lot/Cart Selector)
  const [selectedLot, setSelectedLot] = useState('');
  const [selectedCart, setSelectedCart] = useState('');

  // State สำหรับ Dynamic Attributes
  const [attributes, setAttributes] = useState<Record<string, any>>({});

  // --- 3. Location Logic (Auto-Match Coordinates) ---
  // เมื่อเลือก Lot/Cart ให้หา Location ID ที่ตรงกัน
  useEffect(() => {
     if(selectedLot && selectedCart) {
        // Format: {WH}-L{xx}-C{xx} เช่น WH-TEST-L01-C05
        const lotStr = selectedLot.padStart(2, '0');
        const cartStr = selectedCart.padStart(2, '0');
        const targetCode = `${warehouseId}-L${lotStr}-C${cartStr}`;

        const foundLoc = locations.find((l: any) => l.code === targetCode);
        if(foundLoc) {
            setFormData(prev => ({ ...prev, locationId: foundLoc.id }));
        } else {
            setFormData(prev => ({ ...prev, locationId: '' })); // Reset ถ้าไม่เจอ
        }
     }
  }, [selectedLot, selectedCart, locations, warehouseId]);

  // แยกรายการ Lots และ Carts ที่มีอยู่จริงใน Database เพื่อทำ Dropdown
  const availableLots = Array.from(new Set(
    locations.map((l:any) => {
        // Parse Code: WH-A-L01-C01 -> L01
        const parts = l.code.split('-L');
        if(parts.length > 1) return parts[1].split('-C')[0];
        return null;
    }).filter(Boolean)
  )).sort() as string[];

  const availableCarts = Array.from(new Set(
    locations.map((l:any) => {
        const parts = l.code.split('-C');
        if(parts.length > 1) return parts[1];
        return null;
    }).filter(Boolean)
  )).sort() as string[];


  // --- 4. Submit Handler ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.locationId) {
        alert("❌ กรุณาระบุตำแหน่งจัดเก็บ (Lot/Cart) ให้ครบถ้วน");
        return;
    }
    
    setLoading(true);

    const payload = {
        warehouseId,
        locationId: formData.locationId,
        quantity: formData.quantity,
        isNewProduct,
        productId: isNewProduct ? null : formData.productId,
        newProductData: isNewProduct ? { ...newProd, categoryId: category.id } : null,
        attributes
    };

    const result = await submitInbound(payload);
    
    if (result.success) {
        alert("✅ " + result.message);
        router.push(`/dashboard/${warehouseId}/inventory`);
        router.refresh();
    } else {
        alert("❌ Error: " + result.message);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
       
       {/* Toggle Mode Switch */}
       <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm inline-flex mb-2">
            <button
               type="button"
               onClick={() => setIsNewProduct(false)}
               className={cn(
                  "px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all",
                  !isNewProduct ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
               )}
            >
               <Box size={18} /> สินค้าเดิม (Existing)
            </button>
            <button
               type="button"
               onClick={() => setIsNewProduct(true)}
               className={cn(
                  "px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all",
                  isNewProduct ? "bg-emerald-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
               )}
            >
               <PackagePlus size={18} /> สินค้าใหม่ (New SKU)
            </button>
       </div>

       <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         
         {/* LEFT COLUMN: Product Info */}
         <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    {isNewProduct ? <PackagePlus className="text-emerald-600" size={20}/> : <Box className="text-indigo-600" size={20}/>}
                    {isNewProduct ? 'สร้างสินค้าใหม่' : 'เลือกสินค้า'}
                </h3>

                {!isNewProduct ? (
                    <div>
                        <label className="label-text">ค้นหาสินค้าจากรายการ</label>
                        <select 
                            required
                            className="input-field w-full text-lg"
                            value={formData.productId}
                            onChange={e => setFormData({...formData, productId: e.target.value})}
                        >
                            <option value="">-- Search Product --</option>
                            {products.map((p: any) => (
                                <option key={p.id} value={p.id}>{p.sku} | {p.name}</option>
                            ))}
                        </select>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                        <div className="md:col-span-2">
                            <label className="label-text text-emerald-700">ชื่อสินค้า (Name) *</label>
                            <input 
                                required className="input-field w-full" 
                                placeholder="Ex. ปากกาลูกลื่น สีน้ำเงิน"
                                value={newProd.name}
                                onChange={e => setNewProd({...newProd, name: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="label-text text-emerald-700">รหัสสินค้า (SKU) *</label>
                            <input 
                                required className="input-field w-full uppercase font-mono" 
                                placeholder="Ex. A-001"
                                value={newProd.sku}
                                onChange={e => setNewProd({...newProd, sku: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="label-text">หน่วยนับ (UOM)</label>
                            <select 
                                className="input-field w-full"
                                value={newProd.uom}
                                onChange={e => setNewProd({...newProd, uom: e.target.value})}
                            >
                                <option value="PCS">ชิ้น (PCS)</option>
                                <option value="BOX">กล่อง (BOX)</option>
                                <option value="SET">ชุด (SET)</option>
                                <option value="KG">กิโลกรัม (KG)</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* Dynamic Attributes */}
            {category.form_schema && category.form_schema.length > 0 && (
                <div className="bg-amber-50/60 p-6 rounded-2xl border border-amber-100">
                    <h4 className="font-bold text-amber-700 mb-4 text-xs uppercase tracking-wider flex items-center gap-2">
                        ข้อมูลจำเพาะ ({category.name})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {category.form_schema.map((field: any) => (
                            <div key={field.key}>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">
                                    {field.label} {field.required && <span className="text-rose-500">*</span>}
                                </label>
                                <input 
                                    type={field.type}
                                    required={field.required}
                                    className="input-field w-full bg-white border-amber-200 focus:ring-amber-500/20"
                                    onChange={e => setAttributes({...attributes, [field.key]: e.target.value})}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
         </div>

         {/* RIGHT COLUMN: Location & Quantity */}
         <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                 <h3 className="font-bold text-slate-800 mb-4">ระบุพิกัด & จำนวน</h3>
                 
                 {/* Coordinate Selector */}
                 <div className="space-y-4 mb-6">
                    <div className="flex gap-2 items-center">
                        <div className="flex-1">
                            <label className="label-text text-center block mb-1">LOT (แถว)</label>
                            <select 
                                className="input-field w-full text-center font-mono text-lg font-bold bg-indigo-50 border-indigo-100 text-indigo-700"
                                value={selectedLot}
                                onChange={e => setSelectedLot(e.target.value)}
                            >
                                <option value="">--</option>
                                {availableLots.map((lot) => (
                                    <option key={lot} value={lot}>{lot}</option>
                                ))}
                            </select>
                        </div>
                        <div className="text-slate-300 pt-5">➔</div>
                        <div className="flex-1">
                            <label className="label-text text-center block mb-1">CART (แคร่)</label>
                            <select 
                                className="input-field w-full text-center font-mono text-lg font-bold bg-indigo-50 border-indigo-100 text-indigo-700"
                                value={selectedCart}
                                onChange={e => setSelectedCart(e.target.value)}
                            >
                                <option value="">--</option>
                                {availableCarts.map((cart) => (
                                    <option key={cart} value={cart}>{cart}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Feedback Status */}
                    {formData.locationId ? (
                         <div className="bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg text-xs font-bold text-center border border-emerald-100 animate-in zoom-in-95">
                             ✅ พิกัดถูกต้อง: {locations.find((l:any) => l.id === formData.locationId)?.code}
                         </div>
                    ) : (selectedLot && selectedCart) ? (
                         <div className="bg-rose-50 text-rose-600 px-3 py-2 rounded-lg text-xs font-bold text-center border border-rose-100 animate-in shake">
                             ❌ ไม่พบพิกัดนี้ในระบบ
                         </div>
                    ) : (
                         <div className="text-center text-xs text-slate-400 py-2">
                             กรุณาเลือก Lot และ Cart
                         </div>
                    )}
                 </div>

                 <div className="border-t border-slate-100 my-4"></div>

                 <div>
                    <label className="label-text mb-2 block">จำนวนรับเข้า (Quantity)</label>
                    <div className="relative">
                        <input 
                            type="number" required min="1"
                            className="input-field w-full text-3xl font-black text-slate-800 pl-4 pr-16 h-16"
                            placeholder="0"
                            value={formData.quantity}
                            onChange={e => setFormData({...formData, quantity: e.target.value})}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm bg-slate-100 px-2 py-1 rounded">
                            {isNewProduct ? newProd.uom : 'UNITS'}
                        </span>
                    </div>
                 </div>
            </div>

            <button 
                type="submit" 
                disabled={loading || !formData.locationId}
                className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                บันทึกรับเข้า
            </button>
         </div>

       </form>
    </div>
  );
}