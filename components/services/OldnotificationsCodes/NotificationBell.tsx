"use client";

import React, { useEffect, useState, Fragment } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { Popover, Transition } from '@headlessui/react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/components/services/firebaseService';
import { useAuth } from '@/components/services/AuthProvider';
import { useSnack } from "@/components/common/feedback/Snackbar";
import { formatDistanceToNow } from 'date-fns';

// Constants for month names
const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Helper function to format date strings in a consistent way
const formatDateString = (dateString: string | Date): string => {
  try {
    // Handle case where the location is a date in the format "0-6" (month-day)
    if (typeof dateString === 'string') {
      const parts = dateString.split('-').map(part => parseInt(part, 10));
      
      // If the format is month-day like "0-6" (assuming 0=January)
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        const month = parts[0]; // Month is 0-indexed (0=January)
        const day = parts[1];
        const year = new Date().getFullYear();
        
        // Check if month is valid (0-11)
        if (month >= 0 && month < 12) {
          return `${monthNames[month]} ${day}, ${year}`;
        }
      }
      // If the format is year-month-day like "2025-0-5"
      else if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        const year = parts[0];
        const month = parts[1]; // Month is 0-indexed (0=January)
        const day = parts[2];
        
        if (month >= 0 && month < 12) {
          return `${monthNames[month]} ${day}, ${year}`;
        }
      }
      
      // Handle other date formats
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
      }
    } else if (dateString instanceof Date) {
      // If it's already a Date object
      return `${monthNames[dateString.getMonth()]} ${dateString.getDate()}, ${dateString.getFullYear()}`;
    }
    
    // If we can't parse it as a date, return it as is
    return String(dateString);
  } catch (error) {
    console.error('Error formatting date:', error);
    return String(dateString);
  }
};

interface NotificationBellProps {
  projectId: string;
  onOpenDetails?: (contentId: string) => void;
}

interface NotificationMetadata {
  contentId?: string;
  userId?: string;
  userName?: string;
  oldStatus?: string;
  newStatus?: string;
  comment?: string;
  contentTitle?: string;
  contentLocation?: string;
  editDetails?: string[];
  userPhotoURL?: string;
  instance?: string;
}

interface Notification {
  id: string;
  type: string;
  message: string;
  timestamp: Date;
  projectId: string;
  read: boolean;
  metadata: NotificationMetadata;
}

const NotificationItem = ({ notification, onClick }: { notification: Notification; onClick: () => void }) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const timeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    
    if (diffSec < 60) return 'just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  };

  const renderMessage = () => {
    const message = notification.message;
    const instance = notification.metadata?.instance;
    const contentLocation = notification.metadata?.contentLocation;
    
    // Format dates in the message if it contains a location reference
    let formattedMessage = message;
    
    // Check if the message contains content location that might be a date
    if (contentLocation && contentLocation !== 'pool') {
      // Try to parse as a date and replace if successful
      try {
        const formattedDate = formatDateString(contentLocation);
        
        // Only replace if it's a proper date (not just returning the string as is)
        if (formattedDate !== contentLocation) {
          // Replace "at X-Y" pattern with the formatted date
          formattedMessage = message.replace(`at ${contentLocation}`, `on ${formattedDate}`);
        }
      } catch (e) {
        console.error('Error formatting location in notification:', e);
      }
    }
    
    return (
      <>
        {formattedMessage}
        {instance && (
          <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {instance}
          </span>
        )}
      </>
    );
  };

  return (
    <button
      onClick={onClick}
      className={`
        w-full px-4 py-3 text-left transition-colors
        ${notification.read ? 'bg-white' : 'bg-blue-50'}
        hover:bg-gray-50
      `}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {notification.metadata?.userPhotoURL ? (
            <img
              src={notification.metadata.userPhotoURL}
              alt={notification.metadata.userName || "User"}
              className="h-8 w-8 rounded-full"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-medium">
              {notification.metadata?.userName 
                ? getInitials(notification.metadata.userName)
                : "U"}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm text-gray-900">
            {renderMessage()}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {notification.timestamp ? timeAgo(notification.timestamp) : 'Unknown time'}
          </div>
        </div>
      </div>
    </button>
  );
};

export const NotificationBell: React.FC<NotificationBellProps> = ({ 
  projectId,
  onOpenDetails 
}) => {
  const { createSnack } = useSnack();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!projectId || !user) return;

    // Query notifications for the current project
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('projectId', '==', projectId),
      orderBy('timestamp', 'desc')
    );

    // Create a separate collection for read status
    const readStatusRef = collection(db, 'notificationReadStatus');

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const newNotifications: Notification[] = [];
      
      // Get all read statuses for current user
      const readStatusQuery = query(
        readStatusRef,
        where('userId', '==', user.uid),
        where('projectId', '==', projectId)
      );
      const readStatusDocs = await getDocs(readStatusQuery);
      const readNotifications = new Set(
        readStatusDocs.docs.map(doc => doc.data().notificationId)
      );

      snapshot.forEach((doc) => {
        const data = doc.data();
        newNotifications.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate(),
          read: readNotifications.has(doc.id)
        } as Notification);
      });
      
      setNotifications(newNotifications);
      setUnreadCount(newNotifications.filter(n => !readNotifications.has(n.id)).length);
    });

    return () => unsubscribe();
  }, [projectId, user]);

  const markAsRead = async (notificationId: string) => {
    if (!user) return;
    
    try {
      // Instead of updating the notification itself, create a read status record
      const readStatusRef = collection(db, 'notificationReadStatus');
      const readStatusQuery = query(
        readStatusRef,
        where('userId', '==', user.uid),
        where('notificationId', '==', notificationId)
      );
      
      const existingStatus = await getDocs(readStatusQuery);
      
      if (existingStatus.empty) {
        await addDoc(readStatusRef, {
          userId: user.uid,
          notificationId,
          projectId,
          timestamp: new Date()
        });
      }

      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, read: true }
            : n
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Function to mark all visible notifications as read
  const markAllAsRead = async () => {
    if (!user || notifications.length === 0) return;

    try {
      const readStatusRef = collection(db, 'notificationReadStatus');
      
      // Create read status for all unread notifications
      const unreadNotifications = notifications.filter(n => !n.read);
      
      for (const notification of unreadNotifications) {
        const readStatusQuery = query(
          readStatusRef,
          where('userId', '==', user.uid),
          where('notificationId', '==', notification.id)
        );
        
        const existingStatus = await getDocs(readStatusQuery);
        
        if (existingStatus.empty) {
          await addDoc(readStatusRef, {
            userId: user.uid,
            notificationId: notification.id,
            projectId,
            timestamp: new Date()
          });
        }
      }

      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Auto-mark as read when opening popover
  useEffect(() => {
    if (isOpen && unreadCount > 0) {
      markAllAsRead();
    }
  }, [isOpen]);

  const handleNotificationClick = async (notification: Notification) => {
    console.log('=== NotificationBell handleNotificationClick START ===');
    console.log('Full notification object:', notification);
    console.log('metadata:', notification.metadata);
    console.log('contentId:', notification.metadata?.contentId);
    
    await markAsRead(notification.id);
    
    // If there's a contentId in the metadata, dispatch a custom event
    if (notification.metadata?.contentId) {
      console.log('Dispatching openContentDetails event with:', notification.metadata.contentId);
      const event = new CustomEvent('openContentDetails', { 
        detail: { 
          contentId: notification.metadata.contentId,
          projectId: notification.projectId
        }
      });
      window.dispatchEvent(event);
    } else {
      console.log('No contentId in metadata:', notification.metadata);
    }
    
    console.log('=== NotificationBell handleNotificationClick END ===');
  };

  return (
    <Popover className="relative">
      <Popover.Button
        className="
          flex items-center justify-center
          rounded-full p-2
          bg-background hover:bg-muted/50
          border border-border/50 hover:border-border
          shadow-sm hover:shadow
          transition-all duration-200
          text-muted-foreground hover:text-muted-foreground/80
        "
      >
        <span className="sr-only">View notifications</span>
        <div className="relative flex items-center justify-center">
          <BellIcon className="h-5 w-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 h-4 min-w-4 flex items-center justify-center px-1 text-[10px] font-medium bg-red-600 text-white rounded-full ring-2 ring-background">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </Popover.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-1"
      >
        <Popover.Panel className="absolute right-0 z-10 mt-2 w-96 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="divide-y divide-gray-100">
            <div className="px-4 py-3">
              <h3 className="text-sm font-medium">Notifications</h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClick={() => handleNotificationClick(notification)}
                  />
                ))
              ) : (
                <div className="p-4 text-center text-sm text-gray-500">
                  No notifications
                </div>
              )}
            </div>
            {notifications.length > 0 && (
              <div className="px-4 py-3">
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Mark all as read
                </button>
              </div>
            )}
          </div>
        </Popover.Panel>
      </Transition>
    </Popover>
  );
}; 