import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock next/navigation useRouter and routing hooks before importing the component
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => ({}),
}));

// Mock transfer actions to avoid initializing Supabase admin client during tests
vi.mock('@/actions/transfer-actions', () => ({
  preflightBulkTransfer: vi.fn(async () => ({ results: [], summary: { total: 0, ok: 0 } })),
  submitBulkTransfer: vi.fn(async () => ({ success: true, details: { success: 0 }, message: '' })),
}));
// Mock LocationSelector to avoid server calls and provide a simple selector for tests
vi.mock('@/components/shared/LocationSelector', () => {
  const React = require('react');
  const Mock = ({ onSelect }: any) => {
    return React.createElement(
      'button',
      {
        onClick: () => onSelect({ id: 'test-loc', lot: 'L', cart: 'C', level: '1', code: 'LOC1' }),
      },
      'SelectLoc',
    );
  };
  return { __esModule: true, default: Mock };
});
import TransferTargetForm from '../TransferTargetForm';
import GlobalLoadingProvider from '@/components/providers/GlobalLoadingProvider';

describe('TransferTargetForm queue behavior', () => {
  beforeEach(() => {
    pushMock.mockClear();
  });

  it('prefills queue from prefilledStocks', async () => {
    const prefilled = [
      {
        id: 's1',
        name: 'Item 1',
        quantity: 5,
        product: { name: 'P' },
        location: { id: 'l1', code: 'L1' },
      },
    ];

    render(
      <GlobalLoadingProvider>
        <TransferTargetForm
          sourceStock={null}
          currentWarehouseId="w1"
          activeTab="INTERNAL"
          warehouses={[]}
          prefilledStocks={prefilled}
          incomingStocks={null}
        />
      </GlobalLoadingProvider>,
    );

    // Header showing queued count
    expect(await screen.findByText(/รายการรอโอนย้าย/i)).toBeTruthy();
    expect(screen.getByText(/รายการรอโอนย้าย \(1\)/)).toBeTruthy();
  });

  it('send to outbound navigates with ids', async () => {
    const prefilled = [
      {
        id: 's1',
        name: 'Item 1',
        quantity: 5,
        product: { name: 'P' },
        location: { id: 'l1', code: 'L1' },
      },
    ];

    render(
      <GlobalLoadingProvider>
        <TransferTargetForm
          sourceStock={null}
          currentWarehouseId="WID"
          activeTab="INTERNAL"
          warehouses={[]}
          prefilledStocks={prefilled}
          incomingStocks={null}
        />
      </GlobalLoadingProvider>,
    );

    const btn = screen.getByText('จ่ายออก');
    fireEvent.click(btn);
    expect(pushMock).toHaveBeenCalledWith('/dashboard/WID/outbound?ids=s1');
  });

  it('incomingStocks calls onConsumeIncoming and populates queue', async () => {
    const incoming = [
      {
        id: 's2',
        name: 'Item 2',
        quantity: 3,
        product: { name: 'P2' },
        location: { id: 'l2', code: 'L2' },
      },
    ];
    const onConsume = vi.fn();

    render(
      <GlobalLoadingProvider>
        <TransferTargetForm
          sourceStock={null}
          currentWarehouseId="w1"
          activeTab="INTERNAL"
          warehouses={[]}
          prefilledStocks={null}
          incomingStocks={incoming}
          onConsumeIncoming={onConsume}
        />
      </GlobalLoadingProvider>,
    );

    await waitFor(() => expect(onConsume).toHaveBeenCalled());
    expect(screen.getByText(/รายการรอโอนย้าย \(1\)/)).toBeTruthy();
  });

  it('preview-fail -> edit -> preview-pass -> submit succeeds', async () => {
    const transferActions = await import('@/actions/transfer-actions');

    // First preview returns failure for stock s3, second preview returns success
    (transferActions.preflightBulkTransfer as any)
      .mockImplementationOnce(async () => ({
        results: [{ stockId: 's3', ok: false, reason: 'not enough' }],
        summary: { total: 1, ok: 0 },
      }))
      .mockImplementationOnce(async () => ({
        results: [{ stockId: 's3', ok: true }],
        summary: { total: 1, ok: 1 },
      }));

    (transferActions.submitBulkTransfer as any).mockImplementation(async () => ({
      success: true,
      details: { success: 1 },
      message: '',
    }));

    const prefilled = [
      {
        id: 's3',
        name: 'Item 3',
        quantity: 1,
        product: { name: 'P3' },
        location: { id: 'l3', code: 'L3' },
      },
    ];

    render(
      <GlobalLoadingProvider>
        <TransferTargetForm
          sourceStock={null}
          currentWarehouseId="w1"
          activeTab="INTERNAL"
          warehouses={[]}
          prefilledStocks={prefilled}
          incomingStocks={null}
        />
      </GlobalLoadingProvider>,
    );

    // Run first preview (will fail)
    const previewBtn = screen.getByText(/ตรวจสอบ \(Preview\)/i);
    fireEvent.click(previewBtn);

    // Expect failure badge or reason to appear
    await waitFor(() => expect(screen.getByText(/not enough|ไม่ผ่าน/i)).toBeTruthy());

    // Click edit on the failed item
    const editBtn = screen.getByText('แก้ไข');
    fireEvent.click(editBtn);

    // Change qty in edit panel (set to 1) - pick the last numeric input (edit panel)
    const qtyInputs = await screen.findAllByRole('spinbutton');
    const qtyInput = qtyInputs[qtyInputs.length - 1];
    fireEvent.change(qtyInput, { target: { value: '1' } });

    // Select a target location in the edit panel (our mock renders a 'SelectLoc' button)
    const selectButtons = await screen.findAllByText('SelectLoc');
    const selectBtn = selectButtons[selectButtons.length - 1];
    fireEvent.click(selectBtn);

    // Save edit
    const saveBtn = screen.getByText('บันทึกการแก้ไข');
    fireEvent.click(saveBtn);

    // Re-run preview (will now pass)
    fireEvent.click(previewBtn);
    await waitFor(() => expect(screen.getByText(/ผลการตรวจสอบ: 1 \/ 1/i)).toBeTruthy());

    // Confirm all and submit
    const confirmAll = screen.getByText('ยืนยันการย้ายทั้งหมด');
    fireEvent.click(confirmAll);

    // Click confirm in modal
    const confirmBtn = await screen.findByText('ยืนยันการย้าย');
    fireEvent.click(confirmBtn);

    // Expect submit action to have been called
    await waitFor(() => expect(transferActions.submitBulkTransfer as any).toHaveBeenCalled());
  });
});
