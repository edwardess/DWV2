export interface Notification {
  id: string;
  projectId: string;
  type: 'approval' | 'status_change' | 'comment' | 'edit';
  message: string;
  timestamp: Date;
  read: boolean;
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
  };
}

export type NotificationType = 'approval' | 'status_change' | 'comment' | 'edit'; 