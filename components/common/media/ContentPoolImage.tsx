import React, { useState, useEffect } from 'react';
import { generateCloudinaryURL } from '@/utils/generateCloudinaryUrl';
import { ImageErrorBoundary } from './ImageErrorBoundary';

interface ContentPoolImageProps {
  src: string;
  id: string;
  alt?: string;
  className?: string;
  isListView?: boolean;
  label?: string;
  onEdit?: () => void;
  title?: string;
  inTransit?: boolean;
  isDragging?: boolean;
  onDragStartCallback?: (id: string) => void;
}

const ContentPoolImage: React.FC<ContentPoolImageProps> = ({ 
  src, 
  id,
  alt = "Content Image", 
  className = '', 
  isListView = false,
  label = "",
  onEdit,
  title = "",
  inTransit = false,
  isDragging = false,
  onDragStartCallback
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [optimizedSrc, setOptimizedSrc] = useState('');
  const [cooldownProgress, setCooldownProgress] = useState(0);
  const [isInCooldown, setIsInCooldown] = useState(false);
  const COOLDOWN_DURATION = 1000; // 1 second cooldown

  useEffect(() => {
    setIsLoading(true);
    setError(false);
    
    try {
      // Use Cloudinary to optimize the image
      const cloudinarySrc = generateCloudinaryURL(src, isListView ? 100 : 400);
      setOptimizedSrc(cloudinarySrc);
      
      // Preload the image
      const img = new Image();
      img.onload = () => {
        setIsLoading(false);
      };
      img.onerror = () => {
        console.error('❌ Failed to load optimized image, falling back to original');
        setOptimizedSrc(src);
        setError(true);
        
        // Try again with original source
        const fallbackImg = new Image();
        fallbackImg.onload = () => {
          setIsLoading(false);
          setError(false);
          console.log('✅ Fallback to original image successful');
        };
        fallbackImg.src = src;
      };
      img.src = cloudinarySrc;
    } catch (err) {
      console.error('❌ Error setting up optimized image:', err);
      setOptimizedSrc(src);
      setError(true);
    }
  }, [src, isListView]);

  // Get background color based on label
  const getLabelBackground = () => {
    switch (label) {
      case "Approved":
        return "bg-green-500";
      case "Needs Revision":
        return "bg-orange-500";
      case "Ready for Approval":
        return "bg-purple-500";
      case "Scheduled":
        return "bg-blue-500";
      case "Draft":
        return "bg-amber-600";
      default:
        return "bg-gray-500";
    }
  };

  // Format label text for display
  const formatLabelText = () => {
    if (label === "Needs Revision") return "Revision";
    if (label === "Ready for Approval") return "For Approval";
    if (label === "Draft") return "Draft";
    return label;
  };

  // Add shimmer animation for loading state
  const renderShimmer = () => {
    if (!isLoading) return null;
    
    return (
      <div className="absolute inset-0 overflow-hidden bg-gradient-to-r from-gray-200 to-gray-300">
        <div className="absolute inset-0 overflow-hidden">
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0) 100%)',
              animation: 'shimmerAnimation 1.5s infinite',
            }}
          />
        </div>
      </div>
    );
  };

  // Add shimmer animation styles
  useEffect(() => {
    if (!document.getElementById('shimmer-animation')) {
      const style = document.createElement('style');
      style.id = 'shimmer-animation';
      style.innerHTML = `
        @keyframes shimmerAnimation {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    // Add user-select-none style to prevent text selection during dragging
    if (!document.getElementById('drag-styles')) {
      const style = document.createElement('style');
      style.id = 'drag-styles';
      style.innerHTML = `
        .user-select-none {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }
        
        .user-select-none img {
          -webkit-user-drag: none;
          -khtml-user-drag: none;
          -moz-user-drag: none;
          -o-user-drag: none;
          user-drag: none;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const renderImage = () => {
    if (error) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500 text-xs rounded-full">
          <span>Failed to load</span>
        </div>
      );
    }

    if (!isLoading) {
      return (
        <img 
          src={optimizedSrc} 
          alt={alt} 
          className={`${isListView ? 'w-[90%] h-[90%] object-cover m-auto' : 'absolute inset-[3%] w-[94%] h-[94%] object-contain'}`}
          style={{ borderRadius: "8px", border: "2px solid #047AC0" }}
          loading="lazy"
          draggable="false"
        />
      );
    }

    return null;
  };

  // Add cooldown animation styles
  useEffect(() => {
    if (!document.getElementById('cooldown-animation')) {
      const style = document.createElement('style');
      style.id = 'cooldown-animation';
      style.innerHTML = `
        @keyframes cooldownProgress {
          from { stroke-dashoffset: 100; }
          to { stroke-dashoffset: 0; }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const startCooldown = () => {
    if (!isInCooldown) {
      setIsInCooldown(true);
      setCooldownProgress(0);
      
      // Animate progress
      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / COOLDOWN_DURATION) * 100, 100);
        setCooldownProgress(progress);
        
        if (progress < 100) {
          requestAnimationFrame(animate);
        } else {
          setIsInCooldown(false);
        }
      };
      requestAnimationFrame(animate);
    }
  };

  const renderCooldownIndicator = () => {
    if (!isInCooldown) return null;
    
    const size = isListView ? 24 : 32;
    const strokeWidth = 2;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = ((100 - cooldownProgress) / 100) * circumference;

    return (
      <div className="absolute top-2 right-2 z-10">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#047AC0"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{
              transition: 'stroke-dashoffset 0.1s linear'
            }}
          />
        </svg>
      </div>
    );
  };

  if (isListView) {
    return (
      <div
        draggable={!inTransit && !isInCooldown}
        onDragStart={(e) => {
          if (isInCooldown) {
            e.preventDefault();
            return;
          }
          e.dataTransfer.setData("imageId", id);
          e.dataTransfer.setData("sourceKey", "pool");
          startCooldown();
          onDragStartCallback?.(id);
        }}
        className={`flex items-center gap-2 p-2 shadow-lg rounded bg-white border-b border-gray-300 mb-2 user-select-none ${
          isInCooldown ? 'cursor-wait' : 'cursor-move'
        } ${isDragging ? "opacity-0" : ""}`}
        title={isInCooldown ? "Please wait before moving again" : ""}
      >
        <ImageErrorBoundary>
        <div className="relative w-12 h-12 overflow-hidden rounded border border-[#047AC0]">
          {renderShimmer()}
            {renderImage()}
            {renderCooldownIndicator()}
        </div>
        </ImageErrorBoundary>
        <div className="flex-1 ml-2 flex flex-col">
          <div
            className={`text-xs font-semibold text-white px-1 rounded mb-1 ${getLabelBackground()}`}
          >
            {formatLabelText()}
          </div>
          <p className="text-xs font-medium">{title}</p>
        </div>
        <button 
          onClick={onEdit} 
          className={`p-1 ${isInCooldown ? 'opacity-50 cursor-wait' : ''}`} 
          title={isInCooldown ? "Please wait before editing" : "Edit"}
          disabled={isInCooldown}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-gray-600 hover:text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 17l-4 1 1-4 9.5-9.5z"
            />
          </svg>
        </button>
      </div>
    );
  }

  // Full view
  return (
    <div
      draggable={!inTransit && !isInCooldown}
      onDragStart={(e) => {
        if (isInCooldown) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData("imageId", id);
        e.dataTransfer.setData("sourceKey", "pool");
        startCooldown();
        onDragStartCallback?.(id);
      }}
      className={`relative rounded-lg shadow-xl p-4 bg-gray-100 border border-[#047AC0] mb-4 user-select-none ${
        isInCooldown ? 'cursor-wait' : 'cursor-move'
      } ${isDragging ? "opacity-0" : ""}`}
      title={isInCooldown ? "Please wait before moving again" : ""}
    >
      <div className="p-2">
        <div className="flex items-center justify-between mb-2">
          <div
            className={`text-xs font-semibold text-white px-1 rounded ${getLabelBackground()}`}
          >
            {label}
          </div>
          <button 
            onClick={onEdit} 
            className={`p-1 ${isInCooldown ? 'opacity-50 cursor-wait' : ''}`}
            title={isInCooldown ? "Please wait before editing" : "Edit"}
            disabled={isInCooldown}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-gray-600 hover:text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 17l-4 1 1-4 9.5-9.5z"
              />
            </svg>
          </button>
        </div>
        <ImageErrorBoundary>
        <div className="relative w-full" style={{ paddingBottom: '75%' }}>
          {renderShimmer()}
            {renderImage()}
            {renderCooldownIndicator()}
        </div>
        </ImageErrorBoundary>
      </div>
    </div>
  );
};

export default ContentPoolImage; 