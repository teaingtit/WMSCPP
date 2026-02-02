'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { ArrowRightLeft, Building2 } from 'lucide-react';
import { getWarehouses } from '@/actions/warehouse-actions';
import { useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import type { StockWithDetails, StockRowPrefill } from '@/types/inventory';

// Import 2 Components ใหม่
import TransferSourceSelector from '@/components/transfer/TransferSourceSelector';
import TransferTargetForm from '@/components/transfer/TransferTargetForm';

export default function TransferPage() {
  const params = useParams();
  const warehouseId = params['warehouseId'] as string;

  const [activeTab, setActiveTab] = useState<'INTERNAL' | 'CROSS'>('INTERNAL');
  const [selectedStock, setSelectedStock] = useState<StockWithDetails | null>(null);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const searchParams = useSearchParams();
  const [importedCount, setImportedCount] = useState<number>(0);
  const [prefilledStocks, setPrefilledStocks] = useState<StockWithDetails[] | null>(null);
  const [queuedFromSource, setQueuedFromSource] = useState<any[]>([]);

  // Track IDs of stocks already queued to filter from search results
  const queuedStockIds = useMemo(
    () => new Set(queuedFromSource.map((s) => s.id)),
    [queuedFromSource],
  );

  // Fetch Warehouses for Cross Tab
  useEffect(() => {
    let cancelled = false;
    getWarehouses().then((data) => {
      if (!cancelled) setWarehouses(data.filter((w) => w.id !== warehouseId));
    });
    return () => {
      cancelled = true;
    };
  }, [warehouseId]);

  // If user comes with ?ids=... from inventory bulk action, load the first stock as selected
  useEffect(() => {
    const idsParam = searchParams?.get('ids');
    const modeParam = searchParams?.get('mode');
    if (modeParam) {
      setActiveTab(modeParam === 'CROSS' ? 'CROSS' : 'INTERNAL');
    }
    if (!idsParam) return;
    const ids = idsParam.split(',').filter(Boolean);
    if (ids.length === 0) return;

    let cancelled = false;
    (async () => {
      try {
        const { data: stocks, error } = await supabaseBrowser
          .from('stocks')
          .select(
            `id, quantity, attributes, products!inner(id, sku, name, uom), locations!inner(id, code)`,
          )
          .in('id', ids)
          .limit(50);

        if (error) {
          console.error('Prefill Transfer Error:', error);
          return;
        }

        if (cancelled) return;
        if (stocks && stocks.length > 0) {
          const raw = stocks as StockRowPrefill[];
          const normalized: StockWithDetails[] = raw.map((s) => {
            const product = Array.isArray(s.products) ? s.products[0] : s.products;
            const location = Array.isArray(s.locations) ? s.locations[0] : s.locations;
            const loc = location as
              | { lot?: string | null; cart?: string | null; level?: string | null }
              | undefined;
            return {
              id: s.id!,
              quantity: s.quantity ?? 0,
              updated_at: '',
              ...s,
              product: product as StockWithDetails['product'],
              location: location as StockWithDetails['location'],
              name: (s as { name?: string }).name || product?.name || product?.sku || '',
              sku: product?.sku,
              lot: loc?.lot ?? null,
              cart: loc?.cart ?? null,
              level: loc?.level ?? null,
            } as StockWithDetails;
          });

          setSelectedStock(normalized[0] ?? null);
          setImportedCount(normalized.length);
          setPrefilledStocks(normalized);
        }
      } catch (err) {
        console.error('Failed to prefill transfer:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <div className="max-w-5xl mx-auto pb-20 px-4 sm:px-6">
      {importedCount > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-100 text-amber-800 font-medium">
          นำเข้าการเลือกจาก Inventory: <span className="font-black">{importedCount}</span> รายการ —
          เลือกสินค้าแล้วเพื่อระบุปลายทางหรือคลิกเปลี่ยนเพื่อตรวจสอบรายการอื่น
        </div>
      )}
      {/* 1. Header & Tabs */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
          {activeTab === 'INTERNAL' ? (
            <ArrowRightLeft className="text-orange-500" />
          ) : (
            <Building2 className="text-indigo-500" />
          )}
          {activeTab === 'INTERNAL'
            ? 'โอนย้ายภายใน (Internal)'
            : 'โอนย้ายข้ามคลัง (Cross-Warehouse)'}
        </h1>

        {/* 2.5D Flow Indicator (Mobile-First) */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-indigo-500" />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
            {/* Source */}
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0 border border-orange-100">
                <Building2 className="text-orange-600" size={24} />
              </div>
              <div>
                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">
                  From (ต้นทาง)
                </div>
                <div className="font-bold text-slate-800 text-lg">Current Warehouse</div>
                <div className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded inline-block mt-1">
                  {warehouseId}
                </div>
              </div>
            </div>

            {/* Connector */}
            <div className="hidden sm:flex flex-col items-center">
              <div className="w-full h-px bg-slate-200 w-32 relative">
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 border-t-2 border-r-2 border-slate-300 rotate-45" />
              </div>
            </div>
            {/* Mobile Connector */}
            <div className="sm:hidden text-slate-300">
              <ArrowRightLeft className="rotate-90" size={24} />
            </div>

            {/* Target */}
            <div className="flex items-center gap-4 w-full sm:w-auto justify-end text-right">
              <div>
                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">
                  To (ปลายทาง)
                </div>
                <div className="font-bold text-slate-800 text-lg">
                  {activeTab === 'INTERNAL' ? 'Current Warehouse' : 'Destination Warehouse'}
                </div>
                <div className="text-xs text-indigo-500 font-medium mt-1">
                  {activeTab === 'INTERNAL' ? 'ย้ายตำแหน่ง/สถานะ' : 'เลือกคลังปลายทาง'}
                </div>
              </div>
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                  activeTab === 'INTERNAL'
                    ? 'bg-orange-50 border-orange-100'
                    : 'bg-indigo-50 border-indigo-100'
                }`}
              >
                <Building2
                  className={activeTab === 'INTERNAL' ? 'text-orange-600' : 'text-indigo-600'}
                  size={24}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full sm:w-fit">
          <button
            onClick={() => {
              setActiveTab('INTERNAL');
              setSelectedStock(null);
            }}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'INTERNAL'
                ? 'bg-white text-orange-600 shadow-sm ring-1 ring-black/5'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Internal
          </button>
          <button
            onClick={() => {
              setActiveTab('CROSS');
              setSelectedStock(null);
            }}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'CROSS'
                ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Cross-Warehouse
          </button>
        </div>
      </div>

      {/* 2. Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Source Selector */}
        <TransferSourceSelector
          warehouseId={warehouseId}
          activeTab={activeTab}
          selectedStock={selectedStock}
          onSelect={setSelectedStock}
          queuedStockIds={queuedStockIds}
          onAddToQueue={(stock) => {
            if (!stock) return;
            setQueuedFromSource((prev) => {
              if (prev.find((s) => s.id === stock.id)) return prev;
              return [...prev, stock];
            });
            setSelectedStock(null);
          }}
        />

        {/* Right: Target Form */}
        <TransferTargetForm
          sourceStock={selectedStock}
          currentWarehouseId={warehouseId}
          activeTab={activeTab}
          warehouses={warehouses}
          prefilledStocks={prefilledStocks}
          incomingStocks={queuedFromSource}
          onConsumeIncoming={() => setQueuedFromSource([])}
        />
      </div>
    </div>
  );
}
