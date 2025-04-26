"use client";

import React, { useEffect, useState, Fragment } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { Popover, Transition } from '@headlessui/react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '@/components/services/firebaseService';
import { useAuth } from '@/components/services/AuthProvider';
import { useSnack } from "@/components/common/feedback/Snackbar";
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  type: string;
  message: string;
  timestamp: any;
  read: boolean;
  metadata: any;
  projectId: string;
}

interface NotificationBellProps {
  projectId: string;
  onOpenDetails?: () => void;
}

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

    // Query user's notifications subcollection
    const userNotificationsRef = collection(db, 'users', user.uid, 'notifications');
    const q = query(
      userNotificationsRef,
      where('projectId', '==', projectId),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notificationData: Notification[] = [];
      let newUnreadCount = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        const timestamp = data.timestamp?.toDate?.() || data.timestamp;
        const notification = {
          id: doc.id,
          type: data.type,
          message: data.message,
          timestamp: timestamp instanceof Date ? timestamp : new Date(timestamp),
          read: data.read,
          metadata: data.metadata,
          projectId: data.projectId
        };
        
        notificationData.push(notification);
        
        if (!notification.read) {
          newUnreadCount++;
        }
      });
      
      setNotifications(notificationData);
      setUnreadCount(newUnreadCount);
    });

    return () => unsubscribe();
  }, [projectId, user]);

  const markAsRead = async (notificationId: string) => {
    if (!user) return;
    
    try {
      const notificationRef = doc(db, 'users', user.uid, 'notifications', notificationId);
      await updateDoc(notificationRef, { read: true });

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

  const markAllAsRead = async () => {
    if (!user || notifications.length === 0) return;

    try {
      const userNotificationsRef = collection(db, 'users', user.uid, 'notifications');
      const unreadQuery = query(
        userNotificationsRef,
        where('projectId', '==', projectId),
        where('read', '==', false)
      );
      
      const unreadDocs = await getDocs(unreadQuery);
      
      // Update all unread notifications
      const updatePromises = unreadDocs.docs.map(doc => 
        updateDoc(doc.ref, { read: true })
      );
      
      await Promise.all(updatePromises);

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

  // Add a helper function to safely format the timestamp
  const formatTimestamp = (timestamp: any) => {
    try {
      if (!timestamp) return 'Unknown time';
      
      // If it's a Firebase timestamp, convert to Date
      const date = timestamp?.toDate?.() || timestamp;
      
      // If it's a valid Date object or can be converted to one
      if (date instanceof Date || !isNaN(new Date(date).getTime())) {
        return formatDistanceToNow(new Date(date), { addSuffix: true });
      }
      
      return 'Unknown time';
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Unknown time';
    }
  };

  return (
    <Popover className="relative">
      {({ open }) => (
        <>
          <Popover.Button
            onClick={() => setIsOpen(true)}
            className="relative rounded-full p-1 hover:bg-gray-100 focus:outline-none"
          >
            <BellIcon className="h-6 w-6 text-gray-500" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
                {unreadCount}
              </span>
            )}
          </Popover.Button>

          <Transition
            show={open}
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel 
              static 
              className="absolute right-0 z-50 mt-2 w-80 transform"
            >
              <div className="overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5">
                <div className="relative bg-white p-3">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                    {notifications.length > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="mt-2 max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-center text-sm text-gray-500 py-4">
                        No notifications
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 ${notification.read ? 'bg-white' : 'bg-blue-50'} hover:bg-gray-50 cursor-pointer`}
                            onClick={() => handleNotificationClick(notification)}
                          >
                            <div className="flex items-start">
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm ${notification.read ? 'text-gray-900' : 'text-blue-900 font-medium'}`}>
                                  {notification.message}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                  {formatTimestamp(notification.timestamp)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
}; 