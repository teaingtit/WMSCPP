'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';

export interface ShortcutConfig {
  key: string;
  description: string;
  descriptionTh: string;
  action: () => void;
  category: 'navigation' | 'action' | 'modal';
}

interface UseGlobalShortcutsOptions {
  onShowHelp?: () => void;
  enabled?: boolean;
}

export function useGlobalShortcuts(options: UseGlobalShortcutsOptions = {}) {
  const { onShowHelp, enabled = true } = options;
  const router = useRouter();
  const params = useParams();
  const warehouseId = params?.['warehouseId'] as string | undefined;

  // Sequence tracking for multi-key shortcuts (e.g., "g i")
  const [keySequence, setKeySequence] = useState<string[]>([]);
  const sequenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear sequence after timeout
  const clearSequence = useCallback(() => {
    setKeySequence([]);
    if (sequenceTimeoutRef.current) {
      clearTimeout(sequenceTimeoutRef.current);
      sequenceTimeoutRef.current = null;
    }
  }, []);

  // Navigation shortcuts
  const navigateTo = useCallback(
    (path: string) => {
      if (warehouseId) {
        router.push(`/dashboard/${warehouseId}${path}`);
      } else {
        router.push(`/dashboard${path}`);
      }
    },
    [router, warehouseId],
  );

  // Focus search input
  const focusSearch = useCallback(() => {
    const searchInputs = document.querySelectorAll<HTMLInputElement>(
      'input[type="search"], input[placeholder*="ค้นหา"], input[placeholder*="search"], input[placeholder*="พิมพ์"]',
    );
    if (searchInputs.length > 0) {
      const first = searchInputs[0]!;
      first.focus();
      first.select();
    }
  }, []);

  // Close modal / escape
  const handleEscape = useCallback(() => {
    // Try to close any open modals by clicking close buttons or backdrop
    const closeButtons = document.querySelectorAll<HTMLButtonElement>(
      '[data-close-modal], [aria-label="Close"], [aria-label="ปิด"], button[class*="close"]',
    );
    if (closeButtons.length > 0) {
      closeButtons[0]!.click();
      return;
    }

    // Try clicking backdrop
    const backdrop = document.querySelector<HTMLElement>('[data-dialog-overlay], [role="dialog"]');
    if (backdrop) {
      const closeBtn = backdrop.querySelector<HTMLButtonElement>('button');
      if (closeBtn) closeBtn.click();
    }
  }, []);

  // Build shortcuts list
  const shortcuts: ShortcutConfig[] = [
    {
      key: 'g i',
      description: 'Go to Inventory',
      descriptionTh: 'ไปหน้าสินค้าคงคลัง',
      action: () => navigateTo('/inventory'),
      category: 'navigation',
    },
    {
      key: 'g o',
      description: 'Go to Outbound',
      descriptionTh: 'ไปหน้าเบิกจ่าย',
      action: () => navigateTo('/outbound'),
      category: 'navigation',
    },
    {
      key: 'g n',
      description: 'Go to Inbound',
      descriptionTh: 'ไปหน้านำเข้า',
      action: () => navigateTo('/inbound'),
      category: 'navigation',
    },
    {
      key: 'g h',
      description: 'Go to History',
      descriptionTh: 'ไปหน้าประวัติ',
      action: () => navigateTo('/history'),
      category: 'navigation',
    },
    {
      key: 'g t',
      description: 'Go to Transfer',
      descriptionTh: 'ไปหน้าโอนย้าย',
      action: () => navigateTo('/transfer'),
      category: 'navigation',
    },
    {
      key: 'g a',
      description: 'Go to Audit',
      descriptionTh: 'ไปหน้าตรวจนับ',
      action: () => navigateTo('/audit'),
      category: 'navigation',
    },
    {
      key: 'g d',
      description: 'Go to Dashboard',
      descriptionTh: 'ไปหน้าหลัก',
      action: () => router.push('/dashboard'),
      category: 'navigation',
    },
    {
      key: '/',
      description: 'Focus Search',
      descriptionTh: 'โฟกัสช่องค้นหา',
      action: focusSearch,
      category: 'action',
    },
    {
      key: 'Escape',
      description: 'Close Modal',
      descriptionTh: 'ปิดหน้าต่าง',
      action: handleEscape,
      category: 'modal',
    },
    {
      key: '?',
      description: 'Show Shortcuts Help',
      descriptionTh: 'แสดงรายการคีย์ลัด',
      action: () => onShowHelp?.(),
      category: 'modal',
    },
  ];

  // Handle key events
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if typing in input/textarea/contenteditable
      const target = event.target as HTMLElement;
      const isTyping =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Allow Escape and ? even when typing
      if (event.key === 'Escape') {
        handleEscape();
        clearSequence();
        return;
      }

      if (isTyping) {
        // Only allow "/" to blur and focus search, not regular "/" input
        if (event.key === '/' && !event.ctrlKey && !event.metaKey) {
          // Check if already in search input
          const currentInput = target as HTMLInputElement;
          const isSearchInput =
            currentInput.type === 'search' ||
            currentInput.placeholder?.includes('ค้นหา') ||
            currentInput.placeholder?.toLowerCase().includes('search');

          if (!isSearchInput) {
            event.preventDefault();
            focusSearch();
          }
        }
        return;
      }

      // Handle "?" (Shift + /)
      if (event.key === '?' || (event.shiftKey && event.key === '/')) {
        event.preventDefault();
        onShowHelp?.();
        clearSequence();
        return;
      }

      // Handle "/" for search focus
      if (event.key === '/' && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        focusSearch();
        clearSequence();
        return;
      }

      // Handle sequence shortcuts (g + letter)
      const key = event.key.toLowerCase();

      // Clear existing timeout
      if (sequenceTimeoutRef.current) {
        clearTimeout(sequenceTimeoutRef.current);
      }

      // Add to sequence
      const newSequence = [...keySequence, key];
      setKeySequence(newSequence);

      // Set timeout to clear sequence
      sequenceTimeoutRef.current = setTimeout(clearSequence, 800);

      // Check for matching sequence
      const sequenceStr = newSequence.join(' ');

      const matchingShortcut = shortcuts.find((s) => s.key === sequenceStr);
      if (matchingShortcut) {
        event.preventDefault();
        matchingShortcut.action();
        clearSequence();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (sequenceTimeoutRef.current) {
        clearTimeout(sequenceTimeoutRef.current);
      }
    };
  }, [enabled, keySequence, shortcuts, clearSequence, focusSearch, handleEscape, onShowHelp]);

  return {
    shortcuts,
    keySequence,
  };
}
