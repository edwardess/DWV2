# React Continuous Calendar

Continuous Calendar is a bare-bones calendar built with React and Tailwindcss. It does not include event creation and display, as that's left up to your discretion.

### [Live Demo](https://continuous-calendar.vercel.app/)

### So what does it do? ✨

- Displays 12 months at once, with respect to the specified year.
- Allows for quick-navigation to specific months and Today.
- Clicking on a cell triggers the onClick event with (day, month, year).
- Responsive; supports mobile, tablet, and desktop views.


### Installation 💻

There is no npm package, it's just 1 file you can customize. Simply download or copy the file:

`/components/ContinuousCalendar.tsx`.

Additionally, I have applied the following global css:

```
*:focus:not(ol) {
  @apply outline-none ring-2 ring-cyan-400 border-cyan-400;
}

select {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  text-indent: 1px;
  text-overflow: '';
}

@layer utilities {
  /* Hide scrollbar for Chrome, Safari and Opera */
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  /* Hide scrollbar for IE, Edge and Firefox */
  .no-scrollbar {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }
}
```

### Props ❄️

Prop | Required | Type | Description
--- | --- | --- | --- |
onClick | Optional | `(day:number, month: number, year: number) => void;` | Triggered whenever the user clicks a day on the calendar. |

### Height and Width 🎨

The height and width of the calendar component rely on a parent wrapper. Please refer to `components/DemoWrapper.tsx` as an example of how to structure your React component to achieve your desired calendar size.

### Contribution 🔮

If you wish to contribute to this project, clone the repo and run it locally using `npm run dev`.


## Screenshots

![App Screenshot](https://i.postimg.cc/7qtz4srV/Screenshot-2024-08-19-at-10-28-57-PM.png)

![App Screenshot](https://i.postimg.cc/Q843fyB2/Screenshot-2024-08-19-at-10-36-31-PM.png)

![App Screenshot](https://github.com/user-attachments/assets/859cd344-8e53-4061-982d-63aff1da121b)

## Inspiration

![App Screenshot](https://i.postimg.cc/qk1gyQGF/Screenshot-2024-08-19-at-10-45-56-PM.png)

## Confirmation Modals

The application now includes professional confirmation modals for important actions. These confirmation dialogs enhance the user experience by preventing accidental actions and providing clear feedback.

### Types of Confirmation Modals

1. **Delete Confirmations**
   - Comment deletion
   - Attachment deletion
   - Photo/carousel item deletion

2. **Unsaved Changes Warnings**
   - When exiting edit mode with unsaved changes
   - When closing a modal with unsaved changes
   - When canceling carousel arrangement

### Implementation

The confirmation modals use a reusable `ConfirmationModal` component with customizable:
- Title and description
- Button text
- Color scheme based on action type (danger, warning, info, success)
- Icons representing the action

### Usage

To add a confirmation modal to a component:

1. Import the component:
```tsx
import ConfirmationModal from "@/components/ui/confirmation-modal";
```

2. Add state to track what needs confirmation:
```tsx
const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
```

3. Replace direct actions with confirmation triggers:
```tsx
// Before:
const handleDelete = (id) => {
  deleteItem(id);
};

// After:
const handleDelete = (item) => {
  setItemToDelete(item);
};

const confirmDelete = () => {
  if (itemToDelete) {
    deleteItem(itemToDelete.id);
    setItemToDelete(null);
  }
};
```

4. Add the modal to your component:
```tsx
<ConfirmationModal
  isOpen={!!itemToDelete}
  onClose={() => setItemToDelete(null)}
  onConfirm={confirmDelete}
  title="Delete Item"
  description={`Are you sure you want to delete "${itemToDelete?.name}"?`}
  confirmText="Delete"
  cancelText="Cancel"
  type="danger"
/>
```

### Modal Types

- `danger` - Red, for destructive actions (delete)
- `warning` - Amber, for potentially risky actions (discard changes)
- `success` - Green, for positive confirmations
- `info` - Blue, for informational confirmations

This consistent approach to confirmations improves the application's usability and helps prevent user errors.

# User Preferences Persistence

The application remembers user preferences across page reloads using localStorage:

- **Content Pool Visibility**: The app remembers whether the user prefers to have the content pool visible or hidden
- **Content Pool View Mode**: The app remembers if the user prefers the "full" or "list" view for content items
- **Active Project**: The last selected project is automatically loaded when returning to the dashboard
- **Social Media Platform**: The last selected platform (Instagram/Facebook/TikTok) is remembered
- **Sidebar Visibility**: The app remembers if the sidebar was visible or collapsed

