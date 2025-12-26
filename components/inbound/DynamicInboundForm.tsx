// components/inbound/DynamicInboundForm.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitInbound } from '@/actions/inbound-actions';
import { Loader2, Save, PackagePlus, Box, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DynamicInboundForm({ 
  warehouseId, category, products, locations 
}: any) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isNewProduct, setIsNewProduct] = useState(false); // Toggle Mode

  // State
  const [formData, setFormData] = useState({
    productId: '',
    locationId: '',
    quantity: '',
  });

  const [newProductData, setNewProductData] = useState({
    sku: '',
    name: '',
    uom: 'PCS',
    minStock: '0',
    categoryId: category.id
  });

  const [attributes, setAttributes] = useState<Record<string, any>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
        warehouseId,
        locationId: formData.locationId,
        quantity: formData.quantity,
        isNewProduct,
        productId: isNewProduct ? null : formData.productId,
        newProductData: isNewProduct ? newProductData : null,
        attributes
    };

    const result = await submitInbound(payload);
    
    if (result.success) {
        // ใช้ UI Feedback แทน alert
        router.push(`/dashboard/${warehouseId}/inventory`); 
        router.refresh();
    } else {
        alert('Error: ' + result.message);
        setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
       <form onSubmit={handleSubmit} className="space-y-6">
         
         {/* 1. Toggle Mode Card */}
         <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm inline-flex mb-2">
            <button
               type="button"
               onClick={() => setIsNewProduct(false)}
               className={cn(
                  "px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all",
                  !isNewProduct ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
               )}
            >
               <Box size={16} /> สินค้าที่มีอยู่แล้ว
            </button>
            <button
               type="button"
               onClick={() => setIsNewProduct(true)}
               className={cn(
                  "px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all",
                  isNewProduct ? "bg-emerald-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
               )}
            >
               <PackagePlus size={16} /> สินค้าใหม่ (New SKU)
            </button>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Product Info */}
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <PackagePlus className="text-indigo-600" size={20}/> 
                        {isNewProduct ? 'ข้อมูลสินค้าใหม่' : 'เลือกสินค้า'}
                    </h3>

                    {!isNewProduct ? (
                        <div>
                             <label className="label-text">เลือกสินค้าจากรายการ</label>
                             <select 
                                required
                                className="input-field w-full"
                                value={formData.productId}
                                onChange={e => setFormData({...formData, productId: e.target.value})}
                            >
                                <option value="">-- Search or Select --</option>
                                {products.map((p: any) => (
                                    <option key={p.id} value={p.id}>{p.sku} : {p.name}</option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                             <div className="md:col-span-2">
                                <label className="label-text">ชื่อสินค้า (Product Name)</label>
                                <input 
                                    required className="input-field w-full" placeholder="Ex. ปากกาลูกลื่น สีน้ำเงิน"
                                    value={newProductData.name}
                                    onChange={e => setNewProductData({...newProductData, name: e.target.value})}
                                />
                             </div>
                             <div>
                                <label className="label-text">รหัสสินค้า (SKU)</label>
                                <input 
                                    required className="input-field w-full uppercase" placeholder="Ex. PEN-001"
                                    value={newProductData.sku}
                                    onChange={e => setNewProductData({...newProductData, sku: e.target.value})}
                                />
                             </div>
                             <div>
                                <label className="label-text">หน่วยนับ (UOM)</label>
                                <select 
                                    className="input-field w-full"
                                    value={newProductData.uom}
                                    onChange={e => setNewProductData({...newProductData, uom: e.target.value})}
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
                    <div className="bg-indigo-50/60 p-6 rounded-2xl border border-indigo-100">
                        <h4 className="font-bold text-indigo-800 mb-4 text-sm uppercase tracking-wider">
                            ข้อมูลเฉพาะ ({category.name})
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
                                        className="input-field w-full bg-white"
                                        onChange={e => setAttributes({...attributes, [field.key]: e.target.value})}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Right Column: Location & Qty */}
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                     <h3 className="font-bold text-slate-800 mb-4">จัดเก็บ & จำนวน</h3>
                     
                     <div className="space-y-4">
                        <div>
                            <label className="label-text">Location</label>
                            <select 
                                required
                                className="input-field w-full font-mono text-sm"
                                value={formData.locationId}
                                onChange={e => setFormData({...formData, locationId: e.target.value})}
                            >
                                <option value="">-- เลือกตำแหน่ง --</option>
                                {locations.map((l: any) => (
                                    <option key={l.id} value={l.id}>
                                        [{l.type}] {l.code}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="label-text">จำนวน (Qty)</label>
                            <div className="relative">
                                <input 
                                    type="number" required min="1"
                                    className="input-field w-full text-2xl font-bold text-indigo-600 pl-4 pr-12"
                                    value={formData.quantity}
                                    onChange={e => setFormData({...formData, quantity: e.target.value})}
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                                    {isNewProduct ? newProductData.uom : 'Units'}
                                </span>
                            </div>
                        </div>
                     </div>
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-2 active:scale-95"
                >
                    {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                    {isNewProduct ? 'สร้างและรับเข้าสต็อก' : 'บันทึกรับเข้า'}
                </button>
            </div>

         </div>
       </form>
    </div>
  );
}