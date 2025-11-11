<!-- 6f5aeff7-b969-4524-937e-5ceb3f296dbb 093a55d1-a880-42c2-a3e8-1c6b46d62141 -->
# PC View Drag Feedback Implementation

## Problem

PC view drag and drop works but lacks visual feedback - users can't see where they can drop cards or that a card is being dragged.

## Solution

1. Show a floating "ghost" card that follows the cursor during drag (similar to mobile touch drag)
2. Hide the original card when it's being dragged (opacity-0)
3. Show "drop here" indicator with dashed blue border on calendar cells when dragging over them

## Implementation Strategy

### 1. Add Drag State Management in ContinuousCalendar

**Location**: `components/pages/Calendar/index.tsx`

- Add state to track currently dragged card and mouse position (after line ~546):
  ```typescript
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [hoveredCellKey, setHoveredCellKey] = useState<string | null>(null); // Format: "year-month-day"
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  ```

- Update `onDragStart` handlers (lines ~807, ~993) - ADD setDraggedCardId, KEEP existing dataTransfer logic:
  ```typescript
  onDragStart={(e) => {
    e.dataTransfer.setData("imageId", card.id);
    e.dataTransfer.setData("sourceKey", dayKey);
    setDraggedCardId(card.id); // ADD: Track which card is being dragged
    setDragPosition({ x: e.clientX, y: e.clientY }); // ADD: Track initial position
  }}
  ```

- Add `onDrag` handler to track mouse position (add after onDragStart, before onDragOver):
  ```typescript
  onDrag={(e) => {
    if (draggedCardId) {
      setDragPosition({ x: e.clientX, y: e.clientY });
    }
  }}
  ```

- Update `onDragOver` handler (line ~721) - ADD hover tracking, KEEP preventDefault:
  ```typescript
  onDragOver={(e) => {
    e.preventDefault(); // KEEP existing
    // ADD: Track hovered cell (only if valid and not full)
    const isFull = groupedDroppedImages?.[dayKey]?.length >= 4;
    if (!isFull && month >= 0) {
      setHoveredCellKey(dayKey);
    } else {
      setHoveredCellKey(null);
    }
    // ADD: Update drag position
    if (draggedCardId) {
      setDragPosition({ x: e.clientX, y: e.clientY });
    }
  }}
  ```

- Add `onDragLeave` handler (after onDragOver, before onDrop) - NEW handler:
  ```typescript
  onDragLeave={(e) => {
    // Only clear if actually leaving cell bounds (not just moving to child element)
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setHoveredCellKey(null);
    }
  }}
  ```

- Update `onDrop` handler (line ~722) - ADD state clearing at END, KEEP all existing logic:
  ```typescript
  onDrop={(e) => {
    e.preventDefault();
    // ... ALL existing drop logic stays unchanged ...
    if (onImageDrop && month >= 0) {
      handleDrop(e, day, month, year);
    }
    // ADD: Clear drag state after drop
    setDraggedCardId(null);
    setHoveredCellKey(null);
    setDragPosition(null);
  }}
  ```

- Add global `dragend` listener (after existing useEffect, line ~549) - NEW listener:
  ```typescript
  useEffect(() => {
    const handleDragEnd = () => {
      // Reset state if drag is cancelled (dropped outside or ESC)
      setDraggedCardId(null);
      setHoveredCellKey(null);
      setDragPosition(null);
    };
    document.addEventListener('dragend', handleDragEnd);
    return () => document.removeEventListener('dragend', handleDragEnd);
  }, []);
  ```

### 2. Add Floating Dragged Card

**Location**: `components/pages/Calendar/index.tsx`

- Add floating card component (at the end of the component, before closing div):
  ```tsx
  {/* Floating Dragged Card */}
  {draggedCardId && dragPosition && imageMetadata?.[draggedCardId] && (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left: `${dragPosition.x}px`,
        top: `${dragPosition.y}px`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-100 opacity-60 scale-110 shadow-2xl border-2 border-blue-400">
        {/* Status Indicator */}
        <div className="absolute top-1 left-1/2 transform -translate-x-1/2 z-10">
          <div
            className={`w-3 h-3 rounded-full border-2 border-white shadow-sm ${
              !imageMetadata[draggedCardId].label
                ? "bg-gray-400"
                : imageMetadata[draggedCardId].label.toLowerCase() === "approved"
                ? "bg-green-500"
                : imageMetadata[draggedCardId].label.toLowerCase() === "draft"
                ? "bg-amber-500"
                : imageMetadata[draggedCardId].label.toLowerCase() === "needs revision"
                ? "bg-red-500"
                : imageMetadata[draggedCardId].label.toLowerCase() === "ready for approval"
                ? "bg-blue-500"
                : imageMetadata[draggedCardId].label.toLowerCase() === "scheduled"
                ? "bg-purple-500"
                : "bg-gray-400"
            }`}
          />
        </div>
        {/* Image */}
        <Image
          src={imageMetadata[draggedCardId].url}
          alt={imageMetadata[draggedCardId].title || "Content"}
          fill
          className="object-cover"
          sizes="96px"
          draggable={false}
        />
      </div>
    </div>
  )}
  ```

- Import Image from next/image if not already imported

### 3. Add Drop Zone Indicator to Calendar Cells

**Location**: `components/pages/Calendar/index.tsx`

- Add drop indicator inside calendar cell (after line ~763, before cards rendering):
  ```tsx
  {/* Drop Zone Indicator */}
  {hoveredCellKey === dayKey && draggedCardId && month >= 0 && (
    <div className="absolute inset-0 flex items-center justify-center border-2 border-dashed border-blue-400 bg-blue-50/50 rounded-xl z-20 pointer-events-none">
      <span className="text-blue-600 font-medium text-sm">drop here</span>
    </div>
  )}
  ```

- Only show when:
  - `hoveredCellKey === dayKey` (this cell is hovered)
  - `draggedCardId` exists (drag is active)
  - `month >= 0` (valid date, not padding)
  - Cell is not full (already checked in onDragOver)

### 4. Hide Original Card During Drag

**Location**: `components/pages/Calendar/index.tsx`

- Update card className to hide when dragging (lines ~811, ~997):
  ```typescript
  className={`... ${draggedCardId === card.id ? "opacity-0" : ""}`}
  ```

- Apply to both single card (line ~811) and multiple cards (line ~997) rendering

### 5. Update ContentPoolImage to Hide During Drag

**Location**: `components/common/media/ContentPoolImage.tsx`

- Add prop to track if card is being dragged:
  ```typescript
  interface ContentPoolImageProps {
    // ... existing props ...
    isDragging?: boolean;
    onDragStartCallback?: (id: string) => void;
  }
  ```

- Update className to hide when dragging:
  ```typescript
  className={`... ${isDragging ? "opacity-0" : ""}`}
  ```

- Update onDragStart handlers to call callback:
  ```typescript
  onDragStart={(e) => {
    // ... existing logic ...
    onDragStartCallback?.(id);
  }}
  ```

- Pass `isDragging` prop from ContentPool component

### 6. Update ContentPool to Pass Drag State

**Location**: `components/common/media/ContentPool.tsx`

- Add `draggedCardId` and `onDragStart` props to ContentPool
- Pass `isDragging={draggedCardId === id}` to ContentPoolImage
- Pass `onDragStartCallback={onDragStart}` to ContentPoolImage

### 7. Update DemoWrapper to Track Drag State

**Location**: `components/pages/DemoWrapper/index.tsx`

- Add state:
  ```typescript
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  ```

- Pass `draggedCardId` and `setDraggedCardId` to ContinuousCalendar
- Pass `draggedCardId` and `onDragStart={setDraggedCardId}` to ContentPool

## Key Implementation Details

### Drag State Tracking

- Use HTML5 drag events (`onDragStart`, `onDrag`, `onDragOver`, `onDragLeave`, `onDragEnd`)
- Track `draggedCardId` to know which card is being dragged
- Track `hoveredCellKey` to know which cell is being hovered
- Track `dragPosition` to position the floating card

### Floating Dragged Card

- Render when `draggedCardId` and `dragPosition` exist
- Fixed position: `left: dragPosition.x, top: dragPosition.y`
- Transform: `translate(-50%, -50%)` to center on cursor
- Style: `opacity-60 scale-110 z-50` with shadow and blue border
- Use `imageMetadata[draggedCardId]` for card content
- Show status indicator (same as mobile implementation)

### Drop Zone Indicator

- Show only when:
  - Cell is hovered (`hoveredCellKey === dayKey`)
  - Drag is active (`draggedCardId` exists)
  - Cell is valid (`month >= 0`)
  - Cell is not full (checked in `onDragOver`)
- Style: dashed blue border, light blue background, centered text
- Position: absolute, covers entire cell
- z-index: high enough to appear above cell content but below floating elements

### Hide Original Card

- Apply `opacity-0` when `draggedCardId === card.id`
- Works for both calendar cards and content pool cards

## Files to Modify

1. **`components/pages/Calendar/index.tsx`**
   - Add drag state (`draggedCardId`, `hoveredCellKey`, `dragPosition`)
   - Update `onDragStart` handlers to set `draggedCardId` and `dragPosition`
   - Add `onDrag` handler to track mouse position
   - Update `onDragOver` to set `hoveredCellKey` and `dragPosition`
   - Add `onDragLeave` to clear `hoveredCellKey`
   - Add floating dragged card JSX
   - Add drop zone indicator JSX
   - Hide cards when `draggedCardId === card.id`
   - Add global `dragend` listener
   - Import Image from next/image

2. **`components/common/media/ContentPoolImage.tsx`**
   - Add `isDragging` and `onDragStartCallback` props
   - Hide card when `isDragging` is true
   - Call callback in `onDragStart` handlers

3. **`components/common/media/ContentPool.tsx`**
   - Add `draggedCardId` and `onDragStart` props
   - Pass `isDragging` and `onDragStartCallback` to ContentPoolImage

4. **`components/pages/DemoWrapper/index.tsx`**
   - Add `draggedCardId` state
   - Pass to ContinuousCalendar and ContentPool

## Testing Considerations

1. Verify floating card appears and follows cursor when dragging starts
2. Verify original card hides when dragging starts
3. Verify drop indicator appears when hovering over valid cells
4. Verify drop indicator doesn't appear when cell is full (4 cards)
5. Verify drop indicator doesn't appear on invalid cells (month < 0)
6. Verify state clears on drop
7. Verify state clears on drag end (cancelled drag)
8. Verify works for both calendar cards and content pool cards
9. Verify no visual glitches or flickering
10. Verify floating card shows correct image and status indicator

### To-dos

- [x] Add draggedCardId and hoveredCellKey state in ContinuousCalendar
- [x] Update onDragStart handlers to set draggedCardId
- [x] Update onDragOver to track hoveredCellKey and check if cell is full
- [x] Add onDragLeave handler to clear hoveredCellKey
- [x] Add drop zone indicator JSX in calendar cells
- [x] Hide calendar cards when draggedCardId === card.id
- [x] Add global dragend listener to reset state on cancelled drag
- [x] Add isDragging prop to ContentPoolImage and hide when dragging
- [x] Add draggedCardId prop to ContentPool and pass isDragging to images
- [x] Add draggedCardId state in DemoWrapper and pass to Calendar and ContentPool
- [ ] Add dragPosition state to track mouse position
- [ ] Add onDrag handler to update dragPosition
- [ ] Add floating dragged card component that follows cursor
- [ ] Import Image component from next/image
- [ ] Update onDragStart to set initial dragPosition
- [ ] Update onDragOver to update dragPosition
- [ ] Update state clearing to include dragPosition
