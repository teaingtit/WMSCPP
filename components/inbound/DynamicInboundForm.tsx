'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { submitInbound, getWarehouseLots, getCartsByLot, getLevelsByCart } from '@/actions/inbound-actions';
import { Loader2, Save, MapPin, Search, X, Package, CheckCircle2, Layers } from 'lucide-react';
import { toast } from 'sonner';
// 1. นำเข้า Type ที่ถูกต้อง
import { Product } from '@/types/inventory';

// 2. สร้าง Interface สำหรับ Schema ของหมวดหมู่ (Category Form Schema)
interface FormSchemaField {
  key: string;
  label: string;
  type: string;
  required: boolean;
  scope: 'LOT' | 'PRODUCT'; // Scope ที่ใช้แยก attributes
}

// Interface สำหรับ Category
interface Category {
  id: string;
  name: string;
  form_schema?: FormSchemaField[]; // อาจจะเป็น undefined ได้ถ้าไม่มี schema
  // เพิ่ม field อื่นๆ ของ Category ตามจริงถ้าจำเป็น
}

// Interface สำหรับ Location (ใช้อ้างอิงใน State)
interface LocationData {
  id: string;
  level: string;
  code: string;
  type?: string;
}

// 3. ปรับ Props ให้เป็น Strict Type
interface DynamicInboundFormProps {
  warehouseId: string;
  category: Category;      // เปลี่ยนจาก any เป็น Category
  products: Product[];     // เปลี่ยนจาก any[] เป็น Product[]
}

export default function DynamicInboundForm({ 
  warehouseId, category, products 
}: DynamicInboundFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  // --- Product Logic ---
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  
  // 4. ระบุ Type ให้ State ของ Product (Product | null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Filter สินค้าโดย TypeScript จะรู้จัก properties .sku และ .name แล้ว
  const filteredProducts = products.filter((p) => 
    (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase()))
  ).slice(0, 8);

  // --- Attributes ---
  const [attributes, setAttributes] = useState<Record<string, any>>({});
  
  // ตรวจสอบว่ามี form_schema หรือไม่ ก่อน filter
  const lotSchema = category.form_schema 
      ? category.form_schema.filter((f) => f.scope === 'LOT')
      : [];

  // --- Coordinate Selector ---
  const [lots, setLots] = useState<string[]>([]);
  const [positions, setPositions] = useState<string[]>([]); 
  const [levels, setLevels] = useState<LocationData[]>([]); // ใช้ Type LocationData

  const [selectedLot, setSelectedLot] = useState('');
  const [selectedPos, setSelectedPos] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [loadingLocs, setLoadingLocs] = useState(false);

  const [quantity, setQuantity] = useState('');

  // 1. Init Lots
  useEffect(() => {
    const initLots = async () => {
        const res = await getWarehouseLots(warehouseId);
        setLots(res);
    };
    initLots();
  }, [warehouseId]);

  // 2. Lot -> Positions
  const handleLotChange = async (lot: string) => {
      setSelectedLot(lot);
      setSelectedPos('');
      setSelectedLocation(null);
      setPositions([]);
      
      if(lot) {
          setLoadingLocs(true);
          const res = await getCartsByLot(warehouseId, lot);
          setPositions(res);
          setLoadingLocs(false);
      }
  };

  // 3. Position -> Levels
  const handlePosChange = async (pos: string) => {
      setSelectedPos(pos);
      setSelectedLocation(null);
      setLevels([]);

      if(pos && selectedLot) {
          setLoadingLocs(true);
          const res = await getLevelsByCart(warehouseId, selectedLot, pos);
          // Cast response ให้ตรงกับ LocationData หากจำเป็น หรือให้แน่ใจว่า backend ส่งมาตรง
          setLevels(res as LocationData[]); 
          setLoadingLocs(false);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocation?.id) return toast.error("❌ กรุณาระบุพิกัดให้ครบถ้วน");
    if (!selectedProduct) return toast.error("❌ กรุณาเลือกสินค้า");

    setSubmitting(true);
    const payload = {
        warehouseId,
        locationId: selectedLocation.id,
        quantity: Number(quantity), // แปลงเป็น number เพื่อความชัวร์
        isNewProduct: false,
        productId: selectedProduct.id, // TypeScript มั่นใจว่ามีค่า เพราะ check !selectedProduct แล้ว
        attributes
    };

    const result = await submitInbound(payload);
    if (result.success) {
        toast.success(result.message);
        setQuantity('');
        setAttributes({});
        setSelectedLocation(null);
        setSelectedPos('');
        // Optional: Reset Product selection
        // setSelectedProduct(null);
        // setSearchTerm('');
    } else {
        toast.error(result.message);
    }
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
       {/* Left Column: Product */}
       <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 min-h-[300px]">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 text-lg border-b border-slate-100 pb-4">
                    <Package className="text-indigo-600" /> ข้อมูลสินค้า (Product)
                </h3>

                {!selectedProduct ? (
                    <div className="relative">
                        <label htmlFor="product-search" className="sr-only">ค้นหาสินค้า</label>
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                            id="product-search"
                            type="text"
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                            placeholder="ค้นหาชื่อ หรือ Scan SKU..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); }}
                            onFocus={() => setShowDropdown(true)}
                            autoComplete="off"
                        />
                         {showDropdown && searchTerm && (
                            <div className="absolute z-10 w-full mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden max-h-[300px] overflow-y-auto">
                                {filteredProducts.map((p) => (
                                    <div key={p.id} onClick={() => { setSelectedProduct(p); setSearchTerm(p.name); setShowDropdown(false); }} className="p-3 hover:bg-indigo-50 cursor-pointer border-b border-slate-50">
                                        <div className="font-bold text-slate-700">{p.name}</div>
                                        <div className="text-xs text-slate-400">{p.sku}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                        <div>
                            <div className="font-bold text-indigo-900">{selectedProduct.name}</div>
                            <div className="text-xs text-indigo-500">{selectedProduct.sku}</div>
                        </div>
                        <button 
                            type="button" 
                            onClick={() => setSelectedProduct(null)} 
                            className="p-2 hover:bg-indigo-100 rounded-full text-indigo-600"
                            aria-label="ยกเลิกการเลือกสินค้า"
                            title="ยกเลิกการเลือกสินค้า"
                        >
                            <X size={18} />
                        </button>
                    </div>
                )}
            </div>

            {/* Render Dynamic Attributes based on Schema */}
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
                                />
                            </div>
                        ))}
                     </div>
                </div>
            )}
       </div>

       {/* Right Column: Location */}
       <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 text-lg border-b border-slate-100 pb-4">
                    <MapPin className="text-indigo-600" /> ระบุพิกัด (Coordinates)
                </h3>
                
                <div className="flex flex-col gap-4">
                    {/* Step 1: LOT */}
                    <div className="grid grid-cols-3 items-center gap-4">
                        <label htmlFor="lot-select" className="font-bold text-slate-500 text-right">LOT (โซน)</label>
                        <select 
                            id="lot-select" 
                            className="col-span-2 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-lg outline-none focus:ring-2 ring-indigo-500/20 cursor-pointer"
                            value={selectedLot}
                            onChange={(e) => handleLotChange(e.target.value)}
                        >
                            <option value="">-- เลือก Lot --</option>
                            {lots.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                    </div>

                    {/* Step 2: POSITION */}
                    <div className={`grid grid-cols-3 items-center gap-4 transition-all duration-300 ${!selectedLot ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                        <label htmlFor="pos-select" className="font-bold text-slate-500 text-right">POSITION (ตำแหน่ง)</label>
                        <select 
                            id="pos-select"
                            className="col-span-2 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-lg outline-none focus:ring-2 ring-indigo-500/20 cursor-pointer"
                            value={selectedPos}
                            onChange={(e) => handlePosChange(e.target.value)}
                            disabled={!selectedLot}
                        >
                            <option value="">-- เลือก Position --</option>
                            {positions.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    {/* Step 3: LEVEL */}
                    <div className={`mt-4 transition-all duration-300 ${!selectedPos ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                        <div className="block text-center text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">เลือกชั้น (Level)</div>
                        {loadingLocs ? (
                             <div className="flex justify-center p-6"><Loader2 className="animate-spin text-indigo-500" size={30}/></div>
                        ) : (
                            <div className="grid grid-cols-4 gap-3">
                                {levels.map((loc) => (
                                    <button
                                        key={loc.id}
                                        type="button"
                                        onClick={() => setSelectedLocation(loc)}
                                        className={`py-4 rounded-xl border-2 font-black text-xl transition-all flex flex-col items-center justify-center relative
                                            ${selectedLocation?.id === loc.id 
                                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-lg scale-105 ring-2 ring-emerald-500/20' 
                                                : 'border-slate-100 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'
                                            }
                                        `}
                                    >
                                        {loc.level}
                                        {selectedLocation?.id === loc.id && (
                                            <div className="absolute top-1 right-1 text-emerald-500"><CheckCircle2 size={16}/></div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                         {levels.length === 0 && selectedPos && !loadingLocs && (
                            <div className="text-center text-rose-500 text-sm mt-4 p-2 bg-rose-50 rounded-lg border border-rose-100">
                                ❌ ไม่พบชั้นวางในพิกัดนี้
                            </div>
                        )}
                    </div>
                </div>

                {selectedLocation && (
                    <div className="mt-6 p-4 bg-slate-900 text-white rounded-2xl flex justify-between items-center shadow-lg animate-in slide-in-from-bottom-2">
                        <div>
                            <div className="text-xs text-slate-400 font-bold uppercase">Target Location</div>
                            <div className="text-xl font-bold font-mono tracking-wider">
                                {selectedLot}-{selectedPos}-{selectedLocation.level}
                            </div>
                        </div>
                        <div className="text-right">
                             <div className="text-xs text-emerald-400 font-bold flex items-center gap-1 justify-end"><CheckCircle2 size={12}/> READY</div>
                             <div className="text-[10px] text-slate-500 font-mono">{selectedLocation.code}</div>
                        </div>
                    </div>
                )}
            </div>

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
                        {/* ใช้ Optional Chaining (?.) ได้อย่างปลอดภัย */}
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