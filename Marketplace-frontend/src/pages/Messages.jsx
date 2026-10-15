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
      <div className="grid h-[80vh] w-full max-w-6xl grid-cols-4 grid-rows-[minmax(0,1fr)] overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.18)]">
        
        {/* Left Sidebar Box (1/4 Width) */}
        <aside className="col-span-1 flex min-h-0 flex-col overflow-hidden border-r border-grey-200 bg-[#313f58] p-4 text-white">
          <div className="pb-4 border-b border-grey-200">
            <ModeTabSwitch />
          </div>
          
          <div className="-mr-4 mt-4 min-h-0 flex-1 overflow-y-auto pr-4">
            <ConversationList />
          </div>
        </aside>

        <main className="col-span-3 bg-white flex flex-col h-full min-h-0 overflow-hidden">
          {selectedUser ? (
            <ChatContainer key={selectedUser._id || `${selectedUser.buyer}:${selectedUser.seller}:${selectedUser.listing?._id || selectedUser.listing || 'draft'}`} user={selectedUser} />
          ) : (
            <NoConversationPlaceholder />
          )}
        </main>

      </div>
    </div>
    
  );
}
