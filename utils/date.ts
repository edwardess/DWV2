import { Timestamp } from 'firebase/firestore';

const MAX_DATE_RANGE_DAYS = 366; // Maximum range of dates to prevent memory issues

function isValidDate(date: Date | null | undefined): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

export const formatDate = (date: Date | null | undefined): string => {
  if (!isValidDate(date)) {
    return '';
  }
  return (date as Date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const timestampToDate = (timestamp: Timestamp | null | undefined): Date | null => {
  if (!timestamp || typeof timestamp.toDate !== 'function') {
    return null;
  }
  const date = timestamp.toDate();
  return isValidDate(date) ? date : null;
};

export const dateToTimestamp = (date: Date | null | undefined): Timestamp | null => {
  if (!isValidDate(date)) {
    return null;
  }
  return Timestamp.fromDate(date as Date);
};

export const isSameDay = (date1: Date | null | undefined, date2: Date | null | undefined): boolean => {
  if (!isValidDate(date1) || !isValidDate(date2)) {
    return false;
  }
  return (
    (date1 as Date).getFullYear() === (date2 as Date).getFullYear() &&
    (date1 as Date).getMonth() === (date2 as Date).getMonth() &&
    (date1 as Date).getDate() === (date2 as Date).getDate()
  );
};

export const addDays = (date: Date | null | undefined, days: number): Date | null => {
  if (!isValidDate(date) || typeof days !== 'number' || isNaN(days)) {
    return null;
  }
  const result = new Date(date as Date);
  result.setDate(result.getDate() + days);
  return isValidDate(result) ? result : null;
};

export const getDateRange = (
  startDate: Date | null | undefined,
  endDate: Date | null | undefined
): Date[] => {
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return [];
  }

  const start = startDate as Date;
  const end = endDate as Date;

  if (start > end) {
    return [];
  }

  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff > MAX_DATE_RANGE_DAYS) {
    console.warn(`Date range exceeds maximum of ${MAX_DATE_RANGE_DAYS} days`);
    return [];
  }

  const dates: Date[] = [];
  let currentDate = new Date(start);

  while (currentDate <= end) {
    dates.push(new Date(currentDate));
    const next = addDays(currentDate, 1);
    if (!next) break;
    currentDate = next;
  }

  return dates;
}; 