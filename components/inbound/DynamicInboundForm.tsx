'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { submitInbound } from '@/actions/inbound-actions';
import { Loader2, Save, Search, X, Package, MapPin } from 'lucide-react';

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
  
  // --- Search & Selection State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({
    locationId: '',
    quantity: '',
  });

  // Coordinates State
  const [lotInput, setLotInput] = useState('');
  const [cartInput, setCartInput] = useState('');
  const [levelInput, setLevelInput] = useState('');
  
  // Attributes
  const [attributes, setAttributes] = useState<Record<string, any>>({});

  // --- Logic: Filter Products ---
  const filteredProducts = products.filter((p: any) => 
    (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase()))
  ).slice(0, 8);

  // --- Logic: Handle Selection ---
  const selectExistingProduct = (product: any) => {
    setSelectedProduct(product);
    setSearchTerm(product.name); 
    setShowDropdown(false);
  };

  const resetSelection = () => {
    setSelectedProduct(null);
    setSearchTerm('');
  };

  // --- Logic: Coordinates Matcher ---
  // แปลง Lot/Cart/Level ให้เป็น Location ID
  useEffect(() => {
     if(lotInput && cartInput && levelInput) {
        const lotStr = lotInput.padStart(2, '0');
        const cartStr = cartInput.padStart(2, '0');
        const levelStr = levelInput.padStart(2, '0');
        
        // Format ต้องตรงกับที่ Database สร้าง: WH-Lxx-Cxx-LVxx
        // (สมมติว่า warehouseId หรือ code ของคลังถูกใช้เป็น Prefix)
        // **หมายเหตุ:** เช็ค pattern ให้ตรงกับข้อมูลจริงใน DB ของคุณ
        const targetCode = `${warehouseId}-L${lotStr}-C${cartStr}-LV${levelStr}`;

        const foundLoc = locations.find((l: any) => l.code === targetCode);
        setFormData(prev => ({ ...prev, locationId: foundLoc ? foundLoc.id : '' }));
     } else {
        setFormData(prev => ({ ...prev, locationId: '' }));
     }
  }, [lotInput, cartInput, levelInput, locations, warehouseId]);

  // --- Submit ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.locationId) return alert("❌ พิกัด Lot/Cart ไม่ถูกต้อง หรือไม่มีในระบบ");
    if (!selectedProduct) return alert("❌ กรุณาเลือกสินค้า");

    setLoading(true);
    
    const payload = {
        warehouseId,
        locationId: formData.locationId,
        quantity: formData.quantity,
        isNewProduct: false, // บังคับ False เสมอ
        productId: selectedProduct?.id,
        newProductData: undefined, 
        attributes
    };

    const result = await submitInbound(payload);
    
    if (result.success) {
        if(confirm("✅ บันทึกรับเข้าสำเร็จ! ต้องการรับสินค้าชิ้นต่อไปหรือไม่?")) {
            // Reset Form เพื่อทำรายการต่อ
            setFormData(prev => ({ ...prev, quantity: '' }));
            resetSelection();
            // (Optional) ถ้าอยากให้ Reset พิกัดด้วย ให้ Uncomment บรรทัดล่าง
            // setLotInput(''); setCartInput(''); setLevelInput(''); 
            
            router.refresh();
        } else {
            router.push(`/dashboard/${warehouseId}/inventory`);
        }
    } else {
        alert("❌ Error: " + result.message);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
       
       {/* LEFT COLUMN: Product Selection */}
       <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 min-h-[400px]">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 text-lg border-b border-slate-100 pb-4">
                    <Package className="text-indigo-600" /> ข้อมูลสินค้า (Product)
                </h3>

                {/* 1. Search Box (สำหรับเลือกสินค้าเดิมเท่านั้น) */}
                {!selectedProduct ? (
                    <div className="relative">
                        <label htmlFor="product-search" className="block text-sm font-bold text-slate-500 mb-2">ค้นหาสินค้า</label>
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={24} />
                            <input 
                                id="product-search"
                                type="text"
                                className="w-full pl-14 pr-4 py-4 text-lg bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm"
                                placeholder="พิมพ์ชื่อสินค้า หรือ SKU..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setShowDropdown(true);
                                }}
                                onFocus={() => setShowDropdown(true)}
                                autoFocus
                            />
                        </div>

                        {/* Dropdown Results */}
                        {showDropdown && searchTerm && (
                            <div className="absolute z-10 w-full mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-top-2">
                                {filteredProducts.length > 0 ? (
                                    filteredProducts.map((p: any) => (
                                        <div 
                                            key={p.id}
                                            onClick={() => selectExistingProduct(p)}
                                            className="p-4 hover:bg-indigo-50 cursor-pointer border-b border-slate-50 flex justify-between items-center group transition-colors"
                                        >
                                            <div>
                                                <div className="font-bold text-slate-700 group-hover:text-indigo-700">{p.name}</div>
                                                <div className="text-xs text-slate-400 font-mono flex gap-2">
                                                    <span className="bg-slate-100 px-1 rounded">{p.sku}</span>
                                                    <span>• {p.uom}</span>
                                                </div>
                                            </div>
                                            <span className="text-xs bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full font-bold opacity-0 group-hover:opacity-100 transition-opacity">เลือก</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-4 text-center text-slate-400">
                                        ไม่พบสินค้า (กรุณาแจ้ง Admin หากต้องการเพิ่มสินค้าใหม่)
                                    </div>
                                )}
                            </div>
                        )}
                        
                        <div className="mt-8 text-center text-sm text-slate-400 bg-slate-50/50 p-4 rounded-xl border border-dashed border-slate-200">
                             พิมพ์เพื่อค้นหา และเลือกสินค้าจากรายการ <br/> *หากไม่พบสินค้า กรุณาติดต่อ Admin*
                        </div>
                    </div>
                ) : (
                    // 2. Selected State (แสดงข้อมูลสินค้าที่เลือก)
                    <div className="animate-in fade-in zoom-in-95">
                        <div className="flex justify-between items-start mb-6 bg-slate-50 p-2 rounded-xl border border-slate-200">
                            <div className="flex items-center gap-2 pl-2">
                                <span className="px-3 py-1 rounded-lg text-xs font-bold shadow-sm bg-indigo-500 text-white">
                                    📦 สินค้าเดิม
                                </span>
                            </div>
                            <button type="button" onClick={resetSelection} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="เลือกใหม่">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100 text-center">
                            <div className="text-2xl font-black text-slate-800 mb-1">{selectedProduct.name}</div>
                            <div className="inline-block bg-white px-3 py-1 rounded text-xs font-mono text-slate-500 shadow-sm border border-indigo-100">
                                SKU: {selectedProduct.sku}
                            </div>
                            <div className="mt-2 text-sm text-indigo-600 font-bold">
                                หน่วย: {selectedProduct.uom}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Dynamic Attributes (ถ้ามี) */}
            {category.form_schema && category.form_schema.length > 0 && selectedProduct && (
                <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 animate-in fade-in slide-in-from-bottom-2">
                    <h4 className="font-bold text-amber-700 mb-4 text-xs uppercase tracking-wider flex items-center gap-2">
                        ข้อมูลจำเพาะ ({category.name})
                    </h4>
                    <div className="grid grid-cols-1 gap-4">
                        {category.form_schema.map((field: any) => (
                            <div key={field.key}>
                                <label htmlFor={`attr-${field.key}`} className="block text-xs font-bold text-slate-500 mb-1.5">
                                    {field.label} {field.required && <span className="text-rose-500">*</span>}
                                </label>
                                <input 
                                    id={`attr-${field.key}`}
                                    type={field.type}
                                    required={field.required}
                                    className="w-full p-3 bg-white border border-amber-200 rounded-lg focus:ring-amber-500/20 outline-none"
                                    onChange={e => setAttributes({...attributes, [field.key]: e.target.value})}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
       </div>

       {/* RIGHT COLUMN: Location & Qty */}
       <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 h-fit relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -mr-10 -mt-10"></div>
                 <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 text-lg border-b border-slate-100 pb-4 relative z-10">
                    <MapPin className="text-rose-500" /> พิกัด & จำนวน
                 </h3>

                 {/* Coordinates Section */}
                <div className="flex gap-2 items-end mb-8 relative z-10">
                    <div className="flex-1">
                        <label htmlFor="coord-lot" className="block text-xs font-bold text-slate-400 text-center mb-2 uppercase">LOT (แถว)</label>
                        <input 
                            id="coord-lot"
                            type="number"
                            className="w-full text-center font-mono text-3xl font-black bg-slate-50 border-2 border-slate-100 rounded-xl focus:bg-white focus:border-indigo-500 outline-none h-20"
                            placeholder="--"
                            value={lotInput}
                            onChange={e => setLotInput(e.target.value)}
                        />
                    </div>
                    
                    <div className="text-slate-200 pb-6 font-black text-xl">-</div>

                    <div className="flex-1">
                        <label htmlFor="coord-cart" className="block text-xs font-bold text-slate-400 text-center mb-2 uppercase">CART (แคร่)</label>
                        <input 
                            id="coord-cart"
                            type="number"
                            className="w-full text-center font-mono text-3xl font-black bg-slate-50 border-2 border-slate-100 rounded-xl focus:bg-white focus:border-indigo-500 outline-none h-20"
                            placeholder="--"
                            value={cartInput}
                            onChange={e => setCartInput(e.target.value)}
                        />
                    </div>

                    <div className="text-slate-200 pb-6 font-black text-xl">-</div>

                    <div className="flex-1">
                        <label htmlFor="coord-level" className="block text-xs font-bold text-indigo-500 text-center mb-2 uppercase">ชั้น (Level)</label>
                        <input 
                            id="coord-level"
                            type="number"
                            className="w-full text-center font-mono text-3xl font-black bg-indigo-50 border-2 border-indigo-100 rounded-xl focus:bg-white focus:border-indigo-500 outline-none h-20 text-indigo-700"
                            placeholder="--"
                            value={levelInput}
                            onChange={e => setLevelInput(e.target.value)}
                        />
                    </div>
                </div>

                 {/* Status Feedback */}
                 {formData.locationId ? (
                     <div className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-xl text-sm font-bold text-center border border-emerald-100 mb-8 animate-in zoom-in-95 shadow-sm">
                         ✅ เจอพิกัด: {locations.find((l:any) => l.id === formData.locationId)?.code}
                     </div>
                 ) : (lotInput || cartInput) ? (
                     <div className="bg-rose-50 text-rose-600 px-4 py-3 rounded-xl text-sm font-bold text-center border border-rose-100 mb-8 animate-in shake shadow-sm">
                         ❌ ไม่พบพิกัดนี้ในคลัง
                     </div>
                 ) : null}

                 {/* Quantity */}
                 <div>
                    <label htmlFor="inbound-qty" className="block text-sm font-bold text-slate-700 mb-2">จำนวนรับเข้า (Quantity)</label>
                    <div className="relative">
                        <input 
                            id="inbound-qty"
                            type="number" required min="1"
                            className="w-full text-4xl font-black text-slate-900 pl-6 pr-24 py-6 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                            placeholder="0"
                            value={formData.quantity}
                            onChange={e => setFormData({...formData, quantity: e.target.value})}
                        />
                        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm text-sm uppercase tracking-wide">
                            {selectedProduct?.uom || 'UNIT'}
                        </span>
                    </div>
                 </div>
            </div>

            <button 
                type="submit" 
                disabled={loading || !formData.locationId || !selectedProduct}
                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-bold text-xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
                {loading ? <Loader2 className="animate-spin" /> : <Save size={24} className="group-hover:scale-110 transition-transform" />}
                <span>บันทึกรับเข้า</span>
            </button>
       </div>
    </form>
  );
}