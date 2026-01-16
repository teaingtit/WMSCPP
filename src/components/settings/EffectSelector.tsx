'use client';

import { useState, useRef, useEffect } from 'react';
import { STATUS_EFFECT_OPTIONS, isPredefinedEffect } from '@/types/status';
import { ChevronDown, Check, Plus, Shield, Search } from 'lucide-react';

interface EffectSelectorProps {
  value: string;
  onChange: (effect: string) => void;
  error?: string;
}

/**
 * EffectSelector - Combobox for selecting or creating effect names
 * Supports both predefined effects and custom effect names
 */
export function EffectSelector({ value, onChange, error }: EffectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format effect name: UPPERCASE_WITH_UNDERSCORES
  const formatEffectName = (name: string): string => {
    return name
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '_')
      .replace(/[^A-Z0-9_]/g, '');
  };

  // Get display info for an effect
  const getEffectDisplayInfo = (effect: string) => {
    const predefined = STATUS_EFFECT_OPTIONS.find((opt) => opt.value === effect);
    if (predefined) {
      return {
        label: predefined.label,
        icon: predefined.icon,
        description: predefined.description,
      };
    }
    // Custom effect
    return {
      label: effect,
      icon: '⚙️',
      description: 'เอฟเฟกต์กำหนดเอง',
    };
  };

  // Filter predefined effects by search query
  const filteredOptions = STATUS_EFFECT_OPTIONS.filter(
    (opt) =>
      opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opt.value.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Check if current search query should show "Create custom" option
  const formattedQuery = formatEffectName(searchQuery);
  const showCreateOption =
    searchQuery.length > 0 && !STATUS_EFFECT_OPTIONS.some((opt) => opt.value === formattedQuery);

  // Handle selection
  const handleSelect = (effectValue: string) => {
    onChange(effectValue);
    setSearchQuery('');
    setIsOpen(false);
  };

  // Handle creating custom effect
  const handleCreateCustom = () => {
    if (formattedQuery) {
      onChange(formattedQuery);
      setSearchQuery('');
      setIsOpen(false);
    }
  };

  // Current display info
  const currentDisplay = value ? getEffectDisplayInfo(value) : null;

  return (
    <div ref={containerRef} className="relative">
      <label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
        <Shield size={14} />
        Transaction Effect *
      </label>

      {/* Main Button / Display */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className={`w-full flex items-center justify-between gap-2 p-3 rounded-lg border-2 transition-all text-left ${
          error
            ? 'border-red-300 bg-red-50'
            : isOpen
            ? 'border-indigo-500 bg-indigo-50'
            : value
            ? 'border-slate-300 bg-white hover:border-indigo-400'
            : 'border-slate-200 bg-slate-50 hover:border-slate-300'
        }`}
      >
        {currentDisplay ? (
          <div className="flex items-center gap-2">
            <span className="text-lg">{currentDisplay.icon}</span>
            <div>
              <span className="font-medium text-slate-800">{currentDisplay.label}</span>
              {!isPredefinedEffect(value) && (
                <span className="ml-2 text-xs text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded">
                  Custom
                </span>
              )}
            </div>
          </div>
        ) : (
          <span className="text-slate-400">Select or type effect...</span>
        )}
        <ChevronDown
          size={18}
          className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Error message */}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search or type custom effect..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (showCreateOption) {
                      handleCreateCustom();
                    } else if (filteredOptions.length === 1 && filteredOptions[0]) {
                      handleSelect(filteredOptions[0].value);
                    }
                  }
                  if (e.key === 'Escape') {
                    setIsOpen(false);
                  }
                }}
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-64 overflow-y-auto">
            {/* Predefined Options */}
            {filteredOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                  value === opt.value
                    ? 'bg-indigo-50 border-l-4 border-indigo-500'
                    : 'hover:bg-slate-50 border-l-4 border-transparent'
                }`}
              >
                <span className="text-lg">{opt.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-800">{opt.label}</div>
                  <p className="text-xs text-slate-500 truncate">{opt.description}</p>
                </div>
                {value === opt.value && <Check size={16} className="text-indigo-600 shrink-0" />}
              </button>
            ))}

            {/* Create Custom Option */}
            {showCreateOption && (
              <>
                <div className="border-t border-slate-100 my-1" />
                <button
                  type="button"
                  onClick={handleCreateCustom}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-indigo-50 transition-colors border-l-4 border-transparent"
                >
                  <Plus size={18} className="text-indigo-600" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-indigo-700">
                      Create &quot;{formattedQuery}&quot;
                    </div>
                    <p className="text-xs text-slate-500">Add as custom effect</p>
                  </div>
                </button>
              </>
            )}

            {/* No Results */}
            {filteredOptions.length === 0 && !showCreateOption && (
              <div className="p-4 text-center text-slate-400 text-sm">
                No effects found. Type to create a custom one.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default EffectSelector;
