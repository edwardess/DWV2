/**
 * Notification System Migration Script
 * 
 * This script migrates notifications from the old structure to the new user-specific subcollections.
 * 
 * Features:
 * - Reads notifications from the global 'notifications' collection
 * - Reads read status from 'notificationReadStatus' collection
 * - Creates user-specific notifications in users/{userId}/notifications subcollections
 * - Performs batched writes for better performance
 * - Adds TTL expiry dates to notifications
 * - Batch merges similar notifications where appropriate
 * 
 * Usage:
 * 1. Install Firebase Admin SDK
 * 2. Set up service account credentials
 * 3. Run this script with Node.js (node migrateNotifications.js)
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK
// Replace with the path to your service account key
const serviceAccount = require('../path/to/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const TTL_DURATION_MS = 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds
const BATCH_SIZE = 500; // Maximum batch size for Firestore
const NOTIFICATION_BATCH_WINDOW_MS = 10 * 60 * 1000; // 10 minutes in milliseconds

/**
 * Main migration function
 */
async function migrateNotifications() {
  console.log('Starting notification migration...');
  
  // Get all project IDs
  const projects = await db.collection('projects').get();
  
  // Process each project separately to avoid mixing notifications
  for (const project of projects.docs) {
    const projectId = project.id;
    console.log(`Processing project: ${projectId}`);
    
    // Get project members
    const projectData = project.data();
    const memberIds = projectData.memberIds || [];
    
    if (memberIds.length === 0) {
      console.log(`Project ${projectId} has no members, skipping.`);
      continue;
    }
    
    console.log(`Project has ${memberIds.length} members.`);
    
    // Get all notifications for this project
    const notifications = await db.collection('notifications')
      .where('projectId', '==', projectId)
      .get();
    
    console.log(`Found ${notifications.docs.length} notifications for project ${projectId}.`);
    
    if (notifications.docs.length === 0) continue;
    
    // Get read status for all notifications
    const readStatusSnapshot = await db.collection('notificationReadStatus')
      .where('projectId', '==', projectId)
      .get();
    
    // Create a map of notification IDs to the users who have read them
    const readStatusMap = new Map();
    readStatusSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (!readStatusMap.has(data.notificationId)) {
        readStatusMap.set(data.notificationId, new Set());
      }
      readStatusMap.get(data.notificationId).add(data.userId);
    });
    
    console.log(`Found read status for ${readStatusMap.size} notifications.`);
    
    // Process each member's notifications
    for (const userId of memberIds) {
      await processMemberNotifications(userId, projectId, notifications.docs, readStatusMap);
    }
    
    console.log(`Completed migration for project ${projectId}.`);
  }
  
  console.log('Migration completed successfully!');
}

/**
 * Process notifications for a specific member
 */
async function processMemberNotifications(userId, projectId, notificationDocs, readStatusMap) {
  console.log(`Processing notifications for user ${userId} in project ${projectId}...`);
  
  // Group notifications by content and type to batch similar ones
  const groupedNotifications = groupSimilarNotifications(notificationDocs, userId);
  
  // Create batches of writes
  const batches = [];
  let currentBatch = db.batch();
  let operationCount = 0;
  
  // Create a reference to the user's notifications subcollection
  const userNotificationsRef = db.collection('users').doc(userId).collection('notifications');
  
  // Process each group of similar notifications
  for (const [key, notifications] of Object.entries(groupedNotifications)) {
    if (notifications.length === 0) continue;
    
    // Sort by timestamp (newest first)
    notifications.sort((a, b) => {
      const timestampA = a.data().timestamp ? a.data().timestamp.toDate() : new Date(0);
      const timestampB = b.data().timestamp ? b.data().timestamp.toDate() : new Date(0);
      return timestampB.getTime() - timestampA.getTime();
    });
    
    // Get the newest notification as our base
    const newestNotification = notifications[0].data();
    const notificationId = notifications[0].id;
    
    // Check if this user has read this notification
    const hasRead = readStatusMap.has(notificationId) && 
      readStatusMap.get(notificationId).has(userId);
    
    // Calculate expiry time for TTL (90 days from now)
    const expiryTime = new Date(Date.now() + TTL_DURATION_MS);
    
    // Create merged notification data
    const mergedData = {
      ...newestNotification,
      read: hasRead,
      count: notifications.length,
      created: newestNotification.timestamp || admin.firestore.FieldValue.serverTimestamp(),
      updated: admin.firestore.FieldValue.serverTimestamp(),
      expiryTime: admin.firestore.Timestamp.fromDate(expiryTime)
    };
    
    // Modify message for batched notifications
    if (notifications.length > 1) {
      const type = newestNotification.type;
      const userName = newestNotification.metadata?.userName || 'Someone';
      const contentTitle = newestNotification.metadata?.contentTitle || 'an item';
      
      if (type === 'comment') {
        mergedData.message = `${userName} commented ${notifications.length} times on "${contentTitle}"`;
        
        // Store the most recent comment
        if (newestNotification.metadata?.comment) {
          mergedData.lastComment = newestNotification.metadata.comment;
        }
      } else {
        mergedData.message = `${userName} performed ${notifications.length} actions on ${contentTitle}`;
      }
    }
    
    // Add the merged notification to the batch
    const newNotificationRef = userNotificationsRef.doc();
    currentBatch.set(newNotificationRef, mergedData);
    operationCount++;
    
    // If we've reached the batch limit, commit and create a new batch
    if (operationCount >= BATCH_SIZE) {
      batches.push(currentBatch);
      currentBatch = db.batch();
      operationCount = 0;
    }
  }
  
  // Add the last batch if it has operations
  if (operationCount > 0) {
    batches.push(currentBatch);
  }
  
  // Commit all batches
  console.log(`Committing ${batches.length} batches for user ${userId}...`);
  for (let i = 0; i < batches.length; i++) {
    await batches[i].commit();
    console.log(`Committed batch ${i + 1}/${batches.length} for user ${userId}.`);
  }
  
  console.log(`Completed processing for user ${userId}.`);
}

/**
 * Group similar notifications for batching
 */
function groupSimilarNotifications(notificationDocs, userId) {
  const groups = {};
  
  notificationDocs.forEach(doc => {
    const data = doc.data();
    const type = data.type;
    const contentId = data.metadata?.contentId;
    const actorUserId = data.metadata?.userId;
    
    // Skip notifications created by this user (they don't need to see their own actions)
    if (actorUserId === userId) {
      return;
    }
    
    // Create a key for grouping similar notifications
    let key;
    if (type === 'comment' && contentId && actorUserId) {
      // For comments, group by content, actor, and a time window
      key = `comment-${actorUserId}-${contentId}`;
    } else if (contentId && actorUserId) {
      // For other types, group by type, content, and actor
      key = `${type}-${actorUserId}-${contentId}`;
    } else {
      // Fallback to a unique key if we can't group properly
      key = `unique-${doc.id}`;
    }
    
    if (!groups[key]) {
      groups[key] = [];
    }
    
    groups[key].push(doc);
  });
  
  // Filter groups by time windows
  for (const [key, notifications] of Object.entries(groups)) {
    if (notifications.length <= 1) continue;
    
    // For each group, check if notifications are within the time window
    const timeGroups = [];
    let currentGroup = [notifications[0]];
    
    for (let i = 1; i < notifications.length; i++) {
      const prevNotification = notifications[i-1];
      const currentNotification = notifications[i];
      
      const prevTime = prevNotification.data().timestamp?.toDate() || new Date(0);
      const currentTime = currentNotification.data().timestamp?.toDate() || new Date(0);
      
      const timeDiff = Math.abs(prevTime.getTime() - currentTime.getTime());
      
      // If within time window, add to current group
      if (timeDiff <= NOTIFICATION_BATCH_WINDOW_MS) {
        currentGroup.push(currentNotification);
      } else {
        // Otherwise, start a new group
        timeGroups.push([...currentGroup]);
        currentGroup = [currentNotification];
      }
    }
    
    // Add the last group
    if (currentGroup.length > 0) {
      timeGroups.push(currentGroup);
    }
    
    // Replace the original group with the time-windowed groups
    delete groups[key];
    timeGroups.forEach((group, index) => {
      groups[`${key}-timegroup-${index}`] = group;
    });
  }
  
  return groups;
}

// Run the migration
migrateNotifications()
  .then(() => {
    console.log('Migration script completed successfully.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error running migration script:', error);
    process.exit(1);
  }); 