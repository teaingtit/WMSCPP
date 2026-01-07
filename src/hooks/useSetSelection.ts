import { useState, useCallback, useMemo } from 'react';

/**
 * Generic hook for managing Set-based selection state.
 * Used by inventory dashboard for multi-select functionality.
 */
export function useSetSelection<T extends { id: string }>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Create Map for fast lookup
  const itemMap = useMemo(() => {
    const map = new Map<string, T>();
    items.forEach((item) => map.set(item.id, item));
    return map;
  }, [items]);

  // Derive selected items from IDs
  const selectedItems = useMemo(() => {
    return Array.from(selectedIds)
      .map((id) => itemMap.get(id))
      .filter(Boolean) as T[];
  }, [selectedIds, itemMap]);

  // Toggle a single item
  const toggleItem = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  }, []);

  // Toggle multiple items at once
  const toggleMultiple = useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      const allSelected = ids.every((id) => prev.has(id));
      const newSet = new Set(prev);
      if (allSelected) {
        ids.forEach((id) => newSet.delete(id));
      } else {
        ids.forEach((id) => newSet.add(id));
      }
      return newSet;
    });
  }, []);

  // Select all items
  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.map((item) => item.id)));
  }, [items]);

  // Clear all selections
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Remove specific item from selection
  const removeById = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }, []);

  // Check if item is selected
  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  // Check if all given IDs are selected
  const areAllSelected = useCallback(
    (ids: string[]) => ids.length > 0 && ids.every((id) => selectedIds.has(id)),
    [selectedIds],
  );

  return {
    selectedIds,
    selectedItems,
    selectedCount: selectedIds.size,
    toggleItem,
    toggleMultiple,
    selectAll,
    clearSelection,
    removeById,
    isSelected,
    areAllSelected,
  };
}

/**
 * Get IDs from a group of items
 */
export const getIds = <T extends { id: string }>(items: T[]): string[] =>
  items.map((item) => item.id);
