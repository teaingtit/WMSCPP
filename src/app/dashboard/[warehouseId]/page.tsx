import { redirect } from 'next/navigation';

/**
 * Warehouse Dashboard - Now redirects to Inventory
 *
 * This page has been merged with the inventory page for a unified experience.
 * Users are automatically redirected to /dashboard/[warehouseId]/inventory
 */
export default async function WarehouseOverview({
  params,
}: {
  params: Promise<{ warehouseId: string }>;
}) {
  const { warehouseId } = await params;
  // Redirect to unified inventory/dashboard page
  redirect(`/dashboard/${warehouseId}/inventory`);
}
