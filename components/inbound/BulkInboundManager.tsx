'use client';

import { useState } from 'react';
import { downloadInboundTemplate, importInboundStock } from '@/actions/bulk-import-actions';
import { Button } from '@/components/ui/button';
import { FileDown, Upload, Loader2, AlertCircle, FileSpreadsheet, MapPin, Info } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  warehouseId: string;
  categories: any[];
  userId: string;
}

export default function BulkInboundManager({ warehouseId, categories, userId }: Props) {
  const [selectedCat, setSelectedCat] = useState('');
  const [loading, setLoading] = useState(false);

  // ✅ FIX: ปรับปรุงการรับค่าและสร้าง Link Download ให้เสถียรขึ้น
  const handleDownload = async () => {
    if (!selectedCat) return toast.error('กรุณาเลือกหมวดหมู่สินค้าก่อน');
    
    try {
        setLoading(true);
        const res = await downloadInboundTemplate(warehouseId, selectedCat);
        
        if (res && res.base64) {
            const link = document.createElement('a');
            link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${res.base64}`;
            link.download = res.fileName;
            document.body.appendChild(link); // Append to body for Firefox support
            link.click();
            document.body.removeChild(link);
            toast.success('ดาวน์โหลด Template สำเร็จ');
        } else {
            toast.error('ไม่สามารถสร้าง Template ได้');
        }
    } catch (error) {
        toast.error('เกิดข้อผิดพลาดในการดาวน์โหลด');
    } finally {
        setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCat) return;

    const catName = categories.find(c => c.id === selectedCat)?.name;
    if (!confirm(`ยืนยันนำเข้าสินค้าหมวด "${catName}"?`)) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('warehouseId', warehouseId);
    formData.append('categoryId', selectedCat);
    formData.append('userId', userId);

    const res = await importInboundStock(formData);
    setLoading(false);
    
    if (res.success) toast.success(res.message);
    else toast.error(res.message);
    e.target.value = '';
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 mb-8 shadow-sm">
       <div className="flex items-start gap-4 mb-6">
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
             <FileSpreadsheet size={28}/>
          </div>
          <div>
             <h3 className="font-bold text-slate-900 text-lg">Bulk Inbound (นำเข้าสินค้าจำนวนมาก)</h3>
             <p className="text-sm text-slate-500">
                ดาวน์โหลด Template เฉพาะหมวดหมู่ เพื่อกรอกข้อมูลสินค้าและ Attributes ให้ถูกต้อง
             </p>
          </div>
       </div>

       {/* ✅ ADDED: คำแนะนำเรื่อง Location */}
       <div className="mb-6 p-4 bg-blue-50/50 rounded-lg border border-blue-100 text-sm text-blue-800">
           <div className="flex items-center gap-2 font-bold mb-2 text-blue-900">
               <Info size={16}/> คำแนะนำการกรอกตำแหน่ง (Location)
           </div>
           <ul className="list-disc list-inside space-y-1 ml-1">
               <li>
                   <strong>คลังสินค้าระบบ 3D Grid:</strong> ต้องกรอกให้ครบ 3 ช่อง คือ <span className="font-mono bg-white px-1 rounded border">Lot</span>, <span className="font-mono bg-white px-1 rounded border">Cart</span>, และ <span className="font-mono bg-white px-1 rounded border">Level</span>
               </li>
               <li>
                   <strong>คลังสินค้าทั่วไป:</strong> กรอกเฉพาะช่อง <span className="font-mono bg-white px-1 rounded border">Location Code</span> (เช่น A-01-01)
               </li>
               <li className="text-blue-600 text-xs mt-1">
                   *ระบบเลือก Template ให้อัตโนมัติตามการตั้งค่าของคลังนี้
               </li>
           </ul>
       </div>

       <div className="flex flex-col md:flex-row gap-5 items-end">
          <div className="flex-1 w-full">
             <label className="text-xs font-bold text-slate-600 mb-1.5 block">1. เลือกหมวดหมู่สินค้า</label>
             <select 
                value={selectedCat}
                onChange={(e) => setSelectedCat(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                aria-label="เลือกหมวดหมู่สินค้า"
             >
                <option value="">-- กรุณาเลือกหมวดหมู่ --</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
             </select>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
             <Button 
                variant="outline" 
                disabled={!selectedCat || loading}
                onClick={handleDownload}
                className="flex-1 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 h-[46px]"
             >
                <FileDown size={16} className="mr-2 text-emerald-600"/> 2. โหลด Template
             </Button>

             <div className="relative flex-1">
                <input 
                    type="file" 
                    disabled={!selectedCat || loading}
                    onChange={handleUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    accept=".xlsx"
                    aria-label="อัปโหลดไฟล์ Excel"
                />
                <Button 
                    disabled={!selectedCat || loading}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white h-[46px]"
                >
                    {loading ? <Loader2 className="animate-spin mr-2"/> : <Upload size={16} className="mr-2"/>}
                    3. อัปโหลด Excel
                </Button>
             </div>
          </div>
       </div>
    </div>
  );
}