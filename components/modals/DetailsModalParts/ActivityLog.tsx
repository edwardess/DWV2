import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUpIcon, ChevronDownIcon, ClockIcon } from '@heroicons/react/24/outline';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export interface Activity {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  action: string;
  timestamp: Date | string;
  details?: string;
}

interface ActivityLogProps {
  activities: Activity[];
  isExpanded: boolean;
  onToggle: () => void;
}

// Helper function to safely format dates
const formatDate = (date: Date | string | undefined): string => {
  if (!date) return "Just now";
  
  try {
    // If it's already a Date object
    if (date instanceof Date) {
      return isNaN(date.getTime()) 
        ? "Just now" 
        : date.toLocaleString();
    }
    
    // If it's a string, try to convert to Date
    if (typeof date === 'string') {
      // Handle Firebase Timestamp format which might be stored as an object with seconds and nanoseconds
      if (date.includes('seconds') && date.includes('nanoseconds')) {
        try {
          const parsedTimestamp = JSON.parse(date);
          if (parsedTimestamp.seconds) {
            const milliseconds = parsedTimestamp.seconds * 1000;
            const dateObj = new Date(milliseconds);
            return isNaN(dateObj.getTime()) 
              ? "Just now" 
              : dateObj.toLocaleString();
          }
        } catch (e) {
          // If parsing fails, continue to regular date parsing
        }
      }
      
      // Try regular Date parsing
      const dateObj = new Date(date);
      return isNaN(dateObj.getTime()) 
        ? "Just now" 
        : dateObj.toLocaleString();
    }
    
    return "Just now";
  } catch (e) {
    return "Just now";
  }
};

const ActivityLog: React.FC<ActivityLogProps> = ({ activities, isExpanded, onToggle }) => {
  // Debug logging for activities
  useEffect(() => {
    console.log('ActivityLog component received activities:', activities);
  }, [activities]);

  // Ensure activities is always an array
  const safeActivities = Array.isArray(activities) ? activities : [];
  
  return (
    <div className="w-full sticky bottom-0 z-10 shadow-md">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "w-full h-8 flex items-center justify-center gap-2 px-4",
          "bg-primary/10 hover:bg-primary/15 transition-colors", 
          "text-xs font-medium text-foreground",
          "border-t border-primary/20 relative"
        )}
      >
        <ClockIcon className="h-4 w-4 text-primary" />
        <span className="font-semibold">Activity History</span>
        {safeActivities.length > 0 && (
          <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold animate-pulse">
            {safeActivities.length}
          </span>
        )}
        <span className="ml-1.5">
          {isExpanded ? (
            <ChevronUpIcon className="h-3.5 w-3.5" />
          ) : (
            <ChevronDownIcon className="h-3.5 w-3.5" />
          )}
        </span>
        
        {/* Add notification dot for empty state to draw attention */}
        {safeActivities.length === 0 && (
          <span className="absolute top-2.5 right-3 h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border bg-background"
          >
            <ScrollArea className="h-[150px] w-full">
              <div className="px-4 py-2.5">
                {safeActivities.length > 0 ? (
                  <div className="space-y-2">
                    {safeActivities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start space-x-2 text-xs group hover:bg-accent/50 p-1.5 rounded-lg transition-colors"
                      >
                        {activity.userPhoto ? (
                          <img
                            src={activity.userPhoto}
                            alt={activity.userName}
                            className="w-5 h-5 rounded-full"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-[10px] text-primary">
                              {activity.userName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="text-xs">
                            <span className="font-medium">{activity.userName}</span>{' '}
                            {activity.action}
                          </p>
                          {activity.details && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {activity.details}
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {formatDate(activity.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-2 text-muted-foreground">
                    <ClockIcon className="h-5 w-5 mb-1.5 text-muted-foreground/50" />
                    <p className="text-xs font-medium mb-0.5">No activity recorded yet</p>
                    <p className="text-[10px] text-center max-w-md">
                      Activity will be recorded when actions are taken.
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ActivityLog; 