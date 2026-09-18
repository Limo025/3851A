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

  return (
    <div className="p-4 md:p-8 min-h-[calc(100vh-4rem)] flex items-center justify-center">
      {/* Centered Chat Card Box (Fixed max width & height) */}
      <div className="w-full max-w-6xl h-[80vh] bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200 grid grid-cols-4">
        
        {/* Left Sidebar Box (1/4 Width) */}
        <aside className="col-span-1 bg-slate-800 text-white p-4 flex flex-col border-r border-slate-700 p">
          <div className="pb-4 border-b border-slate-700">
            <ModeTabSwitch />
          </div>
          
          <div className="flex-1 overflow-y-auto mt-4">
            <ConversationList />
          </div>
        </aside>

        {/* Right Main Chat Area Box (3/4 Width) */}
        <main className="col-span-3 bg-gray-400 flex flex-col h-full overflow-hidden">
          {selectedUser ? (
            <ChatContainer key={selectedUser._id} user={selectedUser} />
          ) : (
            <NoConversationPlaceholder />
          )}
        </main>

      </div>
    </div>
    
  );
}
