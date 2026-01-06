import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import TransferTargetForm from '../src/components/transfer/TransferTargetForm';

// Mock next/navigation useRouter
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock, refresh: vi.fn() }) }));

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
      <TransferTargetForm
        sourceStock={null}
        currentWarehouseId="w1"
        activeTab="INTERNAL"
        warehouses={[]}
        prefilledStocks={prefilled}
        incomingStocks={null}
      />,
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
      <TransferTargetForm
        sourceStock={null}
        currentWarehouseId="WID"
        activeTab="INTERNAL"
        warehouses={[]}
        prefilledStocks={prefilled}
        incomingStocks={null}
      />,
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
      <TransferTargetForm
        sourceStock={null}
        currentWarehouseId="w1"
        activeTab="INTERNAL"
        warehouses={[]}
        prefilledStocks={null}
        incomingStocks={incoming}
        onConsumeIncoming={onConsume}
      />,
    );

    await waitFor(() => expect(onConsume).toHaveBeenCalled());
    expect(screen.getByText(/รายการรอโอนย้าย \(1\)/)).toBeTruthy();
  });
});
