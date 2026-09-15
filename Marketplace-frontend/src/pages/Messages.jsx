import { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSockets';
import ModeTabSwitch from '../components/ModeTabSwitch.jsx'
import BuyerChat from '../components/BuyerChat.jsx'
import SellerChat from '../components/SellerChat.jsx'
import ChatContainer from '../components/ChatContainer.jsx'
import NoConversationPlaceholder from '../components/NoConversationPlaceholder.jsx'
import { useChatStore } from '../store/useChatStore.js';

export default function Messages() {
  const { currentMode, toggleMode, selectedUser } = useChatStore();

  return (
    <div id='contentBackground'>
      <div className="chat-container"> 
        {/*Left side */} 
        <div className='leftSide'>
          <ModeTabSwitch />
          {currentMode === "buyer" ? <BuyerChat /> : <SellerChat />}
        </div>
        {/*Right side */} 
        <div>
          {selectedUser ? <ChatContainer />: <NoConversationPlaceholder />}
        </div>
      </div>
    </div>
    
  );
}