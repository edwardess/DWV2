# Notification System Upgrade Guide

This document provides a simple guide for upgrading to the user-specific notifications subcollection structure.

## Overview of Changes

The notification system upgrade includes:

1. **User-specific subcollections**: Notifications are now stored in `/users/{userId}/notifications/{notificationId}`
2. **Embedded read status**: Read status is now embedded directly in notification documents

## Migration Steps

Follow these simple steps to upgrade your notification system:

### 1. Backup

Backup your Firestore data before proceeding.

### 2. Deploy New Files

Replace or add the following files:

- `components/services/NotificationServiceV2.ts`: The new notification service implementation
- `components/common/notifications/NotificationBellV2.tsx`: The updated notification bell component
- `firestore.rules.v2`: Updated security rules

### 3. Implementation Changes

Update notification creation calls in your code:

Before:
```typescript
import { createCommentNotification } from '@/components/services/NotificationService';

await createCommentNotification(projectId, contentId, userName, comment, instance);
```

After:
```typescript
import { createCommentNotification } from '@/components/services/NotificationServiceV2';

await createCommentNotification(projectId, contentId, userName, userId, comment, instance);
```

### 4. Component Updates

Replace the old notification bell with the new version:

Before:
```tsx
import { NotificationBell } from '@/components/common/notifications/NotificationBell';

<NotificationBell projectId={projectId} onOpenDetails={handleOpenDetails} />
```

After:
```tsx
import { NotificationBellV2 } from '@/components/common/notifications/NotificationBellV2';

<NotificationBellV2 projectId={projectId} onOpenDetails={handleOpenDetails} />
```

### 5. Update Firestore Rules

1. Review and adjust the rules in `firestore.rules.v2`
2. Rename to `firestore.rules` and deploy: `firebase deploy --only firestore:rules`

### 6. Testing

Test that notifications appear properly for all users in a project.

### 7. Future Improvements

The following can be implemented later:
- TTL for automatic cleanup
- Server-side batching
- Migration of old notifications
- Analytics features 