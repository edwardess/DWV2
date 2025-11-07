<!-- 6f5aeff7-b969-4524-937e-5ceb3f296dbb c3f5a574-69ac-40c5-97b0-fa2508783dea -->
# Draft Samples & References Enhancement

## Overview

Add "Samples | References" functionality to Draft status cards in DetailsModal, allowing users to upload and view images/videos as reference materials. Also rename the second column header to "Content Idea | Script" for Draft cards.

## Critical Requirements

- **Maximum Surgical Precision**: Only modify Draft-related code paths
- **Surgical Precision Accuracy**: Every change must be targeted, minimal, and isolated. No unnecessary modifications to unrelated code. Verify each change only affects the intended functionality.
- **Conditional Rendering**: All changes must check `image?.label === "Draft"`
- **No Breaking Changes**: Non-Draft cards must function exactly as before
- **Type Safety**: Extend interfaces properly, avoid `any` types where possible

## Changes Required

### 1. Update ImageMeta Interface

**File**: `components/pages/DemoWrapper/index.tsx` (line ~176)

Add new field to ImageMeta:

- `samples?: Array<{ url: string; type: 'image' | 'video' }>`

Update normalization logic (line ~458) to include samples field.

### 2. Modify RenderSecondColumn Header

**File**: `components/modals/DetailsModalParts/RenderSecondColumn.tsx`

Change the "Content Preview" header to conditionally show:

- "Content Idea | Script" when `image?.label === "Draft"`
- "Content Preview" for all other statuses

### 3. Create RenderThirdColumn for Drafts

**File**: `components/modals/DetailsModalParts/RenderThirdColumn.tsx`

Replace entire component with conditional rendering:

**View Mode (Draft only)**:

- Header: "Samples | References"
- Scrollable grid container (like Facebook feed)
- Display uploaded images as cards
- Display uploaded videos as cards with play button overlay
- Click video → open in modal with embedded video player
- Empty state: "No samples uploaded yet"

**Edit Mode (Draft only)**:

- Header: "Samples | References"
- Dropzone accepting images (jpg, jpeg, png, gif, webp) and videos (mp4 only)
- Max 10 files, max 200MB per file
- Upload progress indicator with percentage
- Display uploaded files as cards with X delete button
- Videos show play button; clicking opens in new window

**Non-Draft cards**:

- Render existing thumbnail logic (unchanged)

### 4. Update DetailsModal

**File**: `components/modals/DetailsModal.tsx`

- Pass `samples` array to RenderThirdColumn props
- Add upload handler for samples using Firebase Storage pattern (similar to `handlePhotoChange`, line ~655)
- Add delete handler for individual samples
- Include `samples` field in `handleSubmit` when saving (line ~1540)
- Add state for upload progress tracking

### 5. Update handleCreateDraft

**File**: `components/pages/DemoWrapper/index.tsx`

Initialize `samples: []` in the DraftModal creation handler.

## Implementation Details

### Firebase Storage Path

`projects/{projectId}/samples/{cardId}/{timestamp}_{filename}`

### Upload Logic Pattern

Reuse existing `uploadBytesResumable` pattern from:

- `components/modals/DetailsModal.tsx` (line 685-703)
- Track progress per file
- Handle errors with specific messages
- Generate unique filenames

### Video Player Modal

Create simple modal component for video playback:

- Full-screen overlay
- HTML5 video element with controls
- Close button

### File Validation

- Images: jpg, jpeg, png, gif, webp
- Videos: mp4 only
- Size: 200MB max per file
- Count: 10 files max total

### To-dos

- [x] Add samples field to ImageMeta interface and normalization logic
- [x] Conditionally rename 'Content Preview' to 'Content Idea | Script' for Draft cards
- [x] Create view mode for samples/references in RenderThirdColumn (Draft only)
- [x] Create edit mode with dropzone and upload logic in RenderThirdColumn (Draft only)
- [x] Create simple modal component for video playback
- [x] Add samples upload/delete handlers and integrate in handleSubmit
- [x] Initialize samples array in handleCreateDraft
- [x] Test complete flow: create draft, upload samples, view, edit, delete

## Implementation Status: ✅ COMPLETE

All features have been successfully implemented:

1. **ImageMeta Interface**: `samples?: Array<{ url: string; type: 'image' | 'video' }>` added and normalized
2. **RenderSecondColumn**: Header conditionally shows "Content Idea | Script" for Draft cards
3. **RenderThirdColumn**: Complete implementation with:
   - View mode: Scrollable grid with images/videos, video player modal
   - Edit mode: Dropzone, file validation, upload progress, delete functionality
   - Conditional rendering based on `isDraft` flag
4. **VideoPlayerModal**: Created and integrated for video playback
5. **DetailsModal**: Upload/delete handlers integrated, samples saved in handleSubmit
6. **handleCreateDraft**: Initializes `samples: []` for new drafts

All changes follow surgical precision principles - only Draft-related code paths modified.

