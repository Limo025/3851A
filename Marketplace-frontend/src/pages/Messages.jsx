import { useEffect } from 'react';
import ModeTabSwitch from '../components/ModeTabSwitch.jsx';
import ConversationList from '../components/ConversationList.jsx';
import ChatContainer from '../components/ChatContainer.jsx';
import NoConversationPlaceholder from '../components/NoConversationPlaceholder.jsx';
import { useChatStore } from '../store/useChatStore.js';

export default function Messages() {
  const { currentMode, selectedUser, getAllConversations } = useChatStore();

  useEffect(() => {
    getAllConversations(currentMode);
  }, [currentMode, getAllConversations]);

  useEffect(() => {
    useChatStore.setState({ isMessagesPageOpen: true });
    return () => useChatStore.setState({ isMessagesPageOpen: false });
  }, []);

  document.title = "Messages | UON Marketplace";
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white p-4 md:p-8 flex items-center justify-center">
      {/* Centered Chat Card Box (Fixed max width & height) */}
      <div className="w-full max-w-6xl h-[80vh] bg-white rounded-2xl shadow-[0_18px_45px_rgba(15,23,42,0.18)] overflow-hidden border-2 border-slate-200 grid grid-cols-4">
        
        {/* Left Sidebar Box (1/4 Width) */}
        <aside className="col-span-1 bg-[#005bf9] text-white p-4 flex flex-col border-r border-blue-400">
          <div className="pb-4 border-b border-blue-400">
            <ModeTabSwitch />
          </div>
          
          <div className="flex-1 overflow-y-auto mt-4">
            <ConversationList />
          </div>
        </aside>

        {/* Right Main Chat Area Box (3/4 Width) */}
        <main className="col-span-3 bg-white flex flex-col h-full overflow-hidden">
          {selectedUser ? (
            <ChatContainer key={`${selectedUser.buyer}:${selectedUser.seller}:${selectedUser.listing?._id || selectedUser.listing}`} user={selectedUser} />
          ) : (
            <NoConversationPlaceholder />
          )}
        </main>

      </div>
    </div>
    
  );
}
