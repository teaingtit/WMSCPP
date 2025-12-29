'use client';

import { useState } from 'react';
import { createProduct, deleteProduct } from '@/actions/settings-actions';
import { Button } from '@/components/ui/button';
import { Package, Trash2, Search, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function ProductManager({ products, categories }: { products: any[], categories: any[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  const filtered = products.filter(p => 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  async function handleCreate(formData: FormData) {
    setLoading(true);
    const res = await createProduct(formData);
    setLoading(false);
    if (res.success) {
        toast.success(res.message);
        (document.getElementById('create-product-form') as HTMLFormElement).reset();
    } else {
        toast.error(res.message);
    }
  }

  async function handleDelete(id: string) {
    if(!confirm('ยืนยันลบสินค้า?')) return;
    const formData = new FormData();
    formData.append('id', id);
    const res = await deleteProduct(formData);
    if (res.success) toast.success(res.message);
    else toast.error(res.message);
  }

  return (
    <div className="space-y-6">
      {/* Form สร้างสินค้า */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Plus size={18} className="text-indigo-600"/> สร้างสินค้าใหม่ (Master SKU)
        </h3>
        
        <form id="create-product-form" action={handleCreate} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            
            {/* 1. SKU Input */}
            <div className="md:col-span-1">
                {/* ✅ เพิ่ม htmlFor */}
                <label htmlFor="prod-sku" className="text-xs font-bold text-slate-500">SKU *</label>
                {/* ✅ เพิ่ม id ให้ตรงกับ htmlFor */}
                <input 
                    id="prod-sku" 
                    name="sku" 
                    required 
                    placeholder="A001" 
                    className="w-full border p-2 rounded uppercase font-mono" 
                />
            </div>

            {/* 2. Name Input */}
            <div className="md:col-span-2">
                <label htmlFor="prod-name" className="text-xs font-bold text-slate-500">ชื่อสินค้า *</label>
                <input 
                    id="prod-name" 
                    name="name" 
                    required 
                    placeholder="Product Name" 
                    className="w-full border p-2 rounded" 
                />
            </div>

            {/* 3. Category Select (จุดที่ Error แจ้งเตือน) */}
            <div className="md:col-span-1">
                <label htmlFor="prod-category" className="text-xs font-bold text-slate-500">หมวดหมู่</label>
                <select 
                    id="prod-category" 
                    name="category_id" 
                    className="w-full border p-2 rounded bg-white"
                    defaultValue="" // Set default value
                    aria-label="เลือกหมวดหมู่สินค้า" // เพิ่ม aria-label เสริมความชัวร์
                >
                    <option value="" disabled>-- เลือก --</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>

            {/* 4. UOM Select (จุดที่ Error แจ้งเตือน) */}
            <div className="md:col-span-1">
                <label htmlFor="prod-uom" className="text-xs font-bold text-slate-500">หน่วย</label>
                <select 
                    id="prod-uom" 
                    name="uom" 
                    className="w-full border p-2 rounded bg-white"
                    defaultValue="PCS"
                    aria-label="เลือกหน่วยนับ"
                >
                    <option value="PCS">ชิ้น (PCS)</option>
                    <option value="BOX">กล่อง (BOX)</option>
                    <option value="KG">กก. (KG)</option>
                </select>
            </div>

            <div className="md:col-span-1">
                <Button disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700">
                    {loading ? '...' : 'เพิ่ม'}
                </Button>
            </div>
        </form>
      </div>

      {/* Product List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b bg-slate-50 flex items-center gap-2">
            <Search size={18} className="text-slate-400"/>
            {/* Search Input ก็ควรมี Label หรือ Aria-label */}
            <input 
                aria-label="ค้นหาสินค้า"
                placeholder="ค้นหา SKU หรือ ชื่อสินค้า..." 
                className="bg-transparent outline-none w-full"
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        
        {/* ... (Table ส่วนแสดงผลเหมือนเดิม) ... */}
        <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 sticky top-0 shadow-sm text-slate-500">
                    <tr>
                        <th className="p-3">SKU</th>
                        <th className="p-3">Name</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">UOM</th>
                        <th className="p-3 text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {filtered.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50">
                            <td className="p-3 font-mono font-bold text-indigo-700">{p.sku}</td>
                            <td className="p-3">{p.name}</td>
                            <td className="p-3 text-slate-500">{p.category?.name || '-'}</td>
                            <td className="p-3 text-slate-500">{p.uom}</td>
                            <td className="p-3 text-right">
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => handleDelete(p.id)} 
                                    className="text-red-500 hover:bg-red-50 h-8 w-8 p-0"
                                    aria-label={`ลบสินค้า ${p.sku}`} // เพิ่ม Label ให้ปุ่มลบด้วย
                                >
                                    <Trash2 size={16}/>
                                </Button>
                            </td>
                        </tr>
                    ))}
                    {filtered.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400">ไม่พบสินค้า</td></tr>}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}