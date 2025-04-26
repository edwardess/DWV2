import { collection, addDoc, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import { db } from './firebaseService';
import { NotificationType } from '../common/notifications/types';

interface CreateNotificationParams {
  projectId: string;
  type: NotificationType;
  message: string;
  metadata: {
    contentId?: string;
    userId?: string;
    userName?: string;
    oldStatus?: string;
    newStatus?: string;
    comment?: string;
    contentTitle?: string;
    contentLocation?: string;
    editDetails?: string[];
    instance?: string;
  };
}

export const createNotification = async ({
  projectId,
  type,
  message,
  metadata
}: CreateNotificationParams) => {
  try {
    const notificationRef = collection(db, 'notifications');
    await addDoc(notificationRef, {
      projectId,
      type,
      message,
      metadata,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

const getContentDetails = async (projectId: string, contentId: string, instance: string = 'instagram') => {
  try {
    const projectRef = doc(db, 'projects', projectId);
    const projectDoc = await getDoc(projectRef);
    
    if (!projectDoc.exists()) return null;
    
    const imageMetadata = projectDoc.data()?.imageMetadata;
    
    // Map instance names to their corresponding keys in the data
    const instanceMapping: { [key: string]: string } = {
      facebook: 'fbig',
      instagram: 'instagram',
      tiktok: 'tiktok'
    };
    
    const instanceKey = instanceMapping[instance.toLowerCase()] || instance;
    const instanceData = imageMetadata?.[instanceKey];
    
    if (!instanceData || !instanceData[contentId]) return null;
    
    return {
      title: instanceData[contentId].title || 'Untitled',
      location: instanceData[contentId].location || 'pool'
    };
  } catch (error) {
    console.error('Error getting content details:', error);
    return null;
  }
};

const formatLocation = (location: string): string => {
  return location === 'pool' ? 'in Content Pool' : `at ${location}`;
};

// Helper to format instance name for display
const formatInstance = (instance: string): string => {
  // Capitalize first letter for display
  return instance === 'fbig' ? 'Facebook' : 
         instance === 'instagram' ? 'Instagram' : 
         instance === 'tiktok' ? 'TikTok' : 
         instance.charAt(0).toUpperCase() + instance.slice(1);
};

export const createApprovalNotification = async (
  projectId: string,
  contentId: string,
  userName: string,
  oldStatus: string,
  newStatus: string,
  instance: string = 'instagram'
) => {
  const contentDetails = await getContentDetails(projectId, contentId, instance);
  const title = contentDetails?.title || 'Untitled';
  const location = formatLocation(contentDetails?.location || 'pool');
  
  const isApproving = newStatus === 'Approved';
  const message = `${userName} has ${isApproving ? 'approved' : 'un-approved'} the content card with the title "${title}", ${location}.`;
  
  await createNotification({
    projectId,
    type: 'approval',
    message,
    metadata: {
      contentId,
      userName,
      oldStatus,
      newStatus,
      contentTitle: contentDetails?.title,
      contentLocation: contentDetails?.location,
      instance
    }
  });
};

export const createCommentNotification = async (
  projectId: string,
  contentId: string,
  userName: string,
  comment: string,
  instance: string = 'instagram'
) => {
  const contentDetails = await getContentDetails(projectId, contentId, instance);
  const title = contentDetails?.title || 'Untitled';
  const location = formatLocation(contentDetails?.location || 'pool');
  
  const message = `${userName} commented on content card with the title "${title}", ${location}.`;
  
  await createNotification({
    projectId,
    type: 'comment',
    message,
    metadata: {
      contentId,
      userName,
      comment,
      contentTitle: contentDetails?.title,
      contentLocation: contentDetails?.location,
      instance
    }
  });
};

export const createEditNotification = async (
  projectId: string,
  contentId: string,
  userName: string,
  editDetails: string[] = [],
  instance: string = 'instagram'
) => {
  const contentDetails = await getContentDetails(projectId, contentId, instance);
  const title = contentDetails?.title || 'Untitled';
  const location = formatLocation(contentDetails?.location || 'pool');
  
  const message = `${userName} has updated the content card with the title "${title}", ${location}.`;
  
  await createNotification({
    projectId,
    type: 'edit',
    message,
    metadata: {
      contentId,
      userName,
      contentTitle: contentDetails?.title,
      contentLocation: contentDetails?.location,
      editDetails,
      instance
    }
  });
};

export const createStatusChangeNotification = async (
  projectId: string,
  contentId: string,
  userName: string,
  oldStatus: string,
  newStatus: string,
  instance: string = 'instagram'
) => {
  const contentDetails = await getContentDetails(projectId, contentId, instance);
  const title = contentDetails?.title || 'Untitled';
  const location = formatLocation(contentDetails?.location || 'pool');
  
  const message = `${userName} has updated the content card with the title "${title}", ${location}.`;
  
  await createNotification({
    projectId,
    type: 'status_change',
    message,
    metadata: {
      contentId,
      userName,
      oldStatus,
      newStatus,
      contentTitle: contentDetails?.title,
      contentLocation: contentDetails?.location,
      instance
    }
  });
}; 