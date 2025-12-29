'use client';

import { useState } from 'react';
import { createProduct, deleteProduct } from '@/actions/settings-actions';
import { Button } from '@/components/ui/button';
import { Trash2, Search, Plus, Save, Loader2, Tag, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface ProductManagerProps {
  products: any[];
  categories: any[];
}

export default function ProductManager({ products, categories }: ProductManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const filtered = products.filter(p => 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Logic: หา Schema และกรองเฉพาะ Scope = 'PRODUCT'
  const rawSchema = categories.find(c => c.id === selectedCategory)?.form_schema || [];
  const productSchema = rawSchema.filter((f: any) => !f.scope || f.scope === 'PRODUCT');

  async function handleCreate(formData: FormData) {
    setLoading(true);
    const res = await createProduct(formData);
    setLoading(false);
    
    if (res.success) {
        toast.success(res.message);
        (document.getElementById('create-product-form') as HTMLFormElement).reset();
        setSelectedCategory("");
    } else {
        toast.error(res.message);
    }
  }

  async function handleDelete(id: string) {
    if(!confirm('ยืนยันลบสินค้า? หากมีสต็อกคงเหลือจะไม่สามารถลบได้')) return;
    const formData = new FormData();
    formData.append('id', id);
    const res = await deleteProduct(formData);
    if (res.success) toast.success(res.message);
    else toast.error(res.message);
  }

  return (
    <div className="space-y-6">
      {/* --- Form สร้างสินค้า --- */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 pb-4 border-b border-slate-100">
            <Plus size={20} className="text-indigo-600"/> สร้างสินค้าใหม่ (Master SKU)
        </h3>
        
        <form id="create-product-form" action={handleCreate} className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
            
            {/* 1. SKU */}
            <div className="md:col-span-3">
                <label htmlFor="prod-sku" className="text-xs font-bold text-slate-500 mb-1.5 block">SKU *</label>
                <input 
                    id="prod-sku" name="sku" required placeholder="A001" 
                    className="w-full border border-slate-200 p-2.5 rounded-lg uppercase font-mono text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none" 
                />
            </div>

            {/* 2. Name */}
            <div className="md:col-span-5">
                <label htmlFor="prod-name" className="text-xs font-bold text-slate-500 mb-1.5 block">ชื่อสินค้า *</label>
                <input 
                    id="prod-name" name="name" required placeholder="ระบุชื่อสินค้า..." 
                    className="w-full border border-slate-200 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none" 
                />
            </div>

            {/* 3. Category */}
            <div className="md:col-span-2">
                <label htmlFor="prod-category" className="text-xs font-bold text-slate-500 mb-1.5 block">หมวดหมู่ *</label>
                <select 
                    id="prod-category" name="category_id" required
                    className="w-full border border-slate-200 p-2.5 rounded-lg bg-white text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none cursor-pointer"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                >
                    <option value="" disabled>-- เลือก --</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>

            {/* 4. UOM */}
            <div className="md:col-span-2">
                <label htmlFor="prod-uom" className="text-xs font-bold text-slate-500 mb-1.5 block">หน่วย *</label>
                <select id="prod-uom" name="uom" className="w-full border border-slate-200 p-2.5 rounded-lg bg-white text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none cursor-pointer">
                    <option value="PCS">ชิ้น (PCS)</option>
                    <option value="BOX">กล่อง (BOX)</option>
                    <option value="SET">ชุด (SET)</option>
                    <option value="KG">กิโลกรัม (KG)</option>
                </select>
            </div>

            {/* 5. Image URL */}
            <div className="md:col-span-12">
                 <label htmlFor="prod-image" className="text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-2">
                    <ImageIcon size={14}/> ลิงก์รูปภาพ (Image URL) 
                    <span className="text-slate-400 font-normal text-[10px]">(ไม่บังคับ)</span>
                 </label>
                 <input 
                    id="prod-image" name="image_url" 
                    placeholder="https://example.com/product.jpg" 
                    className="w-full border border-slate-200 p-2.5 rounded-lg text-sm text-slate-600 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none" 
                 />
            </div>

            {/* ✅ Dynamic Fields Area (Specific to Product Scope) */}
            {productSchema.length > 0 && (
              <div className="md:col-span-12 bg-indigo-50/50 p-5 rounded-xl border border-indigo-100 animate-in fade-in slide-in-from-top-2">
                 <div className="text-xs font-bold text-indigo-700 mb-4 flex items-center gap-2">
                    <Tag size={16}/> คุณสมบัติเฉพาะสินค้า ({categories.find(c => c.id === selectedCategory)?.name})
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {productSchema.map((field: any) => (
                        <div key={field.key}>
                           <label htmlFor={field.key} className="text-xs font-bold text-slate-600 mb-1.5 block">
                              {field.label} {field.required && <span className="text-rose-500">*</span>}
                           </label>
                           <input
                              id={field.key}
                              name={field.key}
                              type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                              required={field.required}
                              className="w-full border border-indigo-200 p-2.5 rounded-lg text-sm bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                              placeholder={field.label}
                           />
                        </div>
                    ))}
                 </div>
              </div>
            )}

            <div className="md:col-span-12 flex justify-end pt-2">
                <Button disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 min-w-[140px] shadow-lg shadow-indigo-200">
                    {loading ? <Loader2 className="animate-spin mr-2" size={18}/> : <Save className="mr-2" size={18}/>}
                    บันทึกข้อมูล
                </Button>
            </div>
        </form>
      </div>

      {/* --- Product Table (แสดงผล) --- */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b bg-slate-50 flex items-center gap-2">
            <Search size={18} className="text-slate-400"/>
            <input 
                aria-label="ค้นหาสินค้า"
                placeholder="ค้นหา SKU หรือ ชื่อสินค้า..." 
                className="bg-transparent outline-none w-full text-sm"
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        
        <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 sticky top-0 shadow-sm text-slate-500 font-semibold z-10">
                    <tr>
                        <th className="p-4 w-32">SKU</th>
                        <th className="p-4">สินค้า</th>
                        <th className="p-4 w-32">หมวดหมู่</th>
                        <th className="p-4">Spec</th>
                        <th className="p-4 text-right w-20">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filtered.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="p-4 font-mono font-bold text-indigo-700">{p.sku}</td>
                            <td className="p-4">
                                <div className="font-medium text-slate-800">{p.name}</div>
                                <div className="text-xs text-slate-400 mt-0.5">Unit: {p.uom}</div>
                            </td>
                            <td className="p-4">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                    {p.category?.name || 'General'}
                                </span>
                            </td>
                            <td className="p-4">
                                {p.attributes && Object.keys(p.attributes).length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                        {Object.entries(p.attributes).map(([key, val]) => (
                                            <span key={key} className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-1 rounded border border-indigo-100">
                                                {key}: {String(val)}
                                            </span>
                                        ))}
                                    </div>
                                ) : <span className="text-slate-300">-</span>}
                            </td>
                            <td className="p-4 text-right">
                                <button 
                                    type="button"
                                    onClick={() => handleDelete(p.id)} 
                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                    title="ลบสินค้า"
                                    aria-label={`ลบสินค้า ${p.sku}`}
                                >
                                    <Trash2 size={16}/>
                                </button>
                            </td>
                        </tr>
                    ))}
                    {filtered.length === 0 && <tr><td colSpan={5} className="p-12 text-center text-slate-400">ไม่พบข้อมูลสินค้า</td></tr>}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}