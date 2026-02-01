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
        <h1 className="text-2xl font-black text-slate-800 mb-4 flex items-center gap-2">
          {activeTab === 'INTERNAL' ? (
            <ArrowRightLeft className="text-orange-500" />
          ) : (
            <Building2 className="text-indigo-500" />
          )}
          {activeTab === 'INTERNAL' ? 'Internal Transfer' : 'Cross-Warehouse'}
        </h1>

        <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => {
              setActiveTab('INTERNAL');
              setSelectedStock(null);
            }}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'INTERNAL'
                ? 'bg-white text-orange-600 shadow-sm'
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
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'CROSS'
                ? 'bg-white text-indigo-600 shadow-sm'
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
