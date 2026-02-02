'use client';

import { useState, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { createProduct, deleteProduct } from '@/actions/settings-actions';
import { downloadMasterTemplate, importMasterData } from '@/actions/bulk-import-actions';
import { Button } from '@/components/ui/button';
import {
  Trash2,
  Search,
  Save,
  Loader2,
  Tag,
  Download,
  FileSpreadsheet,
  AlertCircle,
} from 'lucide-react';
import { notify } from '@/lib/ui-helpers';
import { useGlobalLoading } from '@/components/providers/GlobalLoadingProvider';
import type { FormSchemaField } from '@/types/settings';

/** Extended FormSchemaField with optional label for display purposes. */
interface FormSchemaFieldWithLabel extends FormSchemaField {
  label?: string;
}

interface ProductManagerProps {
  products: any[];
  category: {
    id: string;
    name: string;
    form_schema?: FormSchemaFieldWithLabel[];
    units?: string[];
  };
}

export default function ProductManager({ products, category }: ProductManagerProps) {
  const { setIsLoading } = useGlobalLoading();
  const [loading, setLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

  if (!category) {
    return (
      <div className="p-8 text-center text-rose-500 bg-rose-50 rounded-xl border border-rose-100 flex items-center justify-center gap-2">
        <AlertCircle /> Error: Missing Category Context
      </div>
    );
  }

  const [searchTerm, setSearchTerm] = useState('');

  const filtered = products.filter(
    (p) =>
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const productSchema = (category.form_schema || []).filter(
    (f: FormSchemaFieldWithLabel) => !f.scope || f.scope === 'PRODUCT',
  );

  // Virtualization setup
  const parentRef = useRef<HTMLDivElement>(null);
  const ROW_HEIGHT = 60; // Approximate row height in pixels

  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  });

  // ✅ NEW LOGIC: ฟังก์ชันแปลง Key (field_xxx) -> Label (ทะเบียน)
  const getAttrLabel = (key: string) => {
    const field = (category.form_schema || []).find((f: FormSchemaFieldWithLabel) => f.key === key);
    return field?.label ?? key; // ถ้าเจอให้ใช้ Label, ถ้าไม่เจอใช้ Key เดิม
  };

  async function handleCreate(formData: FormData) {
    setIsLoading(true);
    setLoading(true);
    try {
      formData.append('category_id', category.id);

      const res = await createProduct(formData);
      setLoading(false);
      notify.ok(res);
      if (res.success) (document.getElementById('create-product-form') as HTMLFormElement).reset();
    } finally {
      setIsLoading(false);
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('ยืนยันลบสินค้า?')) return;
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('id', id);
      const res = await deleteProduct(formData);
      notify.ok(res);
    } finally {
      setIsLoading(false);
    }
  }

  const handleDownload = async () => {
    setImportLoading(true);
    setIsLoading(true);
    try {
      const res = await downloadMasterTemplate('product', category.id);
      if (res && res.base64) {
        const link = document.createElement('a');
        link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${res.base64}`;
        link.download = res.fileName;
        link.click();
      }
    } finally {
      setImportLoading(false);
      setIsLoading(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm(`ยืนยัน Import สินค้าเข้าหมวด ${category.name}?`)) return;

    setImportLoading(true);
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('categoryId', category.id);

      const res = await importMasterData(formData, 'product');
      notify.ok(res);
      e.target.value = '';
    } finally {
      setImportLoading(false);
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Actions Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            รายชื่อสินค้าในระบบ ({filtered.length})
          </h3>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={importLoading}
            className="touch-manipulation active:scale-[0.98]"
          >
            <Download size={16} className="mr-2" /> Template ({category.name})
          </Button>
          <div className="relative">
            <input
              type="file"
              onChange={handleImport}
              className="absolute inset-0 opacity-0 cursor-pointer"
              accept=".xlsx"
              disabled={importLoading}
              title="Import Excel"
              aria-label="Import Excel"
            />
            <Button
              size="sm"
              disabled={importLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white touch-manipulation active:scale-[0.98]"
            >
              {importLoading ? (
                <Loader2 className="animate-spin mr-2" />
              ) : (
                <FileSpreadsheet size={16} className="mr-2" />
              )}
              Import Products
            </Button>
          </div>
        </div>
      </div>

      {/* Create Form */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in fade-in">
        <form
          id="create-product-form"
          action={handleCreate}
          className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end"
        >
          <div className="md:col-span-3">
            <label className="text-xs font-bold text-slate-500 mb-1 block">SKU *</label>
            <input
              name="sku"
              required
              placeholder="A001"
              className="w-full border border-slate-200 p-2.5 rounded-lg uppercase font-mono text-sm outline-none"
            />
          </div>
          <div className="md:col-span-6">
            <label className="text-xs font-bold text-slate-500 mb-1 block">ชื่อสินค้า *</label>
            <input
              name="name"
              required
              placeholder="ระบุชื่อสินค้า..."
              className="w-full border border-slate-200 p-2.5 rounded-lg text-sm outline-none"
            />
          </div>
          <div className="md:col-span-3">
            <label htmlFor="uom-select" className="text-xs font-bold text-slate-500 mb-1 block">
              หน่วยนับ
            </label>
            {category?.units && category.units.length > 0 ? (
              <select
                id="uom-select"
                name="uom"
                title="เลือกหน่วยนับสินค้า"
                className="w-full border border-slate-200 p-2.5 rounded-lg text-sm outline-none bg-white"
                defaultValue={category.units[0]}
              >
                {category.units.map((unit: string) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="uom-select"
                name="uom"
                placeholder="UNIT"
                defaultValue="UNIT"
                className="w-full border border-slate-200 p-2.5 rounded-lg text-sm outline-none uppercase"
              />
            )}
          </div>

          {productSchema.length > 0 && (
            <div className="md:col-span-12 bg-indigo-50/50 p-5 rounded-xl border border-indigo-100">
              <div className="text-xs font-bold text-indigo-700 mb-4 flex items-center gap-2">
                <Tag size={16} /> Spec (รายละเอียดคงที่)
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {productSchema.map((field: FormSchemaFieldWithLabel) => (
                  <div key={field.key}>
                    <label
                      htmlFor={field.key}
                      className="text-xs font-bold text-slate-600 mb-1.5 block"
                    >
                      {field.label}
                    </label>
                    <input
                      id={field.key}
                      name={field.key}
                      type={
                        field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'
                      }
                      className="w-full border border-indigo-200 p-2.5 rounded-lg text-sm bg-white outline-none focus:ring-2 ring-indigo-500/20"
                      placeholder={field.label}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="md:col-span-12 flex justify-end pt-2">
            <Button
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 min-w-[140px] shadow-lg shadow-indigo-200"
            >
              {loading ? (
                <Loader2 className="animate-spin mr-2" size={18} />
              ) : (
                <Save className="mr-2" size={18} />
              )}
              บันทึกสินค้า
            </Button>
          </div>
        </form>
      </div>

      {/* Product Table - Virtualized for performance */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm overflow-x-auto scroll-hint-horizontal">
        <div className="p-4 border-b bg-slate-50 flex items-center gap-2">
          <Search size={18} className="text-slate-400" />
          <input
            placeholder="ค้นหา SKU หรือ ชื่อสินค้า..."
            className="bg-transparent outline-none w-full text-sm"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Table Header (fixed) */}
        <div className="bg-slate-50 border-b shadow-sm text-slate-500 font-semibold text-sm">
          <div className="flex">
            <div className="p-4 w-32 flex-shrink-0">SKU</div>
            <div className="p-4 flex-1">สินค้า</div>
            <div className="p-4 flex-[2]">สเปค (Spec)</div>
            <div className="p-4 w-20 text-right flex-shrink-0">จัดการ</div>
          </div>
        </div>

        {/* Virtualized Table Body */}
        <div ref={parentRef} className="h-[500px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400">ยังไม่มีสินค้าในหมวดนี้</div>
          ) : (
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const p = filtered[virtualRow.index];
                return (
                  <div
                    key={p.id}
                    className="absolute top-0 left-0 w-full flex items-center border-b border-slate-100 hover:bg-slate-50 transition-colors group"
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <div className="p-4 w-32 flex-shrink-0 font-mono font-bold text-indigo-700 text-sm">
                      {p.sku}
                    </div>
                    <div className="p-4 flex-1 font-medium text-slate-800 text-sm truncate">
                      {p.name}
                    </div>
                    <div className="p-4 flex-[2]">
                      {p.attributes && Object.keys(p.attributes).length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(p.attributes).map(([key, val]) => (
                            <span
                              key={key}
                              className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded border border-indigo-100 font-medium"
                            >
                              {getAttrLabel(key)}:{' '}
                              <span className="text-slate-600 font-normal">{String(val)}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </div>
                    <div className="p-4 w-20 text-right flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        aria-label="Delete product"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
