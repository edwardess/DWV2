import React from 'react';
import { Box, Typography, Button } from '@mui/material';

type Notification = {
  id: string;
  type: string;
  message: string;
  timestamp: any;
  read: boolean;
  metadata: any;
  projectId: string;
};

type NotificationItemProps = {
  notification: Notification;
  onClick: () => void;
};

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onClick
}) => {
  // Format time
  const formatTime = (timestamp: any) => {
    if (!timestamp) return 'Unknown time';
    
    try {
      // Convert Firebase timestamp to date if needed
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      
      if (diffSec < 60) return 'just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
      
      // For older dates, use the date format
      return date.toLocaleDateString();
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'Unknown time';
    }
  };
  
  return (
    <Button
      onClick={onClick}
      fullWidth
      sx={{
        display: 'block',
        textAlign: 'left',
        py: 1.5,
        px: 2,
        backgroundColor: notification.read ? 'transparent' : 'action.hover',
        borderLeft: notification.read ? 'none' : '4px solid',
        borderLeftColor: 'primary.main',
        '&:hover': {
          backgroundColor: 'action.selected',
        },
        borderRadius: 0,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            color="text.primary"
            sx={{
              fontWeight: notification.read ? 'normal' : 'medium',
              whiteSpace: 'normal',
              wordBreak: 'break-word',
            }}
          >
            {notification.message}
            
            {notification.metadata?.instance && (
              <Box
                component="span"
                sx={{
                  ml: 0.5,
                  px: 0.75,
                  py: 0.25,
                  bgcolor: 'info.light',
                  color: 'info.dark',
                  borderRadius: 1,
                  fontSize: '0.75rem',
                  fontWeight: 'medium',
                  display: 'inline-block',
                }}
              >
                {notification.metadata.instance}
              </Box>
            )}
          </Typography>
          
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
            {formatTime(notification.timestamp)}
          </Typography>
        </Box>
      </Box>
    </Button>
  );
};

export default NotificationItem; 