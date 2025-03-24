// Put the components/DetailsModalParts/CommentsSection.tsx code here // CommentsSection.tsx
import React, { RefObject, useEffect } from "react";
import { ChatBubbleLeftEllipsisIcon, ChatBubbleLeftIcon, HeartIcon } from "@heroicons/react/24/outline";
import { HeartIcon as SolidHeartIcon, TrashIcon } from "@heroicons/react/24/solid";
import { getRelativeTime } from "./RelativeTime";

interface Like {
  uid: string;
  displayName: string;
}

export interface Comment {
  id: string;
  userPhoto: string;
  userName: string;
  text: string;
  likes: Like[];
  userId: string;
  timestamp?: Date | string;
}

interface CommentsSectionProps {
  comments: Comment[];
  user: any;
  newComment: string;
  setNewComment: (val: string) => void;
  handlePostComment: () => Promise<void>;
  toggleLike: (commentId: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  COMMENT_MAX_LENGTH: number;
  commentTextStyle: string;
  commentsContainerRef?: RefObject<HTMLDivElement>;
}

const CommentsSection: React.FC<CommentsSectionProps> = ({
  comments,
  user,
  newComment,
  setNewComment,
  handlePostComment,
  toggleLike,
  deleteComment,
  COMMENT_MAX_LENGTH,
  commentTextStyle,
  commentsContainerRef,
}) => {
  // Scroll to bottom of comments when they change or component mounts
  useEffect(() => {
    if (commentsContainerRef?.current && comments.length > 0) {
      // Scroll to the bottom of the comments list
      const scrollContainer = commentsContainerRef.current;
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, [comments, commentsContainerRef]);
  
  return (
    <div className="flex flex-col gap-3">
      {/* Comments list box */}
      <div className="bg-transparent p-3 rounded border border-border/40">
        <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center">
          <ChatBubbleLeftEllipsisIcon className="h-4 w-4 mr-1" />
          Comments
        </div>
        <div
          ref={commentsContainerRef}
          className="border border-border/30 p-2 rounded overflow-y-auto bg-white/80"
          style={{ maxHeight: "180px" }}
        >
          {comments.length === 0 ? (
            <div className="text-xs text-gray-500 flex items-center justify-center h-16">
              No comments yet.
            </div>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className="bg-muted/30 rounded-lg p-2 mb-2 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <img
                    src={comment.userPhoto}
                    alt="Profile"
                    className="h-5 w-5 rounded-full object-cover"
                  />
                  <span className="font-semibold text-xs">
                    {comment.userName}
                  </span>
                </div>
                <div className={commentTextStyle}>{comment.text}</div>
                <div className="flex items-center justify-between mt-1">
           
  <div className="flex items-center gap-1 relative group">
    <button
      onClick={() => toggleLike(comment.id)}
      className="focus:outline-none hover:scale-110 transition-transform"
    >
      {comment.likes.find((like) => like.uid === user.uid) ? (
        <SolidHeartIcon className="h-4 w-4 text-red-600" />
      ) : (
        <HeartIcon className="h-4 w-4 text-gray-500" />
      )}
    </button>
    {comment.likes.length > 0 && (
      <div className="flex items-center gap-1">
        <span className="text-[0.6rem] text-gray-600">
          {comment.likes.length}
        </span>
        <span className="text-[0.6rem] text-gray-600">
          · Liked by{' '}
          {comment.likes.length === 1 ? (
            comment.likes[0].displayName
          ) : comment.likes.length === 2 ? (
            `${comment.likes[0].displayName} and ${comment.likes[1].displayName}`
          ) : (
            <>
              {comment.likes[0].displayName}, {comment.likes[1].displayName}, and{' '}
              <span
                title={comment.likes
                  .slice(2)
                  .map((like) => like.displayName)
                  .join(', ')}
                className="cursor-help"
              >
                {comment.likes.length - 2} other{comment.likes.length - 2 > 1 ? 's' : ''}
              </span>
            </>
          )}
        </span>
      </div>
    )}
  </div>
                  <div className="text-[0.6rem] text-gray-500">
                    {getRelativeTime(comment.timestamp)}
                  </div>
                  {comment.userId === user.uid && (
                    <button 
                      onClick={() => deleteComment(comment.id)}
                      className="hover:bg-gray-300 p-1 rounded transition-colors"
                    >
                      <TrashIcon className="h-4 w-4 text-gray-500" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Comment input box */}
      <div className="bg-transparent p-3 rounded border border-border/40">
        <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center">
          <ChatBubbleLeftIcon className="h-4 w-4 mr-1" />
          Add Comment
        </div>
        <div className="border border-border/30 rounded p-2 flex flex-col bg-white/80">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={`Comment as ${user.displayName || user.email}`}
            className="w-full border rounded px-2 py-1 text-xs resize-none break-words min-h-[60px] focus:border-gray-500 focus:ring-1 focus:ring-gray-500 outline-none"
            maxLength={COMMENT_MAX_LENGTH}
          />
          <div className="text-[0.6rem] text-gray-600 mt-1 text-right">
            {newComment.length}/{COMMENT_MAX_LENGTH} characters
          </div>
          <button
            onClick={handlePostComment}
            disabled={!newComment.trim()}
            className={`mt-2 w-full rounded px-3 py-1 text-xs text-white transition-colors ${
              newComment.trim() ? 'bg-gray-700 hover:bg-gray-700' : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            Post
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommentsSection;