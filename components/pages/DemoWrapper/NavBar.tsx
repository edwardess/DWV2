import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import MessengerModal from "@/components/modals/MessengerModal";

const NavBar = () => {
  const { user } = useAuth();
  const [darkMode, setDarkMode] = useLocalStorage("darkMode", false);
  const [messengerVisible, setMessengerVisible] = useState(false);

  return (
    <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center h-16 px-4">
        <div className="flex items-center ml-auto space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMessengerVisible(true)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <ChatBubbleLeftRightIcon className="h-5 w-5" />
          </Button>
          
          {/* Social Media Instance Switcher */}
          {/* ... existing code ... */}
          
          {/* Theme Toggle */}
          {/* ... existing code ... */}
          
          {/* User Menu */}
          {/* ... existing code ... */}
        </div>
      </div>
      
      {/* Messenger Modal */}
      <MessengerModal 
        visible={messengerVisible} 
        onClose={() => setMessengerVisible(false)} 
      />
    </div>
  );
};

export default NavBar; 