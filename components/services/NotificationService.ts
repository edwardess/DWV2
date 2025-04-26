import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  getDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  updateDoc,
  Timestamp,
  increment
} from 'firebase/firestore';
import { db } from './firebaseService';

// Time window for batching similar notifications (10 minutes in milliseconds)
const NOTIFICATION_BATCH_WINDOW_MS = 10 * 60 * 1000;

export type NotificationType = 'comment' | 'approval' | 'edit' | 'status_change';

interface NotificationMetadata {
  contentId?: string;
  userId?: string; // Actor user ID
  userName?: string;
  oldStatus?: string;
  newStatus?: string;
  comment?: string;
  contentTitle?: string;
  contentLocation?: string;
  editDetails?: string[];
  instance?: string;
}

interface CreateNotificationParams {
  projectId: string;
  type: NotificationType;
  message: string;
  metadata: NotificationMetadata;
}

/**
 * Gets project members to send notifications to
 */
const getProjectMembers = async (projectId: string): Promise<string[]> => {
  try {
    const projectRef = doc(db, 'projects', projectId);
    const projectDoc = await getDoc(projectRef);
    
    if (!projectDoc.exists()) return [];
    
    return projectDoc.data()?.memberIds || [];
  } catch (error) {
    console.error('Error getting project members:', error);
    return [];
  }
};

/**
 * Creates or updates a notification for a specific user.
 * Handles batching of similar notifications within the time window.
 */
const createUserNotification = async (
  userId: string,
  { projectId, type, message, metadata }: CreateNotificationParams
) => {
  try {
    // Define user's notification collection
    const userNotificationsRef = collection(db, 'users', userId, 'notifications');
    
    // For comment notifications, check if we should batch with existing notifications
    if (type === 'comment' && metadata.contentId && metadata.userId) {
      // Look for similar notifications within the time window
      const timeThreshold = new Date(Date.now() - NOTIFICATION_BATCH_WINDOW_MS);
      
      const recentNotificationsQuery = query(
        userNotificationsRef,
        where('type', '==', type),
        where('metadata.contentId', '==', metadata.contentId),
        where('metadata.userId', '==', metadata.userId),
        where('timestamp', '>=', Timestamp.fromDate(timeThreshold)),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      
      const recentNotifications = await getDocs(recentNotificationsQuery);
      
      if (!recentNotifications.empty) {
        // Update existing notification instead of creating a new one
        const existingDoc = recentNotifications.docs[0];
        const existingData = existingDoc.data();
        const currentCount = existingData.count || 1;
        
        // Construct updated message
        const userName = metadata.userName || 'Someone';
        const contentTitle = metadata.contentTitle || 'an item';
        const updatedMessage = `${userName} commented ${currentCount + 1} times on "${contentTitle}"`;
        
        await updateDoc(existingDoc.ref, {
          message: updatedMessage,
          count: increment(1),
          timestamp: serverTimestamp(),
          updated: serverTimestamp(),
          lastComment: metadata.comment
        });
        
        console.log(`Updated existing notification ${existingDoc.id} for user ${userId}`);
        return existingDoc.id;
      }
    }
    
    // Create a new notification document
    const notificationData = {
      projectId,
      type,
      message,
      metadata,
      timestamp: serverTimestamp(),
      created: serverTimestamp(),
      updated: serverTimestamp(),
      read: false,
      count: 1
    };
    
    const newNotificationRef = await addDoc(userNotificationsRef, notificationData);
    console.log(`Created new notification ${newNotificationRef.id} for user ${userId}`);
    return newNotificationRef.id;
  } catch (error) {
    console.error('Error creating/updating notification:', error);
    return null;
  }
};

/**
 * Creates notifications for all project members including the actor
 */
const createProjectNotification = async (
  params: CreateNotificationParams,
  excludeUserId?: string
) => {
  try {
    // Get all project members
    const memberIds = await getProjectMembers(params.projectId);
    
    // Create notifications for each member (including the one who triggered it)
    const notificationPromises = memberIds
      .map(memberId => createUserNotification(memberId, params));
    
    await Promise.all(notificationPromises);
    
    console.log(`Created notifications for ${notificationPromises.length} project members`);
  } catch (error) {
    console.error('Error creating project notifications:', error);
  }
};

// Helper function to format location date
const formatLocationDate = (location: string): string => {
  if (location === 'pool') return 'Content Pool';
  
  try {
    const [year, month, day] = location.split('-').map(Number);
    const date = new Date(year, month, day);
    return new Intl.DateTimeFormat('en-US', { 
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  } catch (error) {
    return location;
  }
};

// User-facing notification creation functions

export const createCommentNotification = async (
  projectId: string,
  contentId: string,
  userName: string,
  userId: string,
  comment: string,
  contentTitle?: string,
  location?: string,
  instance?: string
) => {
  const locationText = location ? ` placed at '${formatLocationDate(location)}'` : '';
  const instanceText = instance ? ` • ${instance}` : '';
  const message = `${userName} commented on the card with title "${contentTitle || 'Untitled'}"${locationText}${instanceText}`;
  
  await createProjectNotification({
    projectId,
    type: 'comment',
    message,
    metadata: {
      contentId,
      userId,
      userName,
      comment,
      contentTitle,
      contentLocation: location,
      instance
    }
  }, userId);
};

export const createApprovalNotification = async (
  projectId: string,
  contentId: string,
  userName: string,
  userId: string,
  oldStatus: string,
  newStatus: string,
  contentTitle?: string,
  location?: string,
  instance?: string
) => {
  const isApproving = newStatus === 'Approved';
  const locationText = location ? ` placed at '${formatLocationDate(location)}'` : '';
  const instanceText = instance ? ` • ${instance}` : '';
  const message = `${userName} has ${isApproving ? 'approved' : 'un-approved'} the card with title "${contentTitle || 'Untitled'}"${locationText}${instanceText}`;
  
  await createProjectNotification({
    projectId,
    type: 'approval',
    message,
    metadata: {
      contentId,
      userId,
      userName,
      oldStatus,
      newStatus,
      contentTitle,
      contentLocation: location,
      instance
    }
  }, userId);
};

export const createEditNotification = async (
  projectId: string,
  contentId: string,
  userName: string,
  userId: string,
  editDetails: string[] = [],
  contentTitle?: string,
  location?: string,
  instance?: string
) => {
  const locationText = location ? ` placed at '${formatLocationDate(location)}'` : '';
  const instanceText = instance ? ` • ${instance}` : '';
  const message = `${userName} edited the card with title "${contentTitle || 'Untitled'}"${locationText}${instanceText}`;
  
  await createProjectNotification({
    projectId,
    type: 'edit',
    message,
    metadata: {
      contentId,
      userId,
      userName,
      editDetails,
      contentTitle,
      contentLocation: location,
      instance
    }
  }, userId);
};

export const createStatusChangeNotification = async (
  projectId: string,
  contentId: string,
  userName: string,
  userId: string,
  oldStatus: string,
  newStatus: string,
  contentTitle?: string,
  location?: string,
  instance?: string
) => {
  const locationText = location ? ` placed at '${formatLocationDate(location)}'` : '';
  const instanceText = instance ? ` • ${instance}` : '';
  const message = `${userName} changed the status of the card with title "${contentTitle || 'Untitled'}" from ${oldStatus} to ${newStatus}${locationText}${instanceText}`;
  
  await createProjectNotification({
    projectId,
    type: 'status_change',
    message,
    metadata: {
      contentId,
      userId,
      userName,
      oldStatus,
      newStatus,
      contentTitle,
      contentLocation: location,
      instance
    }
  }, userId);
}; 