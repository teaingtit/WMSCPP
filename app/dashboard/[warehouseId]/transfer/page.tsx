'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ArrowRightLeft, Building2 } from 'lucide-react';
import { getWarehouses } from '@/actions/warehouse-actions';

// Import 2 Components ใหม่
import TransferSourceSelector from '@/components/transfer/TransferSourceSelector';
import TransferTargetForm from '@/components/transfer/TransferTargetForm';

export default function TransferPage() {
  const params = useParams();
  const warehouseId = params.warehouseId as string;

  const [activeTab, setActiveTab] = useState<'INTERNAL' | 'CROSS'>('INTERNAL');
  const [selectedStock, setSelectedStock] = useState<any>(null);
  const [warehouses, setWarehouses] = useState<any[]>([]);

  // Fetch Warehouses for Cross Tab
  useEffect(() => {
    getWarehouses().then(data => 
        setWarehouses(data.filter(w => w.id !== warehouseId))
    );
  }, [warehouseId]);

  return (
    <div className="max-w-5xl mx-auto pb-20">
       {/* 1. Header & Tabs */}
       <div className="mb-8">
          <h1 className="text-2xl font-black text-slate-800 mb-4 flex items-center gap-2">
             {activeTab === 'INTERNAL' ? <ArrowRightLeft className="text-orange-500"/> : <Building2 className="text-indigo-500"/>}
             {activeTab === 'INTERNAL' ? 'Internal Transfer' : 'Cross-Warehouse'}
          </h1>
          
          <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
             <button 
                onClick={() => { setActiveTab('INTERNAL'); setSelectedStock(null); }}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'INTERNAL' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
                Internal
             </button>
             <button 
                onClick={() => { setActiveTab('CROSS'); setSelectedStock(null); }}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'CROSS' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
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
          />

          {/* Right: Target Form */}
          <TransferTargetForm 
             sourceStock={selectedStock}
             currentWarehouseId={warehouseId}
             activeTab={activeTab}
             warehouses={warehouses}
          />
       </div>
    </div>
  );
}