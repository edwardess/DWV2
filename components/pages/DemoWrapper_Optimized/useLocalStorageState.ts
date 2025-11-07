import { useState, useEffect, useCallback } from 'react';

interface LocalStorageOptions<T> {
  key: string;
  defaultValue: T;
  validator?: (value: any) => boolean;
}

export function useLocalStorageState<T>({ 
  key, 
  defaultValue, 
  validator 
}: LocalStorageOptions<T>): [T, (value: T) => void] {
  // Initialize state from localStorage with validation
  const [state, setState] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      if (item !== null) {
        const parsed = JSON.parse(item);
        if (!validator || validator(parsed)) {
          return parsed;
        }
      }
      return defaultValue;
    } catch {
      return defaultValue;
    }
  });

  // Memoize the update function to prevent unnecessary re-renders
  const updateState = useCallback((value: T) => {
    setState(value);
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error saving to localStorage for key "${key}":`, error);
    }
  }, [key]);

  // Sync with other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          const newValue = JSON.parse(e.newValue);
          if (!validator || validator(newValue)) {
            setState(newValue);
          }
        } catch {
          // If parsing fails, keep current state
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, validator]);

  return [state, updateState];
}

// Type validators
export const isBoolean = (value: any): value is boolean => 
  typeof value === 'boolean';

export const isString = (value: any): value is string => 
  typeof value === 'string';

export const isOneOf = <T extends string>(allowedValues: readonly T[]) => 
  (value: any): value is T => 
    allowedValues.includes(value as T);

// Example usage types
export type ViewMode = 'full' | 'list';
export type TabType = 'FBA CARE MAIN' | 'Learning Hub' | 'Podcast';

// Specific validators
export const isViewMode = isOneOf(['full', 'list'] as const);
export const isTabType = isOneOf(['FBA CARE MAIN', 'Learning Hub', 'Podcast'] as const); 