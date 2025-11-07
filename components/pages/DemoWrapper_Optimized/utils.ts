// Optimized version of helper functions with proper TypeScript types

import { ImageMetadataFields } from './types';

export function sanitizeForFirestore<T extends Record<string, any>>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item)) as unknown as T;
  }
  
  // Handle objects
  const sanitized = {} as T;
  for (const [key, value] of Object.entries(obj)) {
    // Skip undefined values
    if (value !== undefined) {
      sanitized[key as keyof T] = sanitizeForFirestore(value);
    } else if (key === 'caption') {
      // Explicitly set caption to empty string if undefined
      sanitized[key as keyof T] = '' as any;
    }
  }
  
  return sanitized;
}

export function safelyConvertToDate(value: unknown): Date {
  if (!value) return new Date();
  
  // If it's already a Date object, return it
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value;
  }
  
  // If it's a Firestore Timestamp with toDate method
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    const date = value.toDate();
    return isNaN(date.getTime()) ? new Date() : date;
  }
  
  // If it's a string or number, try to convert it
  if (typeof value === 'string' || typeof value === 'number') {
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date;
      }
    } catch (e) {
      console.warn('Error converting to Date:', e);
    }
  }
  
  // Fallback to current date
  return new Date();
}

export function ensureRequiredFields<T extends ImageMetadataFields>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => ensureRequiredFields(item)) as unknown as T;
  }
  
  // Handle objects
  const result = { ...obj } as T;
  
  // Set default values for undefined fields
  if ('caption' in obj && obj.caption === undefined) result.caption = '';
  if ('comments' in obj && obj.comments === undefined) result.comments = [];
  if ('attachments' in obj && obj.attachments === undefined) result.attachments = [];
  if ('carouselArrangement' in obj && obj.carouselArrangement === undefined) result.carouselArrangement = [];
  if ('lastMoved' in obj) {
    result.lastMoved = safelyConvertToDate(obj.lastMoved);
  } else {
    result.lastMoved = new Date();
  }
  
  // Process nested objects
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null) {
      result[key as keyof T] = ensureRequiredFields(value);
    }
  }
  
  return result;
}

// Cache for memoizing expensive operations
const memoCache = new Map<string, { value: any; timestamp: number }>();
const MEMO_TTL = 5000; // 5 seconds TTL

export function memoize<T>(key: string, compute: () => T): T {
  const cached = memoCache.get(key);
  if (cached && Date.now() - cached.timestamp < MEMO_TTL) {
    return cached.value;
  }
  
  const value = compute();
  memoCache.set(key, { value, timestamp: Date.now() });
  return value;
}

// Clean up old cache entries periodically
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  Array.from(memoCache.entries()).forEach(([key, entry]) => {
    if (now - entry.timestamp > MEMO_TTL) {
      memoCache.delete(key);
    }
  });
}, MEMO_TTL);

// Ensure cleanup interval is cleared when module is unloaded
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    clearInterval(cleanupInterval);
  });
} 