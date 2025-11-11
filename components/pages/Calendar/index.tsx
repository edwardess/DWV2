// Put the components/ContinuousCalendar.tsx code here 

"use client";

import React, { useEffect, useMemo, useRef, useState, useContext, createContext } from "react";
import { ImageMeta } from "@/components/pages/DemoWrapper"; // Adjust import path as needed
import { EyeIcon, CheckCircleIcon, ArrowPathIcon, ClockIcon, PencilIcon, ClipboardDocumentListIcon } from "@heroicons/react/24/outline";
import Image from "next/image"; // <-- Added for Next.js image optimization
import { generateCloudinaryURL } from "@/utils/generateCloudinaryUrl"; // Import Cloudinary utility
import { SocialMediaSwitch, type SocialMediaInstance } from "@/components/ui/social-media-switch";
import { MessengerButton } from "@/components/ui/messenger-button";
import { NotificationBell } from '@/components/common/notifications/NotificationBell';
import TodoListModal from "./TodoList/TodoListModal";

// Add an image cache context
interface ImageCacheContextType {
  cache: Map<string, { dataUrl: string; timestamp: number }>;
  addToCache: (src: string, dataUrl: string) => void;
  getFromCache: (src: string) => string | null;
}

const ImageCacheContext = createContext<ImageCacheContextType>({
  cache: new Map(),
  addToCache: () => {},
  getFromCache: () => null,
});

// Create a provider component for the cache
export const ImageCacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Create a cache with Map to store image data URLs and their timestamps
  const [cache] = useState<Map<string, { dataUrl: string; timestamp: number }>>(
    () => new Map()
  );
  
  // Cache expiration time (2 hours in milliseconds)
  const CACHE_EXPIRATION = 2 * 60 * 60 * 1000;
  
  // Function to add an image to the cache
  const addToCache = (src: string, dataUrl: string) => {
    // Clean up expired cache entries
    const now = Date.now();
    cache.forEach((entry, key) => {
      if (now - entry.timestamp > CACHE_EXPIRATION) {
        cache.delete(key);
      }
    });
    
    // Add new image to cache
    cache.set(src, { dataUrl, timestamp: now });
  };
  
  // Function to get an image from the cache
  const getFromCache = (src: string): string | null => {
    const entry = cache.get(src);
    if (!entry) return null;
    
    // Check if cached image has expired
    if (Date.now() - entry.timestamp > CACHE_EXPIRATION) {
      cache.delete(src);
      return null;
    }
    
    return entry.dataUrl;
  };
  
  return (
    <ImageCacheContext.Provider value={{ cache, addToCache, getFromCache }}>
      {children}
    </ImageCacheContext.Provider>
  );
};

// Custom hook to use the image cache
export const useImageCache = () => {
  const context = useContext(ImageCacheContext);
  if (!context) {
    throw new Error('useImageCache must be used within an ImageCacheProvider');
  }
  return context;
};

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Function to get the abbreviated month name (first 3 letters) with a space
function getMonthAbbr(month: number): string {
  if (month < 0 || month >= monthNames.length) return '';
  return monthNames[month].substring(0, 3) + ' ';
}

function getLabelBg(label: string = "Approved"): string {
  switch (label) {
    case "Approved":
      return "bg-green-100";
    case "Needs Revision":
      return "bg-orange-100";
    case "Ready for Approval":
      return "bg-purple-100";
    case "Scheduled":
      return "bg-blue-100";
    case "Draft":
      return "bg-amber-100";
    default:
      return "bg-gray-100";
  }
}

function getLabelOutline(label: string = "Approved"): string {
  switch (label) {
    case "Approved":
      return "border border-green-200";
    case "Needs Revision":
      return "border border-orange-200";
    case "Ready for Approval":
      return "border border-purple-200";
    case "Scheduled":
      return "border border-blue-200";
    case "Draft":
      return "border border-amber-200";
    default:
      return "border border-gray-200";
  }
}

function formatLabel(label: string | undefined): string {
  if (!label) return "";
  if (label === "Ready for Approval") return "Approval";
  if (label === "Needs Revision") return "Revision";
  if (label === "Draft") return "Draft";
  return label;
}

interface ContinuousCalendarProps {
  onClick?: (day: number, month: number, year: number) => void;
  onImageDrop?: (
    day: number,
    month: number,
    year: number,
    imageId: string,
    sourceKey?: string
  ) => void;
  // droppedImages: array of cards per cell
  droppedImages?: { [date: string]: Array<{ id: string; url: string }> };
  imageMetadata?: { [id: string]: ImageMeta };
  onSeeDetails?: (id: string) => void;
  onApprove?: (id: string) => void;
  projectId?: string;
  projectName?: string;
  activeInstance?: SocialMediaInstance;
  onInstanceChange?: (instance: SocialMediaInstance) => void;
  cardsInTransit?: Set<string>;
  // Add new prop for expanded view
  expandedView?: boolean;
  draggedCardId?: string | null;
  setDraggedCardId?: (id: string | null) => void;
  // Actual calendar container width (from DemoWrapper)
  calendarWidth?: number;
}

// Add a simple spinner component
const Spinner = () => (
  <div className="flex justify-center items-center h-full w-full">
    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
  </div>
);

// Update the ImageWithLoading component to use the cache
const ImageWithLoading = ({ src, alt }: { src: string; alt: string }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imgSrc, setImgSrc] = useState<string>("");
  const [optimized, setOptimized] = useState(false);
  const srcRef = useRef(src);
  const { getFromCache, addToCache } = useImageCache();
  
  // Try to load from cache first, then fall back to network
  useEffect(() => {
    if (src !== srcRef.current || !imgSrc) {
      setIsLoading(true);
      setError(false);
      srcRef.current = src;
      
      // Check if image is in cache
      const cachedImage = getFromCache(src);
      if (cachedImage) {
        setImgSrc(cachedImage);
        setIsLoading(false);
        setOptimized(false); // Cached images are stored in their original form
      } else {
        // Use Cloudinary optimized URL
        try {
          const optimizedSrc = generateCloudinaryURL(src, 400);
          setImgSrc(optimizedSrc);
          setOptimized(true);
          
          // Preload the image to warm up the browser cache
          const preloadImg = document.createElement('img');
          preloadImg.src = optimizedSrc;
        } catch (err) {
          setImgSrc(src); // Fallback to original URL
          setOptimized(false);
        }
      }
    }
  }, [src, getFromCache]);
  
  // Function to cache an image after it's loaded
  const cacheImage = async (imageUrl: string) => {
    try {
      // Skip caching for data URLs
      if (imageUrl.startsWith('data:')) {
        return;
      }
      
      // Don't re-cache if already in cache
      if (getFromCache(srcRef.current)) {
        return;
      }
      
      // For caching, we should use the original src, not the Cloudinary URL
      // This ensures we don't duplicate cache entries
      const originalUrl = srcRef.current;
      
      // Fetch the image - use the optimized URL for fetching if available
      const fetchUrl = optimized ? imageUrl : originalUrl;
      const response = await fetch(fetchUrl, { cache: 'force-cache' });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      
      // Convert to data URL for caching
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        // Cache with the original URL as the key
        addToCache(originalUrl, dataUrl);
      };
    } catch (err) {
    }
  };
  
  // Use a div with background for debugging
  const renderDebugInfo = () => {
    // Completely remove the debug indicator
    return null;
  };
  
  return (
    <div className="relative w-full h-full p-2">
      {renderDebugInfo()}
      
      {isLoading && (
        <div className="absolute inset-2 flex items-center justify-center bg-gray-100 bg-opacity-80 z-10 rounded-full">
          <Spinner />
        </div>
      )}
      
      {error ? (
        <div className="absolute inset-2 flex flex-col items-center justify-center bg-gray-100 text-gray-500 text-xs rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Failed to load</span>
        </div>
      ) : (
        imgSrc && (
          <Image
            key={imgSrc} // Key helps React identify when to recreate the component
            src={imgSrc}
            alt={alt}
            fill
            priority={true} // Prioritize loading this image
            style={{ 
              objectFit: "contain", 
              objectPosition: "center",
              borderRadius: "8px", 
              border: "2px solid #374151",
              WebkitUserSelect: "none",
              MozUserSelect: "none",
              msUserSelect: "none",
              userSelect: "none"
            }}
            sizes="(max-width: 768px) 100vw, 33vw"
            onLoad={() => {
              setIsLoading(false);
              // Cache the image for future use
              cacheImage(imgSrc);
            }}
            onError={(e) => {
              setIsLoading(false);
              setError(true);
              
              // If Cloudinary optimization fails, fall back to original URL
              if (optimized) {
                setImgSrc(src);
                setOptimized(false);
                setError(false);
                setIsLoading(true);
              }
            }}
            className={`shadow-sm hover:shadow-md cursor-grab transition-all duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'} user-select-none`}
            unoptimized={true} // Skip Next.js optimization since we're using Cloudinary
            draggable="false"
          />
        )
      )}
    </div>
  );
};

// Add custom dark shadow style to KeyframesStyle component
const KeyframesStyle = () => (
  <style jsx global>{`
    @keyframes pulse {
      0% {
        box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.7);
        transform: scale(1);
      }
      50% {
        box-shadow: 0 0 0 8px rgba(168, 85, 247, 0);
        transform: scale(1.1);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(168, 85, 247, 0);
        transform: scale(1);
      }
    }
    .pulse-animation {
      animation: pulse 1.5s infinite;
    }
    
    @keyframes bounceAttention {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-5px); }
    }
    .bounce-attention {
      animation: bounceAttention 2s infinite;
    }
    
    .dark-shadow {
      box-shadow: 0 6px 10px rgba(0, 0, 0, 0.6);
    }
    
    .darker-shadow {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.45);
    }
    
    .darkest-shadow {
      box-shadow: 0 6px 15px rgba(0, 0, 0, 0.5);
    }
    
    .hover-dark-shadow:hover {
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.8);
    }
    
    /* Calendar control styles */
    .calendar-controls {
      --focus-ring-color: rgba(59, 130, 246, 0.5);
    }
    
    .calendar-controls .focus-ring {
      box-shadow: 0 0 0 2px var(--focus-ring-color);
    }
    
    .calendar-controls button:focus {
      outline: none;
      box-shadow: 0 0 0 2px var(--focus-ring-color);
    }
    
    .approval-indicator {
      position: absolute;
      top: 32px;
      right: 0;
      background-color: white;
      border: 2px solid #9333ea;
      padding: 2px 5px;
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(147, 51, 234, 0.5);
      z-index: 110;
      width: auto;
      white-space: nowrap;
      text-align: center;
      font-weight: bold;
      font-size: 8px;
      line-height: 1.2;
      color: #9333ea;
      transform-origin: top right;
    }
    
    /* Responsive text sizes - these are now mobile-first */
    @media (max-width: 639px) {
      .approval-indicator {
        font-size: 8px;
        padding: 2px 4px;
        right: -2px;
        transform: scale(0.95);
      }
      .approval-indicator .text-purple-700 {
        font-size: 8px;
        color: #9333ea !important;
      }
    }
    
    /* For very small screens, ensure it's not cut off */
    @media (max-width: 350px) {
      .approval-indicator {
        right: 0;
        font-size: 7px;
        transform: scale(0.9);
      }
    }
    
    @media (min-width: 640px) {
      .approval-indicator {
        font-size: 9px;
        padding: 2px 5px;
        right: -2px;
      }
      .approval-indicator .text-purple-700 {
        font-size: 9px;
        color: #9333ea !important;
      }
    }
    
    @media (min-width: 768px) {
      .approval-indicator {
        font-size: 10px;
        padding: 3px 6px;
        right: -2px;
      }
      .approval-indicator .text-purple-700 {
        font-size: 10px;
        color: #9333ea !important;
      }
    }
    
    .approval-indicator::after {
      content: '';
      position: absolute;
      top: -6px;
      right: 4px;
      width: 8px;
      height: 8px;
      background-color: white;
      border-right: 2px solid #9333ea;
      border-top: 2px solid #9333ea;
      border-bottom: none;
      transform: rotate(-45deg);
    }
    
    /* New animation for emphasis */
    @keyframes flashBorder {
      0%, 100% { border-color: #9333ea; }
      50% { border-color: #d946ef; }
    }
    
    .approval-indicator {
      animation: flashBorder 2s infinite, bounceAttention 2s infinite;
    }

    /* Add this CSS to prevent text selection during drag */
    .user-select-none {
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
    }

    .user-select-none img, 
    .user-select-none svg {
      -webkit-user-drag: none;
      -khtml-user-drag: none;
      -moz-user-drag: none;
      -o-user-drag: none;
      user-drag: none;
      pointer-events: none;
    }

    @keyframes gradientMove {
      0% {
        background-position: 0% 50%;
      }
      50% {
        background-position: 100% 50%;
      }
      100% {
        background-position: 0% 50%;
      }
    }
    
    .processing-overlay {
      background: linear-gradient(
        45deg,
        rgba(0, 0, 0, 0.3) 0%,
        rgba(0, 0, 0, 0.2) 50%,
        rgba(0, 0, 0, 0.3) 100%
      );
      background-size: 200% 200%;
      animation: gradientMove 1s ease infinite;
    }
  `}</style>
);

// Add this helper function near the top with other utility functions
const setCursorLoading = (duration: number = 300) => {
  document.body.style.cursor = 'wait';
  setTimeout(() => {
    document.body.style.cursor = 'default';
  }, duration);
};

export const ContinuousCalendar: React.FC<ContinuousCalendarProps> = ({
  onClick,
  onImageDrop,
  droppedImages,
  imageMetadata,
  onSeeDetails,
  onApprove,
  projectId,
  projectName,
  activeInstance = "facebook", // Default to facebook
  onInstanceChange,
  cardsInTransit = new Set(), // Default to empty set
  expandedView = false, // Default to false
  draggedCardId: propDraggedCardId,
  setDraggedCardId: propSetDraggedCardId,
  calendarWidth,
}) => {
  const { cache, addToCache, getFromCache } = useImageCache();
  const today = new Date();
  const [year, setYear] = useState<number>(today.getFullYear());
  const dayRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth());
  const [tooltipVisible, setTooltipVisible] = useState<{[key: string]: boolean}>({});
  const [processingApprovalIds, setProcessingApprovalIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingCards, setProcessingCards] = useState<Set<string>>(new Set());
  const [localDraggedCardId, setLocalDraggedCardId] = useState<string | null>(null);
  const [hoveredCellKey, setHoveredCellKey] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);
  const draggedCardId = propSetDraggedCardId ? (propDraggedCardId ?? null) : localDraggedCardId;
  const setDraggedCardId = propSetDraggedCardId || setLocalDraggedCardId;

  // Derive responsive flags based on actual container width
  const isTight = typeof calendarWidth === 'number' ? calendarWidth < 760 : false;
  const isNarrow = typeof calendarWidth === 'number' ? calendarWidth < 900 : false;
  useEffect(() => {
    setTooltipVisible({});
  }, [projectId]);

  useEffect(() => {
    const handleDragEnd = () => {
      setDraggedCardId(null);
      setHoveredCellKey(null);
      setDragPosition(null);
    };
    document.addEventListener('dragend', handleDragEnd);
    return () => document.removeEventListener('dragend', handleDragEnd);
  }, []);
  const monthOptions = monthNames.map((month, index) => ({
    name: month,
    value: `${index}`,
  }));

  const scrollToDay = (monthIndex: number, dayIndex: number) => {
    const targetDayIndex = dayRefs.current.findIndex(
      (ref) =>
        ref &&
        ref.getAttribute("data-month") === `${monthIndex}` &&
        ref.getAttribute("data-day") === `${dayIndex}`
    );
    const targetElement = dayRefs.current[targetDayIndex];
    if (targetDayIndex !== -1 && targetElement) {
      const container = document.querySelector(".calendar-container");
      const elementRect = targetElement.getBoundingClientRect();
      const is2xl = window.matchMedia("(min-width: 1536px)").matches;
      const offsetFactor = is2xl ? 3 : 2.5;
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const offset =
          elementRect.top -
          containerRect.top -
          containerRect.height / offsetFactor +
          elementRect.height / 2;
        container.scrollTo({
          top: container.scrollTop + offset,
          behavior: "smooth",
        });
      } else {
        const offset =
          window.scrollY +
          elementRect.top -
          window.innerHeight / offsetFactor +
          elementRect.height / 2;
        window.scrollTo({
          top: offset,
          behavior: "smooth",
        });
      }
    }
  };

  const handlePrevYear = () => setYear((prev) => prev - 1);
  const handleNextYear = () => setYear((prev) => prev + 1);
  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const monthIndex = parseInt(e.target.value, 10);
    setSelectedMonth(monthIndex);
    scrollToDay(monthIndex, 1);
  };
  const handleTodayClick = () => {
    setYear(today.getFullYear());
    scrollToDay(today.getMonth(), today.getDate());
  };
  const handleDayClick = (day: number, month: number, year: number) => {
    if (!onClick) return;
    if (month < 0) {
      onClick(day, 11, year - 1);
    } else {
      onClick(day, month, year);
    }
  };

  useEffect(() => {
    setTimeout(() => {
      handleTodayClick();
    }, 100);
  }, []);

  // Group dropped images by cell (location)
  const groupedDroppedImages = useMemo(() => {
    const obj: { [date: string]: Array<{ id: string; url: string }> } = {};
    if (!imageMetadata) return obj;
    Object.entries(imageMetadata).forEach(([id, meta]) => {
      if (meta.location !== "pool") {
        if (!obj[meta.location]) {
          obj[meta.location] = [];
        }
        obj[meta.location].push({ id, url: meta.url });
      }
    });
    return obj;
  }, [imageMetadata]);

  const setCardProcessing = (cardId: string) => {
    setProcessingCards(prev => new Set(Array.from(prev).concat([cardId])));
    setTimeout(() => {
      setProcessingCards(prev => {
        const newSet = new Set(Array.from(prev));
        newSet.delete(cardId);
        return newSet;
      });
    }, 500);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, day: number, month: number, year: number) => {
    e.preventDefault();
    const imageId = e.dataTransfer.getData("imageId");
    const sourceKey = e.dataTransfer.getData("sourceKey");
    setCardProcessing(imageId);
    
    if (onImageDrop) {
      onImageDrop(day, month, year, imageId, sourceKey);
    }
  };

  const handleApproveToggle = (e: React.MouseEvent, id: string, currentStatus: string) => {
    e.stopPropagation();
    setCardProcessing(id);
    
    if (onApprove) {
      onApprove(id);
    }
  };

  // Add a utility function to check if a card is in transit
  const isCardInTransit = (id: string): boolean => {
    return cardsInTransit.has(id);
  };

  const generateCalendar = useMemo(() => {
    const daysInYear = (): { month: number; day: number }[] => {
      const days: { month: number; day: number }[] = [];
      const startDayOfWeek = new Date(year, 0, 1).getDay();
      if (startDayOfWeek < 6) {
        for (let i = 0; i < startDayOfWeek; i++) {
          days.push({ month: -1, day: 32 - startDayOfWeek + i });
        }
      }
      for (let m = 0; m < 12; m++) {
        const daysInMonth = new Date(year, m + 1, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
          days.push({ month: m, day: d });
        }
      }
      const remainder = days.length % 7;
      if (remainder > 0) {
        const extra = 7 - remainder;
        for (let i = 1; i <= extra; i++) {
          days.push({ month: 0, day: i });
        }
      }
      return days;
    };

    const calendarDays = daysInYear();
    const weeks: { month: number; day: number }[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      weeks.push(calendarDays.slice(i, i + 7));
    }

    return weeks.map((week, weekIndex) => (
      <div className="flex w-full gap-1.5 mb-1.5" key={`week-${weekIndex}`}>
        {week.map(({ month, day }, dayIndex) => {
          const index = weekIndex * 7 + dayIndex;
          const isNewMonth =
            index === 0 || calendarDays[index - 1].month !== month;
          const isToday =
            today.getMonth() === month &&
            today.getDate() === day &&
            today.getFullYear() === year;
          const dayKey = `${year}-${month}-${day}`;
          return (
            <div
              key={`${month}-${day}`}
              ref={(el) => {
                dayRefs.current[index] = el;
              }}
              data-month={month}
              data-day={day}
              onClick={() => handleDayClick(day, month, year)}
              onDrag={(e) => {
                if (draggedCardId) {
                  setDragPosition({ x: e.clientX, y: e.clientY });
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                const isFull = groupedDroppedImages?.[dayKey]?.length >= 4;
                if (!isFull && month >= 0) {
                  setHoveredCellKey(dayKey);
                } else {
                  setHoveredCellKey(null);
                }
                if (draggedCardId) {
                  setDragPosition({ x: e.clientX, y: e.clientY });
                }
              }}
              onDragLeave={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX;
                const y = e.clientY;
                if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                  setHoveredCellKey(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                // Reject drop if cell already has 4 cards
                if (
                  groupedDroppedImages &&
                  groupedDroppedImages[dayKey] &&
                  groupedDroppedImages[dayKey].length >= 4
                ) {
                  // Optionally, you can trigger a snack or alert here.
                  return;
                }
                const imageId = e.dataTransfer.getData("imageId");
                const sourceKey = e.dataTransfer.getData("sourceKey");
                if (onImageDrop && month >= 0) {
                  handleDrop(e, day, month, year);
                }
                setDraggedCardId(null);
                setHoveredCellKey(null);
                setDragPosition(null);
              }}
              className={`relative z-10 group aspect-square grow rounded-xl border-2 lg:rounded-2xl font-medium transition-all hover:z-20 hover:border-cyan-400 p-1
                ${isToday 
                  ? 'border-2 border-blue-500 shadow-md bg-gradient-to-br from-blue-50 to-white z-20' 
                  : 'border-gray-300'}
                ${expandedView 
                  ? 'w-full sm:w-1/7 md:w-1/8 lg:w-1/9 xl:w-1/10 2xl:w-1/11' 
                  : 'w-full sm:w-1/6 md:w-1/6 lg:w-1/7 xl:w-1/8 2xl:w-1/9'}
              `}
            >
              {/* Always display date and month on top */}
              {groupedDroppedImages && groupedDroppedImages[dayKey] ? (
                <div className={`absolute top-1 left-1 z-30 w-auto min-w-8 h-8 flex items-center justify-center px-2 bg-white border ${isToday ? 'border-blue-500' : 'border-gray-300'} rounded-full text-[0.7rem] font-semibold ${isToday ? 'text-blue-600' : ''}`}>
                  <span className="hidden 2xl:inline mr-1">{month >= 0 ? `${getMonthAbbr(month)}` : ''}</span>
                  {day}
                </div>
              ) : (
                <span
                  className={`absolute left-1 top-1 flex items-center justify-center rounded-full select-none text-[0.5rem] sm:text-[0.6rem] md:text-[0.75rem] lg:text-sm px-2 ${
                    isToday ? "bg-blue-500 font-semibold text-white min-w-6 h-6" : ""
                  } ${month < 0 ? "text-slate-400" : "text-slate-800"}`}
                >
                  <span className="hidden 2xl:inline mr-1">{month >= 0 ? `${getMonthAbbr(month)}` : ''}</span>
                  {day}
                </span>
              )}
              {isNewMonth && (
                <span className={`z-30 absolute bottom-0.5 left-0 w-full truncate px-1.5 text-[0.5rem] sm:text-[0.6rem] md:text-[0.75rem] lg:text-lg font-semibold ${isToday ? 'text-blue-600' : 'text-slate-500'} select-none`}>
                  {monthNames[month]}
                </span>
              )}
              {/* Drop Zone Indicator */}
              {hoveredCellKey === dayKey && draggedCardId && month >= 0 && (
                <div className="absolute inset-0 flex items-center justify-center border-2 border-dashed border-blue-400 bg-blue-50/50 rounded-xl z-20 pointer-events-none">
                  <span className="text-blue-600 font-medium text-sm">drop here</span>
                </div>
              )}
              {month >= 0 &&
                groupedDroppedImages &&
                groupedDroppedImages[dayKey] && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {(() => {
                      const cards = groupedDroppedImages[dayKey];
                      // For multiple cards, display a common "Priority" (if any card qualifies) at the top.
                      let showPriority = false;
                      if (cards.length > 1) {
                        for (const card of cards) {
                          if (imageMetadata && imageMetadata[card.id]) {
                            const cardLabel = imageMetadata[card.id]?.label;
                            if (
                              cardLabel === "Ready for Approval" ||
                              cardLabel === "Needs Revision"
                            ) {
                              const cellDate = new Date(year, month, day);
                              const todayDate = new Date();
                              todayDate.setHours(0, 0, 0, 0);
                              cellDate.setHours(0, 0, 0, 0);
                              const diffInDays =
                                (cellDate.getTime() - todayDate.getTime()) /
                                (1000 * 3600 * 24);
                              if (diffInDays >= 0 && diffInDays <= 7) {
                                showPriority = true;
                                break;
                              }
                            }
                          }
                        }
                      }
                      if (cards.length === 1) {
                        // Render single card as before using Next.js Image
                        const card = cards[0];
                        const cardTooltipKey = `single-${card.id}`;
                        return (
                          <div
                            draggable={!isCardInTransit(card.id) && !processingCards.has(card.id)}
                            onDragStart={(e) => {
                              e.dataTransfer.setData("imageId", card.id);
                              e.dataTransfer.setData("sourceKey", dayKey);
                              setDraggedCardId(card.id);
                              setDragPosition({ x: e.clientX, y: e.clientY });
                            }}
                            className={`w-[90%] h-[85%] lg:h-[80%] xl:h-[85%] relative user-select-none ${isToday 
                              ? 'bg-gray-50 darkest-shadow rounded-xl border-[1.5px] border-gray-400 flex overflow-hidden cursor-grab hover:scale-105 transition-all duration-200' 
                              : 'bg-[#f5f5f4] darker-shadow rounded-xl border border-gray-300 flex overflow-hidden cursor-grab hover:scale-105 transition-transform duration-200'
                            } ${draggedCardId === card.id ? "opacity-0" : ""}`}
                          >
                            {/* Add processing overlay */}
                            {processingCards.has(card.id) && (
                              <div className="absolute inset-0 z-50 processing-overlay rounded-xl flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
                              </div>
                            )}
                            
                            {/* Status button in top right corner */}
                            {(() => {
                              if (imageMetadata && imageMetadata[card.id]) {
                                const cardLabel = imageMetadata[card.id]?.label;
                                const isReadyForApprovalToday = isToday && cardLabel === "Ready for Approval";
                                
                                // Button styles and icons based on status
                                if (cardLabel === "Approved") {
                                  return (
                                    <button 
                                      className="absolute top-1 right-1 z-50 bg-green-500 text-white p-1 rounded-full shadow-md hover:bg-green-600 transition-colors"
                                      onClick={(e) => handleApproveToggle(e, card.id, cardLabel)}
                                      onMouseEnter={() => setTooltipVisible({...tooltipVisible, [cardTooltipKey]: true})}
                                      onMouseLeave={() => setTooltipVisible({...tooltipVisible, [cardTooltipKey]: false})}
                                      title="Click to unapprove"
                                    >
                                      <CheckCircleIcon className="h-3 w-3 lg:h-4 lg:w-4" />
                                      {tooltipVisible[cardTooltipKey] && (
                                        <div className="absolute -top-8 right-0 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-90">
                                          Click to unapprove
                                        </div>
                                      )}
                                    </button>
                                  );
                                } else if (cardLabel === "Ready for Approval") {
                                  return (
                                    <>
                                      <button
                                        title="Click to approve"
                                        onClick={(e) => handleApproveToggle(e, card.id, cardLabel)}
                                        onMouseEnter={() => setTooltipVisible({...tooltipVisible, [cardTooltipKey]: true})}
                                        onMouseLeave={() => setTooltipVisible({...tooltipVisible, [cardTooltipKey]: false})}
                                        className={`absolute top-1 right-1 z-40 bg-purple-500 text-white p-1.5 rounded-full shadow-md hover:bg-purple-600 hover:scale-110 transition-all ${isReadyForApprovalToday ? 'pulse-animation' : ''}`}
                                      >
                                        <ClockIcon className="h-3.5 w-3.5 lg:h-4.5 lg:w-4.5" />
                                      </button>
                                      
                                      {isReadyForApprovalToday && (
                                        <div className="approval-indicator">
                                          <div className="text-purple-700 font-semibold">Click to <span className="font-bold text-purple-800">approve</span>!</div>
                                        </div>
                                      )}
                                      
                                      {tooltipVisible[cardTooltipKey] && !isReadyForApprovalToday && (
                                        <div className="absolute -top-8 right-0 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-90">
                                          Click to approve
                                        </div>
                                      )}
                                    </>
                                  );
                                } else if (cardLabel === "Needs Revision") {
                                  return (
                                    <button
                                      title="Click to approve"
                                      onClick={(e) => handleApproveToggle(e, card.id, cardLabel)}
                                      onMouseEnter={() => setTooltipVisible({...tooltipVisible, [cardTooltipKey]: true})}
                                      onMouseLeave={() => setTooltipVisible({...tooltipVisible, [cardTooltipKey]: false})}
                                      className="absolute top-1 right-1 z-50 bg-orange-500 text-white p-1 rounded-full shadow-md hover:bg-orange-600 transition-colors"
                                    >
                                      <ArrowPathIcon className="h-3 w-3 lg:h-4 lg:w-4" />
                                      {tooltipVisible[cardTooltipKey] && (
                                        <div className="absolute -top-8 right-0 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-90">
                                          Click to approve
                                        </div>
                                      )}
                                    </button>
                                  );
                                } else if (cardLabel !== "Draft") {
                                  // Don't show approval button for Draft status
                                  return (
                                    <button
                                      title="Click to approve"
                                      onClick={(e) => handleApproveToggle(e, card.id, cardLabel)}
                                      onMouseEnter={() => setTooltipVisible({...tooltipVisible, [cardTooltipKey]: true})}
                                      onMouseLeave={() => setTooltipVisible({...tooltipVisible, [cardTooltipKey]: false})}
                                      className="absolute top-1 right-1 z-50 bg-green-500 text-white p-1 rounded-full shadow-md hover:bg-green-600 transition-colors"
                                    >
                                      <CheckCircleIcon className="h-3 w-3 lg:h-4 lg:w-4" />
                                      {tooltipVisible[cardTooltipKey] && (
                                        <div className="absolute -top-8 right-0 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-90">
                                          Click to approve
                                        </div>
                                      )}
                                    </button>
                                  );
                                }
                              }
                              return null;
                            })()}
                            
                            <div className={`${isTight ? 'w-full order-1' : 'w-2/5 lg:w-3/5 xl:w-1/2'} flex flex-col justify-center items-start p-1 pl-3`}>
                              {(() => {
                                if (imageMetadata && imageMetadata[card.id]) {
                                  const cardLabel = imageMetadata[card.id]?.label;
                                  const cellDate = new Date(year, month, day);
                                  const todayDate = new Date();
                                  todayDate.setHours(0, 0, 0, 0);
                                  cellDate.setHours(0, 0, 0, 0);
                                  const diffInDays =
                                    (cellDate.getTime() - todayDate.getTime()) /
                                    (1000 * 3600 * 24);
                                  return (
                                    <>
                                      {diffInDays >= 0 &&
                                        diffInDays <= 7 &&
                                        (cardLabel === "Ready for Approval" ||
                                          cardLabel === "Needs Revision") && (
                                          <div className="mb-1 px-1 rounded text-[0.2rem] sm:text-[0.22rem] md:text-[0.35rem] lg:text-[0.62rem] font-semibold bg-red-100 text-red-700 hidden 2xl:block">
                                            Priority
                                          </div>
                                        )}
                                      <div
                                        className={`px-1 rounded text-[0.2rem] sm:text-[0.22rem] md:text-[0.35rem] lg:text-[0.62rem] font-semibold text-gray-800 ${getLabelBg(
                                          cardLabel
                                        )} ${getLabelOutline(cardLabel)} hidden 2xl:block`}
                                      >
                                        {formatLabel(cardLabel)}
                                      </div>
                                    </>
                                  );
                                }
                                return null;
                              })()}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSeeDetails && onSeeDetails(card.id);
                                }}
                                className={`mt-1 bg-gray-700 hover:bg-gray-800 text-white px-1 lg:px-2 py-1 rounded-md text-[0.2rem] sm:text-[0.22rem] md:text-[0.35rem] lg:text-[0.62rem] font-medium shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-1 ${isTight ? 'w-full justify-center' : ''}`}
                              >
                                <span className="hidden lg:inline">
                                  Open
                                </span>
                                <PencilIcon className="lg:hidden h-3 w-3 flex-shrink-0" />
                                <EyeIcon className="hidden 2xl:block h-3 w-3 lg:h-3.5 lg:w-3.5" />
                              </button>
                            </div>
                            <div className={`${isTight ? 'w-full order-2' : 'w-3/5 lg:w-2/5 xl:w-1/2'} flex items-center justify-center p-1`}>
                              <div className="w-full h-full p-1 lg:pt-2 lg:pb-2 xl:pt-3 xl:pb-3 flex items-center justify-center overflow-visible">
                                <ImageWithLoading 
                                  key={`${projectId}-${card.id}`} 
                                  src={card.url} 
                                  alt="Dropped" 
                                />
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        // More than one card: render vertical list (limit max cards to 4)
                        const limitedCards = cards.slice(0, 4);
                        return (
                          <div className="w-[90%] h-[85%] lg:h-[80%] xl:h-[85%] flex flex-col space-y-1 overflow-auto">
                            {/* Add month and day header for multi-card view */}
                            <div className="w-full flex justify-center mb-1">
                              <div className="px-2 py-0.5 rounded-full text-[0.6rem] font-semibold bg-white border border-gray-300 shadow-sm">
                                <span className="hidden 2xl:inline mr-1">{month >= 0 ? `${getMonthAbbr(month)}` : ''}</span>
                                {day}
                              </div>
                            </div>
                            {showPriority && (
                              <div className="w-full flex justify-center">
                                <div className="px-1 rounded text-[0.2rem] sm:text-[0.22rem] md:text-[0.35rem] lg:text-[0.62rem] font-semibold bg-red-100 text-red-700">
                                  Priority
                                </div>
                              </div>
                            )}
                            {limitedCards.map((card) => (
                              <div
                                key={card.id}
                                draggable={!isCardInTransit(card.id) && !processingCards.has(card.id)}
                                onDragStart={(e) => {
                                  e.dataTransfer.setData("imageId", card.id);
                                  e.dataTransfer.setData("sourceKey", dayKey);
                                  setDraggedCardId(card.id);
                                  setDragPosition({ x: e.clientX, y: e.clientY });
                                }}
                                className={`w-full relative user-select-none ${isToday 
                                  ? 'bg-blue-50 darkest-shadow rounded-xl border-[1.5px] border-blue-300 flex overflow-hidden cursor-grab hover:scale-105 transition-all duration-200' 
                                  : 'bg-[#f5f5f4] darker-shadow rounded-xl border border-gray-300 flex overflow-hidden cursor-grab hover:scale-105 transition-transform duration-200'
                                } ${draggedCardId === card.id ? "opacity-0" : ""}`}
                                style={{ height: "30%" }}
                              >
                                {/* Add processing overlay */}
                                {processingCards.has(card.id) && (
                                  <div className="absolute inset-0 z-50 processing-overlay rounded-xl flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
                                  </div>
                                )}
                                
                                {/* Status button in top right corner */}
                                {(() => {
                                  if (imageMetadata && imageMetadata[card.id]) {
                                    const cardLabel = imageMetadata[card.id]?.label;
                                    const cardTooltipKey = `multi-${card.id}`;
                                    const isReadyForApprovalToday = isToday && cardLabel === "Ready for Approval";
                                    
                                    // Button styles and icons based on status
                                    if (cardLabel === "Approved") {
                                      return (
                                        <button 
                                          className="absolute top-1 right-1 z-50 bg-green-500 text-white p-1 rounded-full shadow-md hover:bg-green-600 transition-colors"
                                          onClick={(e) => handleApproveToggle(e, card.id, cardLabel)}
                                          onMouseEnter={() => setTooltipVisible({...tooltipVisible, [cardTooltipKey]: true})}
                                          onMouseLeave={() => setTooltipVisible({...tooltipVisible, [cardTooltipKey]: false})}
                                          title="Click to unapprove"
                                        >
                                          <CheckCircleIcon className="h-3 w-3 lg:h-3 lg:w-3" />
                                          {tooltipVisible[cardTooltipKey] && (
                                            <div className="absolute -top-8 right-0 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-90">
                                              Click to unapprove
                                            </div>
                                          )}
                                        </button>
                                      );
                                    } else if (cardLabel === "Ready for Approval") {
                                      return (
                                        <>
                                          <button
                                            title="Click to approve"
                                            onClick={(e) => handleApproveToggle(e, card.id, cardLabel)}
                                            onMouseEnter={() => setTooltipVisible({...tooltipVisible, [cardTooltipKey]: true})}
                                            onMouseLeave={() => setTooltipVisible({...tooltipVisible, [cardTooltipKey]: false})}
                                            className={`absolute top-1 right-1 z-40 bg-purple-500 text-white p-1.5 rounded-full shadow-md hover:bg-purple-600 hover:scale-110 transition-all ${isReadyForApprovalToday ? 'pulse-animation' : ''}`}
                                          >
                                            <ClockIcon className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                                          </button>
                                          
                                          {isReadyForApprovalToday && (
                                            <div className="approval-indicator" style={{ top: '26px' }}>
                                              <div className="text-purple-700 font-semibold">Click to <span className="font-bold text-purple-800">approve</span>!</div>
                                            </div>
                                          )}
                                          
                                          {tooltipVisible[cardTooltipKey] && !isReadyForApprovalToday && (
                                            <div className="absolute -top-8 right-0 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-90">
                                              Click to approve
                                            </div>
                                          )}
                                        </>
                                      );
                                    } else if (cardLabel === "Needs Revision") {
                                      return (
                                        <button
                                          title="Click to approve"
                                          onClick={(e) => handleApproveToggle(e, card.id, cardLabel)}
                                          onMouseEnter={() => setTooltipVisible({...tooltipVisible, [cardTooltipKey]: true})}
                                          onMouseLeave={() => setTooltipVisible({...tooltipVisible, [cardTooltipKey]: false})}
                                          className="absolute top-1 right-1 z-50 bg-orange-500 text-white p-1 rounded-full shadow-md hover:bg-orange-600 transition-colors"
                                        >
                                          <ArrowPathIcon className="h-3 w-3 lg:h-4 lg:w-4" />
                                          {tooltipVisible[cardTooltipKey] && (
                                            <div className="absolute -top-8 right-0 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-90">
                                              Click to approve
                                            </div>
                                          )}
                                        </button>
                                      );
                                    } else if (cardLabel !== "Draft") {
                                      // Don't show approval button for Draft status
                                      return (
                                        <button
                                          title="Click to approve"
                                          onClick={(e) => handleApproveToggle(e, card.id, cardLabel)}
                                          onMouseEnter={() => setTooltipVisible({...tooltipVisible, [cardTooltipKey]: true})}
                                          onMouseLeave={() => setTooltipVisible({...tooltipVisible, [cardTooltipKey]: false})}
                                          className="absolute top-1 right-1 z-50 bg-green-500 text-white p-1 rounded-full shadow-md hover:bg-green-600 transition-colors"
                                        >
                                          <CheckCircleIcon className="h-3 w-3 lg:h-3 lg:w-3" />
                                          {tooltipVisible[cardTooltipKey] && (
                                            <div className="absolute -top-8 right-0 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-90">
                                              Click to approve
                                            </div>
                                          )}
                                        </button>
                                      );
                                    }
                                  }
                                  return null;
                                })()}
                                
                                <div className={`${isTight ? 'w-full order-1' : 'w-2/5 lg:w-3/5 xl:w-1/2'} flex flex-col justify-center items-start p-1 pl-3`}>
                                  {(() => {
                                    if (imageMetadata && imageMetadata[card.id]) {
                                      const cardLabel = imageMetadata[card.id]?.label;
                                      const cellDate = new Date(year, month, day);
                                      const todayDate = new Date();
                                      todayDate.setHours(0, 0, 0, 0);
                                      cellDate.setHours(0, 0, 0, 0);
                                      const diffInDays =
                                        (cellDate.getTime() - todayDate.getTime()) /
                                        (1000 * 3600 * 24);
                                      return (
                                        <div
                                          className={`px-1 rounded text-[0.2rem] sm:text-[0.22rem] md:text-[0.35rem] lg:text-[0.62rem] font-semibold text-gray-800 ${getLabelBg(
                                              cardLabel
                                            )} ${getLabelOutline(cardLabel)} hidden 2xl:block`}
                                        >
                                          {formatLabel(cardLabel)}
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onSeeDetails && onSeeDetails(card.id);
                                    }}
                                    className={`mt-1 bg-gray-700 hover:bg-gray-800 text-white px-1 lg:px-2 py-1 rounded-md text-[0.2rem] sm:text-[0.22rem] md:text-[0.35rem] lg:text-[0.62rem] font-medium shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-1 ${isTight ? 'w-full justify-center' : ''}`}
                                  >
                                    <span className="hidden lg:inline">
                                      Open
                                    </span>
                                    <PencilIcon className="lg:hidden h-3 w-3 flex-shrink-0" />
                                    <EyeIcon className="hidden 2xl:block h-3 w-3 lg:h-3.5 lg:w-3.5" />
                                  </button>
                                </div>
                                <div className={`${isTight ? 'w-full order-2' : 'w-3/5 lg:w-2/5 xl:w-1/2'} flex items-center justify-center p-1`}>
                                  <div className="w-full h-full p-1 lg:pt-2 lg:pb-2 xl:pt-3 xl:pb-3 flex items-center justify-center overflow-visible">
                                    <ImageWithLoading 
                                      key={`${projectId}-${card.id}`} 
                                      src={card.url} 
                                      alt="Dropped" 
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      }
                    })()}
                  </div>
                )}
            </div>
          );
        })}
      </div>
    ));
  }, [year, droppedImages, onClick, onImageDrop, handleDayClick, groupedDroppedImages, expandedView]); // Added expandedView to dependencies

  useEffect(() => {
    const calendarContainer = document.querySelector(".calendar-container");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const m = parseInt(entry.target.getAttribute("data-month")!, 10);
            setSelectedMonth(m);
          }
        });
      },
      {
        root: calendarContainer,
        rootMargin: "-75% 0px -25% 0px",
        threshold: 0,
      }
    );
    dayRefs.current.forEach((ref) => {
      if (ref && ref.getAttribute("data-day") === "15") {
        observer.observe(ref);
      }
    });
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <ImageCacheProvider>
      <div
        className={`calendar-container no-scrollbar overflow-auto rounded-t-2xl bg-white pb-10 text-slate-800 shadow-xl ${expandedView ? 'expanded-calendar' : ''}`}
        style={{ maxHeight: "calc(100vh - 120px)" }}
      >
        <KeyframesStyle />
        <div className="sticky top-0 z-50 w-full rounded-t-2xl bg-white px-4 sm:px-6 md:px-8 py-4 shadow-sm border-b border-gray-100 calendar-controls">
          <div className="flex items-center justify-between mb-4 px-4 sm:px-6 md:px-8">
            {/* Left group */}
            <div className="flex items-center gap-3">
              <Select
                name="month"
                value={selectedMonth.toString()}
                onChange={handleMonthChange}
                options={monthOptions}
                className="min-w-[120px]"
              />
              <button
                onClick={handleTodayClick}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-full hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <svg
                  className="w-4 h-4 text-gray-600"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path 
                    d="M8 7V3M16 7V3M7 11H17M5 21H19C20.1046 21 21 20.1046 21 19V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V19C3 20.1046 3.89543 21 5 21Z" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
                <span>Today</span>
              </button>
            </div>

            {/* Center - Social Media Switch */}
            {onInstanceChange && (
              <div className="flex-1 flex justify-center">
                <SocialMediaSwitch 
                  activeInstance={activeInstance}
                  onInstanceChange={onInstanceChange}
                />
              </div>
            )}
            
            {/* Right group - Year Navigation Controls with Messenger and Notification */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsTodoModalOpen(true)}
                className="hidden lg:flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white shadow-md shadow-black/20 transition-colors hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-1"
              >
                <ClipboardDocumentListIcon className="h-4 w-4" />
                <span>To do list</span>
              </button>
              <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-full px-3 py-2 shadow-sm">
                <button
                  onClick={handlePrevYear}
                  className="rounded-full p-1 hover:bg-gray-50 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Previous year"
                >
                  <svg
                    className="h-4 w-4 text-gray-600"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <span className="text-sm font-medium px-2 text-gray-700">
                  {year}
                </span>
                <button
                  onClick={handleNextYear}
                  className="rounded-full p-1 hover:bg-gray-50 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Next year"
                >
                  <svg
                    className="h-4 w-4 text-gray-600"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
              <MessengerButton 
                projectId={projectId} 
                projectName={projectName || "Project"} 
              />
              {projectId && <NotificationBell projectId={projectId} />}
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1.5 text-center text-[0.6rem] sm:text-[0.75rem] md:text-xs font-medium text-gray-600 mb-1.5 bg-gray-50 rounded-lg p-1 border border-gray-100">
            {daysOfWeek.map((day, index) => (
              <div key={index} className="py-1 border-b border-gray-200 rounded-md">
                {day}
              </div>
            ))}
          </div>
        </div>
        <div className="px-4 sm:px-6 md:px-8 pt-4">{generateCalendar}</div>
      </div>
      {/* Floating Dragged Card */}
      {draggedCardId && dragPosition && imageMetadata?.[draggedCardId] && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: `${dragPosition.x}px`,
            top: `${dragPosition.y}px`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-100 opacity-60 scale-110 shadow-2xl border-2 border-blue-400">
            {/* Status Indicator */}
            <div className="absolute top-1 left-1/2 transform -translate-x-1/2 z-10">
              <div
                className={`w-3 h-3 rounded-full border-2 border-white shadow-sm ${
                  !imageMetadata[draggedCardId].label
                    ? "bg-gray-400"
                    : imageMetadata[draggedCardId].label.toLowerCase() === "approved"
                    ? "bg-green-500"
                    : imageMetadata[draggedCardId].label.toLowerCase() === "draft"
                    ? "bg-amber-500"
                    : imageMetadata[draggedCardId].label.toLowerCase() === "needs revision"
                    ? "bg-red-500"
                    : imageMetadata[draggedCardId].label.toLowerCase() === "ready for approval"
                    ? "bg-blue-500"
                    : imageMetadata[draggedCardId].label.toLowerCase() === "scheduled"
                    ? "bg-purple-500"
                    : "bg-gray-400"
                }`}
              />
            </div>
            {/* Image */}
            <Image
              src={imageMetadata[draggedCardId].url}
              alt={imageMetadata[draggedCardId].title || "Content"}
              fill
              className="object-cover"
              sizes="96px"
              draggable={false}
            />
          </div>
        </div>
      )}
      <TodoListModal
        visible={isTodoModalOpen}
        onClose={() => setIsTodoModalOpen(false)}
        projectId={projectId}
        projectName={projectName}
        activeYear={year}
      />
    </ImageCacheProvider>
  );
};

export interface SelectProps {
  name: string;
  value: string;
  label?: string;
  options: { name: string; value: string }[];
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
}

export const Select = ({
  name,
  value,
  label,
  options = [],
  onChange,
  className,
}: SelectProps) => (
  <div className={`relative ${className}`}>
    {label && (
      <label
        htmlFor={name}
        className="mb-1 block font-medium text-slate-800 select-none text-[0.6rem]"
      >
        {label}
      </label>
    )}
    <select
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      className="cursor-pointer appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-4 pr-10 text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      required
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.name}
        </option>
      ))}
    </select>
    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
      <svg
        className="h-4 w-4 text-gray-400"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
          clipRule="evenodd"
        />
      </svg>
    </span>
  </div>
);
