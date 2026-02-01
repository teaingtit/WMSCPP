// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock Next.js router with all required hooks
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/wh-001/inventory',
}));

// Mock dynamic imports to avoid SSR issues in tests
vi.mock('next/dynamic', () => ({
  default: (loader: () => Promise<any>) => {
    // Return a placeholder component for dynamic imports
    return function DynamicComponent(props: any) {
      return null;
    };
  },
}));

// Mock the UserProvider hook
vi.mock('@/components/providers/UserProvider', () => ({
  useUser: () => ({
    id: 'user-1',
    email: 'test@example.com',
    role: 'staff',
  }),
}));

// Mock the GlobalLoadingProvider hook
vi.mock('@/components/providers/GlobalLoadingProvider', () => ({
  useGlobalLoading: () => ({
    setLoading: vi.fn(),
    isLoading: false,
  }),
}));

// Mock status actions
vi.mock('@/actions/status-actions', () => ({
  getInventoryStatusData: vi.fn().mockResolvedValue({
    statuses: new Map(),
    noteCounts: new Map(),
  }),
  getLotStatuses: vi.fn().mockResolvedValue(new Map()),
}));

// Mock complex child components that have their own dependencies
vi.mock('@/components/ui/SearchInput', () => ({
  default: ({ placeholder }: { placeholder?: string }) => (
    <input placeholder={placeholder} data-testid="search-input" />
  ),
}));

vi.mock('@/components/inventory/ExportButton', () => ({
  default: () => <button data-testid="export-button">Export</button>,
}));

vi.mock('@/components/inventory/dashboard/StockLotSectionV2', () => ({
  StockLotSectionV2: ({ lot }: { lot: string }) => (
    <div data-testid={`lot-section-${lot}`}>{lot}</div>
  ),
}));

vi.mock('@/components/inventory/dashboard/BulkActionBar', () => ({
  BulkActionBar: () => <div data-testid="bulk-action-bar" />,
}));

vi.mock('@/components/inventory/CartDrawer', () => ({
  CartDrawer: () => null,
}));

vi.mock('@/components/ui/AnimatedList', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Import the component after mocks are set up
import InventoryDashboard from '@/components/inventory/InventoryDashboard';
import { StockWithDetails } from '@/types/inventory';

describe('InventoryDashboard', () => {
  const defaultProps = {
    stocks: [] as StockWithDetails[],
    warehouseId: 'wh-001',
    categories: [],
    warehouses: [{ id: 'wh-001', code: 'WH01', name: 'Warehouse 1' }],
    totalCount: 0,
    currentPage: 1,
    pageSize: 50,
    initialStatusData: {
      statuses: {},
      noteCounts: {},
      lotStatuses: {},
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Empty State', () => {
    it('should render empty state message when no stocks', () => {
      render(<InventoryDashboard {...defaultProps} />);

      expect(screen.getByText('ไม่พบรายการสินค้า')).toBeInTheDocument();
    });

    it('should render guidance text in empty state', () => {
      render(<InventoryDashboard {...defaultProps} />);

      expect(
        screen.getByText(/ยังไม่มีสต็อกในคลังนี้ — รับสินค้าเข้าจากเมนู Inbound/),
      ).toBeInTheDocument();
    });

    it('should render Inbound button in empty state', () => {
      render(<InventoryDashboard {...defaultProps} />);

      const inboundLink = screen.getByRole('link', { name: /รับสินค้าเข้า \(Inbound\)/i });
      expect(inboundLink).toBeInTheDocument();
      expect(inboundLink).toHaveAttribute('href', '/dashboard/wh-001/inbound');
    });

    it('should render Settings button in empty state', () => {
      render(<InventoryDashboard {...defaultProps} />);

      const settingsLink = screen.getByRole('link', { name: /ตั้งค่าระบบ/i });
      expect(settingsLink).toBeInTheDocument();
      expect(settingsLink).toHaveAttribute('href', '/dashboard/settings');
    });

    it('should not render empty state when stocks exist', () => {
      const stocksWithData: StockWithDetails[] = [
        {
          id: 'stock-1',
          quantity: 100,
          lot: 'A',
          cart: '01',
          level: 1,
          sku: 'SKU001',
          name: 'Test Product',
          product: { sku: 'SKU001', name: 'Test Product' },
          location: { lot: 'A', cart: '01', level: 1 },
        } as StockWithDetails,
      ];

      render(<InventoryDashboard {...defaultProps} stocks={stocksWithData} totalCount={1} />);

      expect(screen.queryByText('ไม่พบรายการสินค้า')).not.toBeInTheDocument();
    });
  });

  describe('Header', () => {
    it('should render page title', () => {
      render(<InventoryDashboard {...defaultProps} />);

      expect(screen.getByText(/จัดการสินค้าคงคลัง/)).toBeInTheDocument();
      expect(screen.getByText(/Inventory Management/)).toBeInTheDocument();
    });

    it('should render search input', () => {
      render(<InventoryDashboard {...defaultProps} />);

      expect(screen.getByPlaceholderText(/ค้นหา Lot, Position, Level, SKU/i)).toBeInTheDocument();
    });

    it('should render view description', () => {
      render(<InventoryDashboard {...defaultProps} />);

      expect(screen.getByText(/Lot, Position & Level/)).toBeInTheDocument();
    });
  });

  describe('With Stock Data', () => {
    const stocksWithData: StockWithDetails[] = [
      {
        id: 'stock-1',
        quantity: 100,
        lot: 'A',
        cart: '01',
        level: 1,
        sku: 'SKU001',
        name: 'Product 1',
        product: { sku: 'SKU001', name: 'Product 1' },
        location: { lot: 'A', cart: '01', level: 1 },
      } as StockWithDetails,
      {
        id: 'stock-2',
        quantity: 50,
        lot: 'A',
        cart: '02',
        level: 1,
        sku: 'SKU002',
        name: 'Product 2',
        product: { sku: 'SKU002', name: 'Product 2' },
        location: { lot: 'A', cart: '02', level: 1 },
      } as StockWithDetails,
      {
        id: 'stock-3',
        quantity: 75,
        lot: 'B',
        cart: '01',
        level: 2,
        sku: 'SKU003',
        name: 'Product 3',
        product: { sku: 'SKU003', name: 'Product 3' },
        location: { lot: 'B', cart: '01', level: 2 },
      } as StockWithDetails,
    ];

    it('should render lot sections when stocks exist', () => {
      render(<InventoryDashboard {...defaultProps} stocks={stocksWithData} totalCount={3} />);

      // The component groups stocks by lot
      // Lot names should appear in the rendered output
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('B')).toBeInTheDocument();
    });

    it('should show status count in subtitle when statuses exist', () => {
      const initialStatusData = {
        statuses: { 'stock-1': { status: { name: 'Hold' } } },
        noteCounts: { 'stock-1': 2 },
        lotStatuses: {},
      };

      render(
        <InventoryDashboard
          {...defaultProps}
          stocks={stocksWithData}
          totalCount={3}
          initialStatusData={initialStatusData}
        />,
      );

      expect(screen.getByText(/1 รายการที่มีสถานะ/)).toBeInTheDocument();
    });
  });

  describe('Categories and Form Schema', () => {
    it('should pass categories to selection provider', () => {
      const categories = [
        {
          id: 'cat-1',
          name: 'Electronics',
          form_schema: [
            { key: 'warranty', label: 'Warranty Period' },
            { key: 'serial', label: 'Serial Number' },
          ],
        },
      ];

      // This should not throw - categories are used by the selection provider
      expect(() => {
        render(<InventoryDashboard {...defaultProps} categories={categories} />);
      }).not.toThrow();
    });
  });
});
