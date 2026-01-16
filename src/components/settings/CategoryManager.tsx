'use client';

import { useState, useEffect } from 'react';
import { useFormState } from 'react-dom';
import { deleteCategory } from '@/actions/settings-actions';
import { downloadMasterTemplate, importMasterData } from '@/actions/bulk-import-actions';
import {
  Trash2,
  Download,
  Upload,
  Loader2,
  Package,
  ArrowLeft,
  Plus,
  X,
  Edit,
  Layers,
} from 'lucide-react';
import { SubmitButton } from '@/components/SubmitButton';
import ProductManager from './ProductManager';
import CategoryForm from './CategoryForm';
import EditCategoryForm from './EditCategoryForm';
import BulkSchemaEditor from './BulkSchemaEditor';
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
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
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
          <h3 className="font-bold text-slate-800 text-lg">จัดการหมวดหมู่สินค้า</h3>
          <p className="text-sm text-slate-500">กำหนดโครงสร้างประเภทสินค้าและหน่วยนับ</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowBulkEdit(true)}
            variant="outline"
            size="sm"
            className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 hover:text-purple-800 hover:border-purple-300"
          >
            <Layers size={14} className="mr-2" />
            Bulk Edit
          </Button>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className={`${
              showAddForm
                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            } font-bold shadow-sm transition-all`}
            size="sm"
          >
            {showAddForm ? (
              <>
                <X size={16} className="mr-2" /> ยกเลิก
              </>
            ) : (
              <>
                <Plus size={16} className="mr-2" /> เพิ่มหมวดหมู่
              </>
            )}
          </Button>
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
              variant="outline"
              size="sm"
              disabled={loading}
              className="bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 shadow-sm"
              aria-hidden="true"
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

      {/* Add Form Section */}
      {showAddForm && (
        <div className="bg-slate-50/50 p-6 rounded-2xl border-2 border-dashed border-slate-200 animate-in fade-in zoom-in-95 duration-200">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-2 mb-6 text-indigo-600">
              <Plus size={20} strokeWidth={3} />
              <h4 className="font-black text-lg">สร้างหมวดหมู่สินค้าใหม่</h4>
            </div>
            <CategoryForm />
          </div>
        </div>
      )}

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
              {/* ปุ่มแก้ไข */}
              <button
                onClick={() => setEditingCategory(cat)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 shadow-sm hover:shadow transition-all"
              >
                <Edit size={16} /> แก้ไข
              </button>

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

      {/* Edit Category Modal */}
      {editingCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">
                แก้ไขหมวดหมู่: {editingCategory.name}
              </h2>
              <button
                onClick={() => setEditingCategory(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="ปิด"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <EditCategoryForm
                category={editingCategory}
                onClose={() => setEditingCategory(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Bulk Edit Modal */}
      {showBulkEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">แก้ไข Schema หลายหมวดหมู่</h2>
              <button
                onClick={() => setShowBulkEdit(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="ปิด"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <BulkSchemaEditor categories={categories} onClose={() => setShowBulkEdit(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
