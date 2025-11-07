import { Timestamp } from 'firebase/firestore';

export const sanitizeForFirestore = <T extends Record<string, any>>(data: T): T => {
  const sanitized = { ...data };
  
  Object.keys(sanitized).forEach(key => {
    const value = sanitized[key];
    
    // Convert Date objects to Firestore Timestamps
    if (value instanceof Date) {
      sanitized[key] = Timestamp.fromDate(value);
    }
    // Remove undefined values
    else if (value === undefined) {
      delete sanitized[key];
    }
    // Recursively sanitize nested objects
    else if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeForFirestore(value);
    }
  });

  return sanitized;
}; 