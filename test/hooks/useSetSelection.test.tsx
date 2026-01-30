import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSetSelection, getIds } from '@/hooks/useSetSelection';

const ITEMS = [
  { id: 'a', name: 'Item A' },
  { id: 'b', name: 'Item B' },
  { id: 'c', name: 'Item C' },
];

describe('useSetSelection', () => {
  it('should start with no selection', () => {
    const { result } = renderHook(() => useSetSelection(ITEMS));
    expect(result.current.selectedCount).toBe(0);
    expect(result.current.selectedIds.size).toBe(0);
    expect(result.current.selectedItems).toEqual([]);
  });

  it('should toggle single item', () => {
    const { result } = renderHook(() => useSetSelection(ITEMS));
    act(() => result.current.toggleItem('a'));
    expect(result.current.isSelected('a')).toBe(true);
    expect(result.current.selectedCount).toBe(1);
    expect(result.current.selectedItems).toHaveLength(1);
    expect(result.current.selectedItems[0].id).toBe('a');

    act(() => result.current.toggleItem('a'));
    expect(result.current.isSelected('a')).toBe(false);
    expect(result.current.selectedCount).toBe(0);
  });

  it('should toggle multiple items', () => {
    const { result } = renderHook(() => useSetSelection(ITEMS));
    act(() => result.current.toggleMultiple(['a', 'b']));
    expect(result.current.isSelected('a')).toBe(true);
    expect(result.current.isSelected('b')).toBe(true);
    expect(result.current.areAllSelected(['a', 'b'])).toBe(true);

    act(() => result.current.toggleMultiple(['a', 'b']));
    expect(result.current.isSelected('a')).toBe(false);
    expect(result.current.isSelected('b')).toBe(false);
  });

  it('should select all and clear', () => {
    const { result } = renderHook(() => useSetSelection(ITEMS));
    act(() => result.current.selectAll());
    expect(result.current.selectedCount).toBe(3);
    expect(result.current.areAllSelected(['a', 'b', 'c'])).toBe(true);

    act(() => result.current.clearSelection());
    expect(result.current.selectedCount).toBe(0);
    expect(result.current.selectedItems).toEqual([]);
  });

  it('should removeById', () => {
    const { result } = renderHook(() => useSetSelection(ITEMS));
    act(() => result.current.toggleItem('a'));
    act(() => result.current.toggleItem('b'));
    act(() => result.current.removeById('a'));
    expect(result.current.isSelected('a')).toBe(false);
    expect(result.current.isSelected('b')).toBe(true);
  });
});

describe('getIds', () => {
  it('should return ids from items', () => {
    expect(getIds(ITEMS)).toEqual(['a', 'b', 'c']);
  });
});
