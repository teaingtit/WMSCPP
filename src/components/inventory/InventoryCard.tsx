'use client';

import { MapPin, Calendar, Hash, Layers, Package, CheckCircle, Shield, Box } from 'lucide-react';
import { StockWithDetails } from '@/types/inventory';
import { formatAttributeValue } from '@/lib/utils';

interface InventoryCardProps {
  item: StockWithDetails;
  categoryFormSchemas?: Record<string, any[]>;
}

export default function InventoryCard({ item, categoryFormSchemas }: InventoryCardProps) {
  // Calculate quantity breakdown (basic card has no status context, so all is normal)
  const totalQuantity = item.quantity;
  const normalQuantity = totalQuantity;
  const affectedQuantity = 0;

  const hasAttributes = item.attributes && Object.keys(item.attributes).length > 0;

  // Helper: Get attribute label from schema (LOT scope)
  const getAttributeLabel = (key: string) => {
    const categoryId = item.product?.category_id || '';
    const schema = categoryFormSchemas?.[categoryId] || [];
    const field = schema.find((f) => f.key === key && f.scope === 'LOT');
    return field?.label || key;
  };

  return (
    <div className="group bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] active:shadow-md transition-all duration-200 relative overflow-hidden flex flex-col h-full cursor-pointer touch-manipulation select-none">
      {/* Decorative BG */}
      <div
        className={`absolute top-0 right-0 w-20 h-20 rounded-bl-full -mr-6 -mt-6 opacity-10 group-hover:opacity-20 transition-opacity ${
          item.product?.category_id === 'CHEMICAL' ? 'bg-amber-500' : 'bg-indigo-500'
        }`}
      ></div>

      {/* Header: Category & Location */}
      <div className="flex justify-between items-start mb-3 relative z-10">
        <span
          className={`text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider border ${
            item.product?.category_id === 'CHEMICAL'
              ? 'bg-amber-50 text-amber-700 border-amber-100'
              : 'bg-indigo-50 text-indigo-700 border-indigo-100'
          }`}
        >
          {item.product?.category_id || 'GEN'}
        </span>
        <div className="flex flex-col items-end gap-1">
          <span className="flex items-center gap-1 text-xs font-bold bg-slate-800 text-white px-2 py-1 rounded">
            <MapPin size={10} /> {item.location?.code || 'N/A'}
          </span>
          {item.level && (
            <span className="flex items-center gap-1 text-xs font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100">
              <Layers size={10} /> Lv.{item.level}
            </span>
          )}
        </div>
      </div>

      {/* Product Image */}
      <div className="mb-3 relative z-10">
        <div className="h-16 w-16 mx-auto rounded-xl bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.product?.name || 'Product'}
              className="h-full w-full object-cover"
            />
          ) : (
            <Package size={28} className="text-slate-300" />
          )}
        </div>
      </div>

      {/* Content: Name & SKU */}
      <div className="mb-3 relative z-10 flex-1">
        <h3 className="font-bold text-slate-800 text-base leading-snug mb-1 group-hover:text-indigo-600 transition-colors line-clamp-2 text-center">
          {item.product?.name || 'Unknown Product'}
        </h3>
        <div className="flex items-center justify-center gap-1 text-xs text-slate-400 font-mono mb-2">
          <Hash size={12} /> {item.product?.sku || '-'}
        </div>

        {/* LOT Attributes */}
        {hasAttributes && (
          <div className="flex flex-wrap gap-1 justify-center mt-2">
            {Object.entries(item.attributes || {})
              .slice(0, 3)
              .map(([key, value]) => (
                <span
                  key={key}
                  className="text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 font-medium"
                >
                  {getAttributeLabel(key)}:{' '}
                  <span className="font-bold">{formatAttributeValue(value)}</span>
                </span>
              ))}
            {Object.keys(item.attributes || {}).length > 3 && (
              <span className="text-xs text-slate-400 px-1 py-0.5">...</span>
            )}
          </div>
        )}
      </div>

      {/* Quantity Breakdown Section */}
      <div className="pt-3 border-t border-slate-100 relative z-10 mt-auto">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="font-bold uppercase tracking-wide flex items-center gap-1">
            <Box size={10} /> สถานะจำนวน
          </span>
          <span className="font-medium">{item.product?.uom}</span>
        </div>

        <div className="space-y-1.5">
          {/* Normal Quantity Row */}
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
            <div className="flex items-center gap-1.5">
              <CheckCircle size={12} className="text-emerald-500" />
              <span className="text-xs font-medium text-emerald-700">ปกติ</span>
            </div>
            <span className="text-sm font-bold text-emerald-700">
              {normalQuantity.toLocaleString()}
            </span>
          </div>

          {/* Affected Quantity Row */}
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-1.5">
              <Shield size={12} className="text-slate-300" />
              <span className="text-xs font-medium text-slate-400">ติดสถานะ</span>
            </div>
            <span className="text-sm font-bold text-slate-400">
              {affectedQuantity.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Total Row */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-dashed border-slate-200">
          <span className="text-xs font-bold text-slate-600">รวมทั้งหมด</span>
          <span className="text-xl font-black text-indigo-600">
            {totalQuantity.toLocaleString()}
          </span>
        </div>

        <div className="mt-2 text-xs text-slate-300 flex items-center gap-1 justify-end">
          <Calendar size={10} /> {new Date(item.updated_at).toLocaleDateString('th-TH')}
        </div>
      </div>
    </div>
  );
}
