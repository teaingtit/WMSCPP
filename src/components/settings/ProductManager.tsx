'use client';

import { useState } from 'react';
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
interface ProductManagerProps {
  products: any[];
  category: any;
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
    (f: any) => !f.scope || f.scope === 'PRODUCT',
  );

  // ✅ NEW LOGIC: ฟังก์ชันแปลง Key (field_xxx) -> Label (ทะเบียน)
  const getAttrLabel = (key: string) => {
    const field = (category.form_schema || []).find((f: any) => f.key === key);
    return field ? field.label : key; // ถ้าเจอให้ใช้ Label, ถ้าไม่เจอใช้ Key เดิม
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
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={importLoading}>
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
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
                {productSchema.map((field: any) => (
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

      {/* Product Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b bg-slate-50 flex items-center gap-2">
          <Search size={18} className="text-slate-400" />
          <input
            placeholder="ค้นหา SKU หรือ ชื่อสินค้า..."
            className="bg-transparent outline-none w-full text-sm"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="max-h-[500px] overflow-y-auto">
          <table data-stack="true" className="w-full text-sm text-left">
            <thead className="bg-slate-50 sticky top-0 shadow-sm text-slate-500 font-semibold z-10">
              <tr>
                <th className="p-4 w-32">SKU</th>
                <th className="p-4">สินค้า</th>
                <th className="p-4">Spec</th>
                <th className="p-4 text-right w-20">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-4 font-mono font-bold text-indigo-700">{p.sku}</td>
                  <td className="p-4 font-medium text-slate-800">{p.name}</td>
                  <td className="p-4">
                    {p.attributes && Object.keys(p.attributes).length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {/* ✅ UPDATE: ใช้ฟังก์ชัน getAttrLabel เพื่อแสดงชื่อไทย แทน field_xxx */}
                        {Object.entries(p.attributes).map(([key, val]) => (
                          <span
                            key={key}
                            className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-1 rounded border border-indigo-100 font-medium"
                          >
                            {getAttrLabel(key)}:{' '}
                            <span className="text-slate-600 font-normal">{String(val)}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      aria-label="Delete product"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    ยังไม่มีสินค้าในหมวดนี้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
