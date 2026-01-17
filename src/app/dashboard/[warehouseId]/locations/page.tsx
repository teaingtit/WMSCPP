import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { MapPin, Info, Palette } from 'lucide-react';
import { LocationTreeView } from '@/components/locations/LocationTreeView';
import { CreateZoneForm } from '@/components/locations/CreateZoneForm';
import { CreateAisleForm } from '@/components/locations/CreateAisleForm';
import { CreateBinForm } from '@/components/locations/CreateBinForm';
import { getLocationTree } from '@/actions/location-actions';
import Link from 'next/link';

interface LocationManagerPageProps {
  params: { warehouseId: string };
}

export default async function LocationManagerPage({ params }: LocationManagerPageProps) {
  const { warehouseId } = params;
  const supabase = await createClient();

  // Get warehouse info
  const { data: warehouse } = await supabase
    .from('warehouses')
    .select('*')
    .eq('code', warehouseId)
    .single();

  if (!warehouse) {
    return <div>Warehouse not found</div>;
  }

  // Get all locations
  const locations = await getLocationTree(warehouseId);

  // Separate by depth
  const zones = locations.filter((l) => l.depth === 0);
  const aisles = locations.filter((l) => l.depth === 1);
  const bins = locations.filter((l) => l.depth === 2);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-100 rounded-xl">
                <MapPin size={24} className="text-indigo-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Location Management</h1>
                <p className="text-sm text-slate-500">{warehouse.name}</p>
              </div>
            </div>
            <Link
              href={`/dashboard/${warehouseId}/layout-designer`}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg font-medium text-sm"
            >
              <Palette size={16} />
              Visual Layout Designer
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
              <div className="text-2xl font-bold text-indigo-600">{zones.length}</div>
              <div className="text-xs text-indigo-700 font-medium">Zones</div>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
              <div className="text-2xl font-bold text-emerald-600">{aisles.length}</div>
              <div className="text-xs text-emerald-700 font-medium">Aisles</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
              <div className="text-2xl font-bold text-amber-600">{bins.length}</div>
              <div className="text-xs text-amber-700 font-medium">Bins</div>
            </div>
          </div>
        </div>

        {/* Info Alert */}
        {locations.length === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
            <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Get started with location management</p>
              <p className="text-blue-700">
                Create zones first, then add aisles within zones, and finally create bins within
                aisles. This hierarchical structure helps organize your warehouse efficiently.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Creation Forms */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
              <h2 className="text-lg font-bold text-slate-800 mb-4">Create Locations</h2>
              <div className="space-y-3">
                <CreateZoneForm warehouseId={warehouse.id} />
                <CreateAisleForm zones={zones} />
                <CreateBinForm aisles={aisles} />
              </div>
            </div>

            {/* Quick Guide */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <h3 className="text-sm font-bold text-slate-700 mb-2">Quick Guide</h3>
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex gap-2">
                  <span className="font-bold text-indigo-600">1.</span>
                  <span>
                    Create <strong>Zones</strong> (e.g., A, B, COLD)
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="font-bold text-emerald-600">2.</span>
                  <span>
                    Add <strong>Aisles</strong> within each zone (e.g., A1, A2)
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="font-bold text-amber-600">3.</span>
                  <span>
                    Create <strong>Bins</strong> in each aisle (e.g., L1, L2)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Location Tree */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
              <h2 className="text-lg font-bold text-slate-800 mb-4">Location Hierarchy</h2>
              <div className="max-h-[600px] overflow-y-auto pr-2">
                <LocationTreeView locations={locations} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
