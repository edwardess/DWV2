import { useState, useEffect, useCallback } from 'react';

interface UseLocalStorageOptions<T> {
  key: string;
  defaultValue: T;
  validator?: (value: any) => value is T;
}

export function useLocalStorage<T>({ 
  key, 
  defaultValue, 
  validator 
}: UseLocalStorageOptions<T>): [T, (value: T) => void] {
  // Initialize state with stored value or default
  const [storedValue, setStoredValue] = useState<T>(() => {
    // Check if we're in the browser (not SSR)
    if (typeof window === 'undefined') {
      return defaultValue;
    }
    
    try {
      const item = window.localStorage.getItem(key);
      if (!item) return defaultValue;

      const parsedItem = JSON.parse(item);
      
      // If validator is provided, use it to validate stored value
      if (validator) {
        return validator(parsedItem) ? parsedItem : defaultValue;
      }
      
      return parsedItem;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  // Return memoized update function
  const setValue = useCallback((value: T) => {
    try {
      // Save state
      setStoredValue(value);
      // Save to localStorage (only in browser)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key]);

  return [storedValue, setValue];
} 