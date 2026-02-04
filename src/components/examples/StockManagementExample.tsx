/**
 * Example: Stock Management Component
 *
 * This demonstrates how to use the new database-agnostic stock actions
 * in your UI components.
 */

'use client';

import { useState, useEffect } from 'react';
import {
  getAllProductsAction,
  updateStockAction,
  adjustStockAction,
  checkStockAvailabilityAction,
  getLowStockProductsAction,
} from '@/actions/stock-actions';
import type { Product } from '@/core';

export function StockManagementExample() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load products on mount
  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);
    setError(null);

    const result = await getAllProductsAction();

    if (result.success && result.data) {
      setProducts(result.data.products);
    } else {
      setError(result.message || 'Failed to load products');
    }

    setLoading(false);
  }

  // Example 1: Simple stock update
  async function handleUpdateStock(sku: string, newQty: number) {
    const result = await updateStockAction(sku, newQty);

    if (result.success) {
      alert(result.message); // "Stock updated successfully for SKU-001"
      loadProducts(); // Refresh list
    } else {
      alert(`Error: ${result.message}`);
    }
  }

  // Example 2: Stock adjustment with reason
  async function handleAdjustStock(sku: string, change: number, reason: string) {
    const result = await adjustStockAction({
      sku,
      qtyChange: change,
      reason,
      performedBy: 'current-user-id', // Get from auth context
    });

    if (result.success) {
      alert(result.message);
      loadProducts();
    } else {
      alert(`Error: ${result.message}`);
    }
  }

  // Example 3: Check availability before operation
  async function handleCheckAvailability(sku: string, requiredQty: number) {
    const result = await checkStockAvailabilityAction(sku, requiredQty);

    if (result.success && result.data?.available) {
      console.log('✅ Stock is available:', result.data.currentQty);
      // Proceed with operation
    } else {
      console.log('❌ Insufficient stock:', result.message);
      alert(result.message);
    }
  }

  // Example 4: Get low stock alerts
  async function handleGetLowStock() {
    const result = await getLowStockProductsAction(10); // threshold = 10

    if (result.success && result.data) {
      console.log(`Found ${result.data.count} low stock products:`, result.data.products);
      // Show alert or notification
    }
  }

  if (loading) return <div>Loading products...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="stock-management">
      <h1>Stock Management (Database-Agnostic)</h1>

      <button onClick={handleGetLowStock}>Check Low Stock</button>

      <table>
        <thead>
          <tr>
            <th>SKU</th>
            <th>Name</th>
            <th>Quantity</th>
            <th>Location</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.sku}>
              <td>{product.sku}</td>
              <td>{product.name}</td>
              <td>{product.qty}</td>
              <td>{product.location}</td>
              <td>
                <button onClick={() => handleUpdateStock(product.sku, product.qty + 10)}>
                  +10
                </button>
                <button onClick={() => handleAdjustStock(product.sku, -5, 'Damaged goods')}>
                  Adjust -5
                </button>
                <button onClick={() => handleCheckAvailability(product.sku, 50)}>
                  Check Availability
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
