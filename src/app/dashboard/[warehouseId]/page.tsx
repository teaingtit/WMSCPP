import { redirect } from 'next/navigation';

/**
 * Warehouse Dashboard - Now redirects to Inventory
 *
 * This page has been merged with the inventory page for a unified experience.
 * Users are automatically redirected to /dashboard/[warehouseId]/inventory
 */
export default async function WarehouseOverview({ params }: { params: { warehouseId: string } }) {
  // Redirect to unified inventory/dashboard page
  redirect(`/dashboard/${params.warehouseId}/inventory`);
}
