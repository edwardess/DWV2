"use client";
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  PhotoIcon,
  XMarkIcon,
  EllipsisHorizontalIcon,
  CheckIcon,
  FaceSmileIcon,
  UsersIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "@/components/services/AuthProvider";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getRelativeTime } from "./DetailsModalParts/RelativeTime";
import { db } from "@/components/services/firebaseService";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  serverTimestamp,
  orderBy,
  getDocs,
  limit,
  Timestamp,
  writeBatch,
  documentId,
  Firestore,
  DocumentReference,
  setDoc,
} from "firebase/firestore";
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react'
import { Textarea } from "@/components/ui/textarea";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from 'uuid';

// Define message collection paths
const getMessagesCollectionPath = (projectId: string, conversationId: string) => {
  // All conversations (both private and group) are stored under the project's conversations collection
  return `projects/${projectId}/conversations/${conversationId}/messages`;
};

const getConversationsCollectionPath = (projectId: string) => 
  `projects/${projectId}/conversations`;

// Helper to generate a consistent ID for private conversations regardless of project
const generatePrivateConversationId = (userId1: string, userId2: string): string => {
  // Sort user IDs alphabetically to ensure the same ID regardless of order
  const sortedIds = [userId1, userId2].sort();
  return `private_${sortedIds[0]}_${sortedIds[1]}`;
};

// Helper to check if a conversation ID belongs to a specific user
const isUserInPrivateConversation = (conversationId: string, userId: string): boolean => {
  if (!conversationId.startsWith('private_')) return false;
  return conversationId.includes(userId);
};

interface Conversation {
  id: string;
  participants: User[];
  lastMessage: {
    text: string;
    timestamp: Date;
    seen: boolean;
  };
  unreadCount: number;
  isGroupChat?: boolean;
  groupName?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  online?: boolean;
}

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Date;
  seen: boolean;
  attachments?: {
    type: 'image' | 'file';
    url: string;
    name?: string;
  }[];
}

interface FirestoreMessage {
  senderId: string;
  text: string;
  timestamp: Timestamp;
  seen: boolean;
  attachments?: {
    type: 'image' | 'file';
    url: string;
    name?: string;
  }[];
}

// Update conversation read status
const updateConversationReadStatus = async (
  projectId: string, 
  conversationId: string, 
  userId: string
) => {
  try {
    // All conversations (both private and group) are now stored under the project's conversations collection
    const conversationRef = doc(db, `projects/${projectId}/conversations`, conversationId);
    
    // Update the unread count for this user to 0
    await updateDoc(conversationRef, {
      [`unreadCount.${userId}`]: 0,
      lastMessageSeen: true
    });
  } catch (error) {
    console.error("Error updating conversation read status:", error);
  }
};

interface MessengerModalProps {
  visible: boolean;
  onClose: () => void;
  projectId?: string;
  projectName?: string;
  projectMembers?: User[];
}

// Constants for pagination
const MESSAGES_PER_PAGE = 20;

interface PendingImage {
  blob: Blob;
  previewUrl: string;
}

const MessengerModal = ({ visible, onClose, projectId, projectName = "Project", projectMembers: propMembers }: MessengerModalProps): JSX.Element | null => {
  const { user } = useAuth();
  const messageInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  
  // Add new state for search
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // State to store project members
  const [projectMembers, setProjectMembers] = useState<User[]>([]);
  
  // Filtered members based on search, now includes all members by default
  const filteredMembers = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return projectMembers.filter(member => 
      member.id !== user?.uid && // Don't show current user
      (!searchQuery || // Show all when no search query
       member.name.toLowerCase().includes(query) || 
       member.email.toLowerCase().includes(query))
    );
  }, [searchQuery, projectMembers, user?.uid]);
  
  // Conversations state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  
  // Ref to track message unsubscribe functions
  const messageUnsubRef = useRef<(() => void) | null>(null);
  
  // Add new state for emoji picker
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Add new state for file input
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Add new state for pending images
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Add a ref to track initial load
  const isInitialLoadRef = useRef(true);
  
  // Reset search focus when modal opens/closes
  useEffect(() => {
    if (!visible) {
      setIsSearchFocused(false);
      setSearchQuery('');
    }
  }, [visible]);
  
  // Helper function to sort conversations with group chat at the top
  const getSortedConversations = (convs: Conversation[]): Conversation[] => {
    // Clone the array to avoid modifying the original
    const sorted = [...convs];
    
    // Ensure group chats always come first, regardless of timestamp
    return sorted.sort((a, b) => {
      // Group chat always comes first
      if (a.isGroupChat && !b.isGroupChat) return -1;
      if (!a.isGroupChat && b.isGroupChat) return 1;
      
      // If both are group chats or both are private, sort by last message timestamp
      return b.lastMessage.timestamp.getTime() - a.lastMessage.timestamp.getTime();
    });
  };
  
  // Set up Firestore listeners for messages when active conversation changes
  useEffect(() => {
    if (!projectId || !activeConversation || !user?.uid) return;
    
    // Unsubscribe from previous listener if it exists
    if (messageUnsubRef.current) {
      messageUnsubRef.current();
      messageUnsubRef.current = null;
    }
    
    // Mark conversation as read
    updateConversationReadStatus(projectId, activeConversation, user.uid);
    
    // Set up new listener for messages
    const messagesRef = collection(db, `projects/${projectId}/conversations/${activeConversation}/messages`);
    const q = query(
      messagesRef,
      orderBy('timestamp', 'desc'),
      limit(MESSAGES_PER_PAGE)
    );
    
    setIsLoadingMore(true);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages: Message[] = [];
      
      snapshot.forEach(doc => {
        const data = doc.data() as FirestoreMessage;
        fetchedMessages.push({
          id: doc.id,
          senderId: data.senderId,
          text: data.text,
          timestamp: data.timestamp ? data.timestamp.toDate() : new Date(),
          seen: data.seen,
          attachments: data.attachments
        });
      });
      
      // Sort messages in chronological order (oldest first)
      const sortedMessages = fetchedMessages.sort((a, b) => 
        a.timestamp.getTime() - b.timestamp.getTime()
      );
      
      setMessages(sortedMessages);
      setIsLoadingMore(false);
      setHasMoreMessages(snapshot.docs.length >= MESSAGES_PER_PAGE);
      
      // Auto-scroll to bottom when new messages arrive
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    }, (error) => {
      console.error('❌ Error fetching messages:', error);
      setIsLoadingMore(false);
    });
    
    // Save the unsubscribe function
    messageUnsubRef.current = unsubscribe;
    
    return () => {
      unsubscribe();
    };
  }, [activeConversation, projectId, user?.uid]);
  
  // Update conversation subscription effect
  useEffect(() => {
    if (!projectId || !visible || !user?.uid || !projectMembers.length) return;

    const groupChatId = `group_${projectId}`;

    const setupGroupChat = async () => {
      try {
        const conversationsRef = collection(db, `projects/${projectId}/conversations`);
        const conversationsQuery = query(
          conversationsRef,
          where('participantIds', 'array-contains', user.uid)
        );

        const unsubscribe = onSnapshot(conversationsQuery, (snapshot) => {
          const updatedConversations: Conversation[] = [];

          snapshot.forEach(doc => {
            const data = doc.data();
            const lastMessageTimestamp = data.lastMessageAt ? 
              new Date(data.lastMessageAt.toDate()) : new Date();

            updatedConversations.push({
              id: doc.id,
              participants: data.participants || [],
              lastMessage: {
                text: data.lastMessage || 'Start a conversation',
                timestamp: lastMessageTimestamp,
                seen: data.lastMessageSeen || false
              },
              unreadCount: data.unreadCount?.[user.uid] || 0,
              isGroupChat: data.isGroupChat || false,
              groupName: data.groupName
            });
          });

          const sortedConversations = getSortedConversations(updatedConversations);
          
          // Only set active conversation on initial load
          if (isInitialLoadRef.current) {
            isInitialLoadRef.current = false;
            if (!activeConversation) {
              setActiveConversation(groupChatId);
            }
          }
          
          setConversations(sortedConversations);
        });

        return () => {
          unsubscribe();
          isInitialLoadRef.current = true; // Reset on cleanup
        };
      } catch (error) {
        console.error("❌ Error in setupGroupChat:", error);
      }
    };

    setupGroupChat();
  }, [projectId, visible, user?.uid, projectMembers]);
  
  // Fetch project members from Firestore
  useEffect(() => {
    if (!projectId || !visible) return;

    // If project members are passed directly as props, use them
    if (propMembers && propMembers.length > 0) {
      setProjectMembers(propMembers);
      return;
    }
    
    const fetchProjectMembers = async () => {
      try {
        // Get the project document
        const projectDocRef = doc(db, "projects", projectId);
        const projectDoc = await getDoc(projectDocRef);
        
        if (!projectDoc.exists()) {
          console.error("Project not found");
          return;
        }
        
        const projectData = projectDoc.data();
        const memberIds = projectData.memberIds || [];
        
        if (!memberIds.length) return;
        
        // Get user documents for each member ID
        const members: User[] = [];
        
        // Create a query to get all users whose UID is in the memberIds array
        const usersQuery = query(
          collection(db, "users"),
          where("uid", "in", memberIds)
        );
        
        const usersSnapshot = await getDocs(usersQuery);
        
        usersSnapshot.forEach(doc => {
          const userData = doc.data();
          members.push({
            id: userData.uid,
            name: userData.displayName || userData.email,
            email: userData.email,
            photoURL: userData.photoURL,
            online: false // Set default online status
          });
        });
        
        setProjectMembers(members);
      } catch (error) {
        console.error("Error fetching project members:", error);
      }
    };
    
    fetchProjectMembers();
  }, [projectId, visible, propMembers]);
  
  // Function to load more messages (pagination)
  const loadMoreMessages = async () => {
    if (!projectId || !activeConversation || !hasMoreMessages || isLoadingMore) return;
    
    try {
      setIsLoadingMore(true);
      
      const messagesRef = collection(db, getMessagesCollectionPath(projectId, activeConversation));
      const lastTimestamp = messages.length > 0 ? messages[0].timestamp : new Date();
      
      const q = query(
        messagesRef,
        orderBy('timestamp', 'desc'),
        where('timestamp', '<', Timestamp.fromDate(lastTimestamp)),
        limit(MESSAGES_PER_PAGE)
      );
      
      const snapshot = await getDocs(q);
      const olderMessages: Message[] = [];
      
      snapshot.forEach(doc => {
        const data = doc.data() as FirestoreMessage;
        
        olderMessages.push({
          id: doc.id,
          senderId: data.senderId,
          text: data.text,
          timestamp: data.timestamp ? data.timestamp.toDate() : new Date(),
          seen: data.seen,
          attachments: data.attachments
        });
      });
      
      // Sort older messages chronologically (oldest first)
      const sortedOlderMessages = olderMessages.sort((a, b) => 
        a.timestamp.getTime() - b.timestamp.getTime()
      );
      
      // Prepend older messages to current messages
      setMessages(prev => [...sortedOlderMessages, ...prev]);
      setHasMoreMessages(snapshot.docs.length >= MESSAGES_PER_PAGE);
      
    } catch (error) {
      console.error("Error loading more messages:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };
  
  // Update handleSelectConversation to be more robust
  const handleSelectConversation = useCallback((id: string) => {
    if (!id) return;
    setActiveConversation(id);
  }, []);
  
  const handleFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle paste events
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement)) return;
      
      const items = e.clipboardData?.items;
      if (!items) return;

      // Convert items to array before iterating
      const itemsArray = Array.from(items);
      for (const item of itemsArray) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            await handleImageFile(file);
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, []);

  const handleImageFile = async (file: File) => {
    try {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        console.error('File size too large (max 5MB)');
        return;
      }

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      
      setPendingImages(prev => [...prev, {
        blob: file,
        previewUrl
      }]);
    } catch (error) {
      console.error('Error handling image:', error);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    // Convert FileList to array before iterating
    const filesArray = Array.from(files);
    for (const file of filesArray) {
      if (file.type.startsWith('image/')) {
        await handleImageFile(file);
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePendingImage = (index: number) => {
    setPendingImages(prev => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].previewUrl);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const sendMessage = async (conversationId: string, messageText: string) => {
    if (!user || (!messageText.trim() && pendingImages.length === 0)) return;
    
    try {
      setIsUploading(true);
      const conversationRef = doc(db, `projects/${projectId!}/conversations`, conversationId);
      const messagesRef = collection(db, `projects/${projectId!}/conversations/${conversationId}/messages`);
      
      const conversationSnapshot = await getDoc(conversationRef);
      const conversationData = conversationSnapshot.data();
      
      if (!conversationData) {
        console.error('❌ Conversation not found');
        return;
      }
      
      // Upload images first if any
      const attachments = [];
      for (const pendingImage of pendingImages) {
        const storage = getStorage();
        const fileId = uuidv4();
        const fileExtension = 'jpg';
        const storageRef = ref(storage, `projects/${projectId}/conversations/${conversationId}/images/${fileId}.${fileExtension}`);
        
        await uploadBytes(storageRef, pendingImage.blob);
        const downloadURL = await getDownloadURL(storageRef);
        
        attachments.push({
          type: 'image',
          url: downloadURL
        });
      }
      
      // Prepare message data
      const messageData: any = {
        senderId: user.uid,
        text: messageText.trim(),
        timestamp: serverTimestamp(),
        seen: false
      };

      if (attachments.length > 0) {
        messageData.attachments = attachments;
      }
      
      // Add message first
      await addDoc(messagesRef, messageData);
      
      // Update conversation with last message info
      const participantIds = conversationData.participantIds || [];
      const unreadCountUpdates: Record<string, number> = {};
      
      participantIds.forEach((id: string) => {
        if (id === user.uid) {
          unreadCountUpdates[id] = 0;
        } else {
          const currentCount = conversationData.unreadCount?.[id] || 0;
          unreadCountUpdates[id] = currentCount + 1;
        }
      });
      
      // Update conversation
      await updateDoc(conversationRef, {
        lastMessage: attachments.length > 0 
          ? (messageText.trim() ? '📷 Image with message' : '📷 Image')
          : messageText,
        lastMessageAt: serverTimestamp(),
        lastMessageSeen: false,
        unreadCount: unreadCountUpdates
      });
      
      // Clear states
      setNewMessage('');
      setPendingImages([]);
      
      // Clean up preview URLs
      pendingImages.forEach(img => URL.revokeObjectURL(img.previewUrl));
      
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
      
    } catch (error) {
      console.error('❌ Error sending message:', error);
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (activeConversation && newMessage.trim()) {
        sendMessage(activeConversation, newMessage);
      }
    }
  };
  
  const getOtherParticipant = (conversationId: string): User | undefined => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation || conversation.isGroupChat) return undefined;
    
    // Return the first participant that is not the current user
    return conversation.participants.find(p => p.id !== user?.uid);
  };
  
  // Update startPrivateConversation to handle state more carefully
  const startPrivateConversation = useCallback(async (otherUser: User) => {
    if (!user || !projectId) return;
    
    try {
      const privateConversationId = generatePrivateConversationId(user.uid, otherUser.id);
      const conversationRef = doc(db, `projects/${projectId}/conversations`, privateConversationId);
      const conversationDoc = await getDoc(conversationRef);
      
      if (!conversationDoc.exists()) {
        await setDoc(conversationRef, {
          isGroupChat: false,
          participantIds: [user.uid, otherUser.id],
          participants: [
            {
              id: user.uid,
              name: user.displayName || user.email,
              email: user.email,
              photoURL: user.photoURL
            },
            otherUser
          ],
          createdAt: serverTimestamp(),
          lastMessageAt: serverTimestamp(),
          lastMessage: 'Start a conversation',
          lastMessageSeen: true,
          unreadCount: {
            [user.uid]: 0,
            [otherUser.id]: 0
          }
        });
      }
      
      handleSelectConversation(privateConversationId);
      setSearchQuery('');
      setIsSearchFocused(false);
    } catch (error) {
      console.error('Error creating private conversation:', error);
    }
  }, [user, projectId, handleSelectConversation]);
  
  const handleEmojiSelect = (emoji: any) => {
    if (inputRef.current) {
      const start = inputRef.current.selectionStart || 0;
      const end = inputRef.current.selectionEnd || 0;
      const text = newMessage.substring(0, start) + emoji.native + newMessage.substring(end);
      setNewMessage(text);
      
      // Update cursor position after emoji insertion
      const newPosition = start + emoji.native.length;
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.setSelectionRange(newPosition, newPosition);
        }
      }, 0);
    } else {
      setNewMessage((prev) => prev + emoji.native);
    }
  };

  const handleInputClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    setCursorPosition(target.selectionStart);
  };
  
  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if click is outside both the emoji button and the emoji picker
      const isOutsideEmojiButton = emojiButtonRef.current && 
        !emojiButtonRef.current.contains(event.target as Node);
      
      // Check if the click is inside the emoji picker or its children
      const isInsideEmojiPicker = (event.target as Element)?.closest('[data-emoji-picker="true"]');
      
      // Only close if clicking outside both elements AND not clicking in the input
      if (isOutsideEmojiButton && !isInsideEmojiPicker && !(event.target as Element)?.closest('textarea')) {
        setShowEmojiPicker(false);
      }
      
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Add this effect after the other useEffects
  useEffect(() => {
    // Scroll to bottom whenever messages change or conversation changes
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeConversation]);
  
  if (!visible) return null;
  
  const selectedConversation = conversations.find(c => c.id === activeConversation);
  const otherUser = selectedConversation ? getOtherParticipant(selectedConversation.id) : undefined;
  
  // Add special handling for group chat in message display
  const getMessageDisplayClass = (message: Message) => {
    // Check if this is a system message (like welcome messages)
    if (message.senderId === 'system') {
      return 'bg-muted/30 text-center mx-auto max-w-[90%] text-muted-foreground italic';
    }
    
    // For regular user messages
    return message.senderId === user?.uid || message.senderId === 'current' 
      ? 'bg-primary text-primary-foreground' 
      : 'bg-muted';
  };

  // Get the conversation name
  const getConversationName = (conversation: Conversation): string => {
    if (conversation.isGroupChat) {
      return `${projectName} Group`;
    }
    
    // For private chats, find the other participant (not the current user)
    const otherParticipant = conversation.participants.find(p => p.id !== user?.uid);
    return otherParticipant?.name || 'Unknown';
  };

  // Get the conversation avatar
  const getConversationAvatar = (conversation: Conversation): string | undefined => {
    if (conversation.isGroupChat) {
      return '/group-avatar.png';
    }
    
    const otherParticipant = conversation.participants.find(p => p.id !== user?.uid);
    return otherParticipant?.photoURL;
  };
  
  // Get conversation initials for avatar fallback
  const getConversationInitials = (conversation: Conversation): string => {
    if (conversation.isGroupChat) {
      return (projectName + ' Group')
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .substring(0, 2)
        .toUpperCase();
    }
    
    const otherParticipant = conversation.participants.find(p => p.id !== user?.uid);
    return otherParticipant?.name.substring(0, 2).toUpperCase() || 'UN';
  };

  return (
    <Dialog open={visible} onOpenChange={open => {
      if (!open) {
        setIsSearchFocused(false);
        setSearchQuery('');
        onClose();
      }
    }}>
      <DialogContent 
        className="
          sm:max-w-[85vw] 
          md:max-w-[75vw] 
          lg:max-w-[65vw] 
          xl:max-w-[900px] 
          h-[500px] 
          sm:h-[550px] 
          md:h-[600px] 
          p-0 
          flex 
          flex-col 
          overflow-hidden
          rounded-lg
        "
        ref={containerRef}
        onOpenAutoFocus={(e) => {
          e.preventDefault(); // Prevent the default auto-focus behavior
        }}
      >
        <div className="flex h-full">
          {/* Conversations Sidebar */}
          <div className="w-2/5 sm:w-1/3 border-r border-border h-full flex flex-col overflow-hidden">
            <div className="p-3 sm:p-4 border-b border-border bg-muted/30">
              <h2 className="text-sm sm:text-base font-semibold flex items-center">
                <ChatBubbleLeftRightIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 text-primary" />
                Messages
              </h2>
            </div>
            
            {/* Search Bar */}
            <div ref={searchContainerRef} className="px-2 py-2 border-b border-border relative">
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  placeholder="Search Messenger"
                  className="w-full px-8 py-1.5 text-xs rounded-full bg-muted/50 border-none focus:ring-1 ring-primary focus:outline-none"
                  autoFocus={false}
                />
                <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              </div>

              {/* Search Results Dropdown - Now shows all members by default */}
              {isSearchFocused && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-background border rounded-md shadow-lg z-50 max-h-60 overflow-auto">
                  {filteredMembers.length > 0 ? (
                    <>
                      <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b">
                        Project Members
                      </div>
                      {filteredMembers.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center px-3 py-2 hover:bg-muted/50 cursor-pointer"
                          onClick={() => {
                            startPrivateConversation(member);
                            setIsSearchFocused(false);
                          }}
                        >
                          <Avatar className="h-8 w-8 mr-2">
                            <AvatarImage src={member.photoURL} />
                            <AvatarFallback>
                              {member.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{member.name}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                      No members found
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <ScrollArea className="flex-1 overflow-auto">
              <div className="p-2 space-y-1.5">
                {/* Group chat header */}
                <div className="text-xs font-medium text-primary px-2 pt-1 pb-0.5">
                  <UsersIcon className="h-3 w-3 inline-block mr-1 align-text-bottom" />
                  Group Chat
                </div>
                
                {/* List of conversations */}
                {conversations.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-xs">
                    Loading conversations...
                  </div>
                ) : (
                  conversations.map(conversation => (
                    <Card 
                      key={conversation.id}
                      className={`cursor-pointer transition-colors ${
                        activeConversation === conversation.id 
                          ? 'bg-primary text-white hover:bg-primary/90' 
                          : conversation.isGroupChat
                            ? 'bg-primary/10 hover:bg-primary/20'  
                            : 'hover:bg-muted/50'
                      } ${conversation.isGroupChat ? 'border-l-4 border-primary shadow-sm' : ''}`}
                      onClick={() => handleSelectConversation(conversation.id)}
                    >
                      <CardContent className="p-1.5 sm:p-2">
                        <div className="flex items-center space-x-1.5 sm:space-x-2">
                          <div className="relative flex-shrink-0">
                            <Avatar className={`h-7 w-7 sm:h-8 sm:w-8 ${conversation.isGroupChat ? 'border-2 border-primary' : ''}`}>
                              <AvatarImage src={getConversationAvatar(conversation)} />
                              <AvatarFallback className={conversation.isGroupChat 
                                ? (activeConversation === conversation.id ? "bg-indigo-700 text-white" : "bg-indigo-100 text-indigo-800") 
                                : (activeConversation === conversation.id ? "bg-gray-700 text-white" : "")
                              }>
                                {getConversationInitials(conversation)}
                              </AvatarFallback>
                            </Avatar>
                            {!conversation.isGroupChat && conversation.participants[0]?.online && (
                              <span className="absolute bottom-0 right-0 h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-green-500 border-2 border-background"></span>
                            )}
                            {conversation.isGroupChat && (
                              <span className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center bg-primary rounded-full border-2 border-background">
                                <UsersIcon className="h-2 w-2 sm:h-2.5 sm:w-2.5 text-white" />
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className={`font-medium truncate text-[10px] sm:text-xs ${
                                activeConversation === conversation.id 
                                  ? 'text-white' 
                                  : conversation.isGroupChat ? 'text-primary' : ''
                              }`}>
                                {getConversationName(conversation)}
                                {conversation.isGroupChat && (
                                  <span className={`ml-1 text-[8px] py-0.5 px-1 sm:text-[10px] sm:py-0.5 sm:px-1 ${
                                    activeConversation === conversation.id 
                                      ? 'bg-white/20 text-white' 
                                      : 'bg-primary/20 text-primary font-semibold'
                                  } rounded-full`}>Group</span>
                                )}
                              </p>
                              <p className={`text-[8px] sm:text-[10px] px-0.5 ${
                                activeConversation === conversation.id 
                                  ? 'text-white/70' 
                                  : 'text-muted-foreground'
                              }`}>
                                {getRelativeTime(conversation.lastMessage.timestamp)}
                              </p>
                            </div>
                            <div className="flex items-center justify-between mt-0.5">
                              <p className={`text-[9px] sm:text-xs truncate max-w-[120px] sm:max-w-[180px] ${
                                activeConversation === conversation.id
                                  ? (!conversation.lastMessage.seen ? 'font-semibold text-white' : 'text-white/80')
                                  : (!conversation.lastMessage.seen ? 'font-semibold' : 'text-muted-foreground')
                              }`}>
                                {conversation.lastMessage.text.length > 30 
                                  ? conversation.lastMessage.text.substring(0, 30) + '...' 
                                  : conversation.lastMessage.text}
                              </p>
                              {conversation.unreadCount > 0 && (
                                <Badge 
                                  variant={activeConversation === conversation.id ? "outline" : "destructive"} 
                                  className="rounded-full text-[8px] h-4 min-w-4 flex items-center justify-center px-1 ml-1"
                                >
                                  {conversation.unreadCount}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
          
          {/* Chat Area */}
          <div className="w-3/5 sm:w-2/3 flex flex-col h-full overflow-hidden">
            {activeConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-2 sm:p-3 border-b border-border flex items-center justify-between bg-muted/30">
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                      <AvatarImage src={selectedConversation ? getConversationAvatar(selectedConversation) : undefined} />
                      <AvatarFallback className={selectedConversation?.isGroupChat ? "bg-indigo-100 text-indigo-800" : ""}>
                        {selectedConversation ? getConversationInitials(selectedConversation) : ""}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-xs sm:text-sm">
                        {selectedConversation ? getConversationName(selectedConversation) : ""}
                      </h3>
                      <p className="text-[8px] sm:text-[10px] text-muted-foreground flex items-center">
                        {selectedConversation?.isGroupChat ? (
                          `${selectedConversation.participants?.length || 0} members`
                        ) : otherUser?.online ? (
                          <>
                            <span className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-green-500 mr-1"></span>
                            Active now
                          </>
                        ) : (
                          'Offline'
                        )}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Messages */}
                <ScrollArea className="flex-1 p-2 sm:p-3 overflow-auto">
                  <div className="space-y-2 sm:space-y-3 pr-2">
                    {messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-40 text-center">
                        <ChatBubbleLeftRightIcon className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground text-xs sm:text-sm">
                          {selectedConversation?.isGroupChat 
                            ? `Welcome to the ${projectName} Group chat! Start chatting with your team` 
                            : `Start a conversation with ${selectedConversation ? getConversationName(selectedConversation) : 'user'}`}
                        </p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div 
                          key={message.id}
                          className={`flex ${message.senderId === 'system' ? 'justify-center' : message.senderId === user?.uid || message.senderId === 'current' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[85%] break-words ${getMessageDisplayClass(message)} rounded-lg px-3 py-1.5 sm:px-3.5 sm:py-2`}>
                            {message.senderId !== 'system' && selectedConversation?.isGroupChat && message.senderId !== user?.uid && (
                              <p className="text-[8px] sm:text-[10px] font-medium opacity-70 mb-0.5">
                                {projectMembers.find(m => m.id === message.senderId)?.name || 'Unknown'}
                              </p>
                            )}
                            {message.attachments?.map((attachment, index) => (
                              attachment.type === 'image' && (
                                <div key={index} className="mb-2">
                                  <img 
                                    src={attachment.url} 
                                    alt="Shared image" 
                                    className="rounded-lg max-h-[200px] w-auto object-contain"
                                    loading="lazy"
                                  />
                                </div>
                              )
                            ))}
                            {message.text && (
                              <p className="whitespace-pre-wrap break-all overflow-wrap-anywhere text-xs sm:text-sm">{message.text}</p>
                            )}
                            {message.senderId !== 'system' && (
                              <div className="flex items-center justify-end gap-1 mt-0.5">
                                <span className="text-[8px] sm:text-[10px] opacity-70">{getRelativeTime(message.timestamp)}</span>
                                {(message.senderId === user?.uid || message.senderId === 'current') && (
                                  <CheckIcon className={`h-2.5 w-2.5 ${message.seen ? 'text-blue-500' : 'opacity-70'}`} />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
                
                {/* Message Input */}
                <div className="px-3 py-2 sm:px-4 sm:py-3 border-t border-border bg-background flex-shrink-0">
                  {/* Pending Images Preview */}
                  {pendingImages.length > 0 && (
                    <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
                      {pendingImages.map((img, index) => (
                        <div key={index} className="relative group">
                          <img 
                            src={img.previewUrl} 
                            alt="Preview" 
                            className="h-16 w-16 object-cover rounded-lg border border-border"
                          />
                          <button
                            onClick={() => removePendingImage(index)}
                            className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <XMarkIcon className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleFileUpload}
                      disabled={isUploading}
                      className="flex-shrink-0 h-10 w-10"
                    >
                      {isUploading ? (
                        <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <PhotoIcon className="h-5 w-5" />
                      )}
                    </Button>
                    <div className="relative flex-1">
                      <Textarea
                        ref={inputRef}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onClick={handleInputClick}
                        onKeyDown={handleKeyDown}
                        placeholder={pendingImages.length > 0 ? "Add a message or send without text..." : "Type a message..."}
                        className="w-full pr-10 text-sm bg-muted/50 border-none focus:ring-1 ring-primary focus:outline-none px-4 py-2.5 resize-none overflow-hidden min-h-[40px] max-h-[160px] rounded-2xl"
                        style={{
                          height: '40px',
                          minHeight: '40px',
                          maxHeight: '160px',
                          paddingRight: '40px'
                        }}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = '40px';
                          const newHeight = Math.min(target.scrollHeight, 160);
                          target.style.height = `${newHeight}px`;
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 bottom-0 h-10 w-10 hover:bg-accent hover:text-accent-foreground"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        ref={emojiButtonRef}
                      >
                        <FaceSmileIcon className="h-5 w-5" />
                      </Button>
                      {showEmojiPicker && (
                        <div className="absolute bottom-full right-0 mb-2 z-50" data-emoji-picker="true">
                          <Picker
                            data={data}
                            onEmojiSelect={handleEmojiSelect}
                            theme="light"
                            previewPosition="none"
                            skinTonePosition="none"
                          />
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="default"
                      size="icon"
                      onClick={(e) => {
                        e.preventDefault();
                        if (activeConversation) {
                          sendMessage(activeConversation, newMessage);
                        }
                      }}
                      disabled={!newMessage.trim() && pendingImages.length === 0}
                      className="flex-shrink-0 h-10 w-10"
                    >
                      <PaperAirplaneIcon className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <div className="bg-muted/20 rounded-full p-4 mb-3 sm:p-5 sm:mb-4">
                  <ChatBubbleLeftRightIcon className="h-8 w-8 sm:h-12 sm:w-12 text-primary/60" />
                </div>
                <h3 className="text-base sm:text-xl font-semibold mb-1 sm:mb-2">Your Messages</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-4 max-w-md">
                  Select a conversation from the sidebar to start messaging
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Messages are private and secure
                </p>
              </div>
            )}
          </div>
        </div>

        {/* File input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          multiple
          className="hidden"
        />
      </DialogContent>
    </Dialog>
  );
};

export default MessengerModal; 