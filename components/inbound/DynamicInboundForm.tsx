'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { submitInbound } from '@/actions/inbound-actions';
import { Loader2, Save, Search, X, Package, MapPin, Layers } from 'lucide-react';
import { toast } from 'sonner';

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
  
  // Search & Select
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // Form Data
  const [formData, setFormData] = useState({
    locationId: '',
    quantity: '',
  });

  // Coordinates
  const [lotInput, setLotInput] = useState('');
  const [cartInput, setCartInput] = useState('');
  const [levelInput, setLevelInput] = useState('');
  
  // Dynamic Attributes (LOT Scope Only)
  const [attributes, setAttributes] = useState<Record<string, any>>({});

  // ✅ FILTER: เอาเฉพาะที่เป็น Scope 'LOT'
  const lotSchema = category.form_schema 
      ? category.form_schema.filter((f: any) => f.scope === 'LOT')
      : [];

  const filteredProducts = products.filter((p: any) => 
    (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase()))
  ).slice(0, 8);

  // Select Product Handler
  const selectExistingProduct = (product: any) => {
    setSelectedProduct(product);
    setSearchTerm(product.name); 
    setShowDropdown(false);
  };

  const resetSelection = () => {
    setSelectedProduct(null);
    setSearchTerm('');
  };

  // Location Matcher Logic
  useEffect(() => {
     if(lotInput && cartInput && levelInput) {
        const lotStr = lotInput.padStart(2, '0');
        const cartStr = cartInput.padStart(2, '0');
        const levelStr = levelInput.padStart(2, '0');
        
        // Pattern: WH-Lxx-Cxx-LVxx (ต้องตรงกับ Database จริง)
        const targetCode = `${warehouseId}-L${lotStr}-C${cartStr}-LV${levelStr}`;

        const foundLoc = locations.find((l: any) => l.code === targetCode);
        setFormData(prev => ({ ...prev, locationId: foundLoc ? foundLoc.id : '' }));
     } else {
        setFormData(prev => ({ ...prev, locationId: '' }));
     }
  }, [lotInput, cartInput, levelInput, locations, warehouseId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.locationId) return toast.error("❌ พิกัด Lot/Cart ไม่ถูกต้อง หรือไม่มีในระบบ");
    if (!selectedProduct) return toast.error("❌ กรุณาเลือกสินค้า");

    setLoading(true);
    
    const payload = {
        warehouseId,
        locationId: formData.locationId,
        quantity: formData.quantity,
        isNewProduct: false,
        productId: selectedProduct?.id,
        newProductData: undefined, 
        attributes // ส่ง Lot Attributes ไปบันทึก
    };

    const result = await submitInbound(payload);
    
    if (result.success) {
        toast.success("บันทึกรับเข้าสำเร็จ!");
        if(confirm("ต้องการรับสินค้าชิ้นต่อไปหรือไม่?")) {
            setFormData(prev => ({ ...prev, quantity: '' }));
            setAttributes({}); // Reset Attributes
            resetSelection();
            router.refresh();
        } else {
            router.push(`/dashboard/${warehouseId}/inventory`);
        }
    } else {
        toast.error(result.message);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
       
       {/* LEFT COLUMN */}
       <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 min-h-[400px]">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 text-lg border-b border-slate-100 pb-4">
                    <Package className="text-indigo-600" /> ข้อมูลสินค้า (Product)
                </h3>

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
                                    <div className="p-4 text-center text-slate-400">ไม่พบสินค้า</div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="animate-in fade-in zoom-in-95">
                        <div className="flex justify-between items-start mb-6 bg-slate-50 p-2 rounded-xl border border-slate-200">
                            <div className="flex items-center gap-2 pl-2">
                                <span className="px-3 py-1 rounded-lg text-xs font-bold shadow-sm bg-indigo-500 text-white">📦 สินค้าเดิม</span>
                            </div>
                           <button 
    type="button" 
    onClick={resetSelection} 
    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
    aria-label="ยกเลิกการเลือกสินค้า"
    title="ยกเลิกการเลือกสินค้า"
>
    <X size={20} />
</button>
                        </div>
                        <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100 text-center">
                            <div className="text-2xl font-black text-slate-800 mb-1">{selectedProduct.name}</div>
                            <div className="inline-block bg-white px-3 py-1 rounded text-xs font-mono text-slate-500 shadow-sm border border-indigo-100">SKU: {selectedProduct.sku}</div>
                        </div>
                    </div>
                )}
            </div>

            {/* ✅ Dynamic Attributes (Lot Scope Only) */}
            {lotSchema.length > 0 && selectedProduct && (
                <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 animate-in fade-in slide-in-from-bottom-2 shadow-sm">
                    <h4 className="font-bold text-emerald-700 mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                        <Layers size={18}/> ข้อมูลล็อตสินค้า (Lot Data)
                    </h4>
                    <div className="grid grid-cols-1 gap-4">
                        {lotSchema.map((field: any) => (
                            <div key={field.key}>
                                <label htmlFor={`attr-${field.key}`} className="block text-xs font-bold text-emerald-800 mb-1.5">
                                    {field.label} {field.required && <span className="text-rose-500">*</span>}
                                </label>
                                <input 
                                    id={`attr-${field.key}`}
                                    name={field.key}
                                    type={field.type}
                                    required={field.required}
                                    className="w-full p-3 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                    onChange={e => setAttributes({...attributes, [field.key]: e.target.value})}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
       </div>

       {/* RIGHT COLUMN */}
       <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden">
                 <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 text-lg border-b border-slate-100 pb-4">
                    <MapPin className="text-rose-500" /> พิกัด & จำนวน
                 </h3>

                 {/* Coordinates */}
                <div className="flex gap-2 items-end mb-8">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-400 text-center mb-2 uppercase">LOT (แถว)</label>
                        <input type="number" className="w-full text-center font-mono text-3xl font-black bg-slate-50 border-2 border-slate-100 rounded-xl focus:bg-white focus:border-indigo-500 outline-none h-20" placeholder="--" value={lotInput} onChange={e => setLotInput(e.target.value)} />
                    </div>
                    <div className="text-slate-200 pb-6 font-black text-xl">-</div>
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-400 text-center mb-2 uppercase">CART (แคร่)</label>
                        <input type="number" className="w-full text-center font-mono text-3xl font-black bg-slate-50 border-2 border-slate-100 rounded-xl focus:bg-white focus:border-indigo-500 outline-none h-20" placeholder="--" value={cartInput} onChange={e => setCartInput(e.target.value)} />
                    </div>
                    <div className="text-slate-200 pb-6 font-black text-xl">-</div>
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-indigo-500 text-center mb-2 uppercase">ชั้น (Level)</label>
                        <input type="number" className="w-full text-center font-mono text-3xl font-black bg-indigo-50 border-2 border-indigo-100 rounded-xl focus:bg-white focus:border-indigo-500 outline-none h-20 text-indigo-700" placeholder="--" value={levelInput} onChange={e => setLevelInput(e.target.value)} />
                    </div>
                </div>

                 {/* Feedback */}
                 {formData.locationId ? (
                     <div className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-xl text-sm font-bold text-center border border-emerald-100 mb-8 animate-in zoom-in-95">
                         ✅ เจอพิกัด: {locations.find((l:any) => l.id === formData.locationId)?.code}
                     </div>
                 ) : (lotInput || cartInput) ? (
                     <div className="bg-rose-50 text-rose-600 px-4 py-3 rounded-xl text-sm font-bold text-center border border-rose-100 mb-8 animate-in shake">
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
                            className="w-full text-4xl font-black text-slate-900 pl-6 pr-24 py-6 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none"
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