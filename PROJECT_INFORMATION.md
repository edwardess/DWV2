# C-Calendar: Content Management System

## System Architecture

### Frontend Framework
- **Next.js**: Server-side rendering React framework
- **TypeScript**: Strongly typed programming language
- **React**: UI component library
- **Tailwind CSS**: Utility-first CSS framework

### Backend & Infrastructure
- **Firebase Firestore**: NoSQL document database for content storage
- **Firebase Authentication**: User authentication and authorization
- **Firebase Storage**: File storage for media content
- **Cloudinary**: Image optimization and transformation service

## Core Data Models

### Content Cards
- **Structure**: Each card represents a content item (image, video, etc.)
- **Storage**: Stored in Firestore with unique IDs
- **Metadata**:
  - `id`: Unique identifier
  - `url`: Media URL
  - `title`: Content title
  - `description`: Detailed content description
  - `caption`: Short content caption
  - `contentType`: Type of content (Photo, Video, Reel, Carousel)
  - `label`: Status label (Approved, Needs Revision, Ready for Approval, Scheduled)
  - `location`: Calendar position or "pool"
  - `instance`: Social media platform (Instagram, Facebook, TikTok)
  - `comments`: Array of user comments
  - `attachments`: Additional files
  - `lastMoved`: Timestamp of last position change
  - `timestamp`: Creation timestamp

### Users
- **Structure**: User accounts with authentication
- **Properties**:
  - `uid`: Unique user identifier
  - `email`: User email address
  - `displayName`: User's display name
  - `photoURL`: Profile picture URL
  - `createdAt`: Account creation timestamp

### Projects
- **Structure**: Content organized by projects
- **Properties**:
  - `id`: Project identifier
  - `name`: Project name
  - `createdAt`: Creation timestamp
  - `members`: Array of project members/collaborators
  - `imageMetadata`: Object containing content metadata by platform
  - `droppedImages`: Map of content on calendar positions

### Notifications
- **Structure**: System notifications for user activities
- **Properties**:
  - `id`: Notification identifier
  - `type`: Notification type (approval, comment, edit, status_change)
  - `message`: Notification message
  - `timestamp`: Creation time
  - `projectId`: Associated project
  - `metadata`: Additional context (contentId, userName, etc.)

## Component Architecture

### Calendar System
- **ContinuousCalendar**: Core calendar display component
  - Renders year-view calendar with content cards
  - Implements drag-and-drop functionality
  - Handles card status management
  - Coordinates with image cache system
  - Responsive layout with adaptive grid
  - Month/day visualization with date formatting
  
- **ImageCacheProvider**: Client-side image caching system
  - Manages in-memory cache of image data URLs
  - Implements cache expiration (2-hour TTL)
  - Optimizes network requests for images
  - Integrates with Cloudinary for image optimization

### Content Management
- **DetailsModal**: Content editing and viewing interface
  - Multi-column layout (details, preview, thumbnail)
  - Comment system with likes and timestamps
  - Attachment management
  - Status control with approval toggle
  - Copy-to-platform functionality
  - Date formatting with proper localization
  
- **UploadModal**: Content upload interface
  - Drag-and-drop file upload
  - Form-based metadata input
  - Background upload processing
  - Progress indication

### Communication Systems
- **NotificationBell**: Real-time notification component
  - Displays unread notification count
  - Lists notifications with timestamps
  - Formats dates for readability
  - Integrates with Firestore for storage
  
- **MessengerModal**: Real-time messaging system
  - Direct messaging between users
  - Group conversations
  - Message read status tracking
  - Real-time updates via Firestore

## Authentication & Authorization
- **AuthProvider**: Context-based auth management
  - User session persistence
  - Protected routes
  - Role-based access control
  
- **SignIn/SignUp**: Authentication interfaces
  - Email/password authentication
  - Error handling and validation
  - Redirect logic

## State Management
- **Context APIs**: React Context for global state
  - ImageCacheContext: Image data caching
  - AuthContext: User authentication state
  
- **Local Component State**: UI-specific state
  - React useState/useEffect hooks
  - Optimistic UI updates
  - Form state management

## Advanced UI Patterns
- **Drag and Drop System**:
  - HTML5 native drag-and-drop API
  - Visual feedback during dragging
  - Source/target validation
  - Optimistic updates with rollback
  
- **Modal System**:
  - Dialog-based interface for focused tasks
  - Backdrop management
  - Animation with Framer Motion
  - Keyboard accessibility
  
- **Responsive Design**:
  - Mobile-first approach
  - Breakpoint-based layout changes
  - Dynamic grid systems
  - Touch-friendly interactions

## Performance Optimizations
- **Image Optimization**:
  - Client-side caching system
  - Cloudinary integration for resizing
  - Lazy loading implementation
  - Progressive loading with placeholder states
  
- **Rendering Optimizations**:
  - Memoization with useMemo and useCallback
  - Component virtualization for long lists
  - Key-based rendering for efficient updates
  - Animation optimizations with hardware acceleration

## Firebase Integration
- **Firestore**:
  - Document-based data storage
  - Real-time listeners with onSnapshot
  - Transactions for atomic operations
  - Batched writes for performance
  
- **Authentication**:
  - User management and sessions
  - Security rules implementation
  - JWT token handling
  
- **Storage**:
  - Content file storage
  - Upload progress monitoring
  - Download URL generation
  - File metadata handling

## Social Media Integration
- **Platform Support**:
  - Instagram content management
  - Facebook content management
  - TikTok content management
  
- **Platform-specific Features**:
  - Content type support by platform
  - Platform-specific metadata
  - Cross-platform content copying

## Developer Tooling
- **TypeScript**:
  - Strong type definitions
  - Interface-based development
  - Type inference and checking
  
- **Next.js Configuration**:
  - Custom routing
  - API routes
  - Static site generation options
  
- **Tailwind CSS Setup**:
  - Custom theme configuration
  - Component variants
  - Responsive utility classes

## Workflow Processes
- **Content Lifecycle**:
  1. Creation/Upload: Content enters system
  2. Editing: Metadata and assets modified
  3. Review: Content sent for approval
  4. Approval: Content marked as ready
  5. Scheduling: Content placed on calendar
  6. Publication: Content scheduled for posting

- **Approval System**:
  - Status-based workflow
  - Visual indicators for approval state
  - Notification system for status changes
  - Comment-based feedback loop

## Accessibility Features
- **Semantic HTML**:
  - Proper heading hierarchy
  - ARIA roles and labels
  - Meaningful element structure
  
- **Keyboard Navigation**:
  - Tab index management
  - Keyboard shortcuts
  - Focus management
  
- **Visual Accessibility**:
  - Color contrast compliance
  - Text scaling support
  - Screen reader compatibility

## Future Development Areas
- **Analytics Integration**:
  - Content performance tracking
  - User activity monitoring
  - Engagement metrics
  
- **AI Assistance**:
  - Content recommendation
  - Automated tagging
  - Scheduling optimization
  
- **Advanced Collaboration**:
  - Real-time collaborative editing
  - Advanced permission systems
  - Approval workflows with escalation

## Deployment Architecture
- **Vercel Hosting**:
  - Edge network distribution
  - Automatic deployments from Git
  - Environment variable management
  
- **Firebase Backend**:
  - Serverless architecture
  - Auto-scaling document database
  - Global data replication

## Recent Enhancements
- **Date Formatting**: Improved calendar date display with proper month names
- **Notification System**: Enhanced real-time alerts with improved readability
- **Multi-platform Support**: Added capability to manage content across different social media platforms
- **UI Refinement**: Polished interface elements for better usability and aesthetics 