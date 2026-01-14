'use client';

import { useState, useEffect } from 'react';
import { useFormState } from 'react-dom';
import { deleteCategory } from '@/actions/settings-actions';
import { downloadMasterTemplate, importMasterData } from '@/actions/bulk-import-actions';
import { Trash2, Download, Upload, Loader2, Package, ArrowLeft } from 'lucide-react';
import { SubmitButton } from '@/components/SubmitButton';
import ProductManager from './ProductManager';
import { wrapFormAction, notify } from '@/lib/ui-helpers';
import { Button } from '@/components/ui/button';

interface Category {
  id: string;
  name: string;
  form_schema?: any;
}

const deleteCategoryWrapper = wrapFormAction(deleteCategory);

export default function CategoryManager({
  categories,
  products,
}: {
  categories: Category[];
  products: any[];
}) {
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteState, deleteAction] = useFormState(deleteCategoryWrapper, {
    success: false,
    message: '',
  });

  const handleDownload = async () => {
    setLoading(true);
    const res = await downloadMasterTemplate('category');
    if (res?.base64) {
      const link = document.createElement('a');
      link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${res.base64}`;
      link.download = res.fileName;
      link.click();
    }
    setLoading(false);
  };

  useEffect(() => {
    if (deleteState.message) {
      notify.ok(deleteState);
    }
  }, [deleteState]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    const res = await importMasterData(formData, 'category');
    setLoading(false);
    notify.ok(res);
    e.target.value = '';
  };

  // VIEW 1: PRODUCT MANAGER (หน้ารายละเอียดสินค้าในหมวดหมู่)
  if (activeCategory) {
    return (
      <div className="space-y-6 animate-in slide-in-from-right-4">
        <Button
          variant="ghost"
          onClick={() => setActiveCategory(null)}
          className="text-slate-500 hover:text-slate-800 font-bold text-sm"
        >
          <ArrowLeft size={16} className="mr-2" /> กลับไปหน้าหมวดหมู่
        </Button>

        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-center gap-3 shadow-sm">
          <div className="p-2.5 bg-indigo-600 text-white rounded-lg shadow-sm">
            <Package size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-indigo-900">
              ทะเบียนสินค้า: {activeCategory.name}
            </h2>
            <div className="flex items-center gap-3 text-sm text-indigo-600 mt-0.5">
              <span className="bg-white/50 px-2 py-0.5 rounded border border-indigo-100">
                ID: {activeCategory.id}
              </span>
            </div>
          </div>
        </div>

        <ProductManager
          products={products.filter((p) => p.category_id === activeCategory.id)}
          category={activeCategory}
        />
      </div>
    );
  }

  // VIEW 2: CATEGORY LIST (หน้าหลักหมวดหมู่)
  return (
    <div className="space-y-8">
      {/* Header & Tools */}
      <div className="flex justify-between items-end border-b border-slate-100 pb-4">
        <div>
          <h3 className="font-bold text-slate-800">จัดการหมวดหมู่สินค้า</h3>
          <p className="text-xs text-slate-500">กำหนดโครงสร้าง (Structure)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={loading}>
            <Download size={14} className="mr-2" /> เทมเพลต
          </Button>
          <div className="relative">
            <input
              type="file"
              onChange={handleImport}
              disabled={loading}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              accept=".xlsx"
              title="นำเข้าหมวดหมู่จาก Excel"
              aria-label="นำเข้าหมวดหมู่จาก Excel"
            />
            <Button
              size="sm"
              disabled={loading}
              className="bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100"
              aria-hidden="true" // The input is the interactive element
            >
              {loading ? (
                <Loader2 size={14} className="animate-spin mr-2" />
              ) : (
                <Upload size={14} className="mr-2" />
              )}
              นำเข้า
            </Button>
          </div>
        </div>
      </div>

      {/* ✅ ADDED: Info Guide Section (ส่วนที่หายไป) */}
      <div className="grid grid-cols-1 gap-3 pt-6 border-t border-slate-100">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="flex justify-between items-center p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-indigo-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 font-bold border border-indigo-100">
                {cat.id.substring(0, 2)}
              </div>
              <div>
                <div className="font-bold text-slate-800 text-lg group-hover:text-indigo-700 transition-colors">
                  {cat.name}
                </div>
                <div className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-3">
                  <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    ID: {cat.id}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* ปุ่มเปิดหน้าทะเบียนสินค้า */}
              <button
                onClick={() => setActiveCategory(cat)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 shadow-sm hover:shadow transition-all"
              >
                <Package size={16} /> ทะเบียนสินค้า
              </button>

              <div className="h-8 w-px bg-slate-200 mx-1"></div>

              {/* ปุ่มลบ */}
              <form
                action={deleteAction}
                onSubmit={(e) => {
                  if (
                    !confirm(
                      `คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่ "${cat.name}"?\nสินค้าทั้งหมดในหมวดหมู่นี้จะถูกลบไปด้วย และการกระทำนี้ไม่สามารถย้อนกลับได้`,
                    )
                  ) {
                    e.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="id" value={cat.id} />
                <SubmitButton
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title={`ลบหมวดหมู่ ${cat.name}`}
                >
                  <Trash2 size={18} />
                </SubmitButton>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
