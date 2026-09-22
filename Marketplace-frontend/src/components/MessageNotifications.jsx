import { useNavigate } from 'react-router-dom';
import { Toaster } from './ui/toast.jsx';
import { useChatStore } from '../store/useChatStore.js';

export default function MessageNotifications() {
  const navigate = useNavigate();

  function openConversation({ conversation, role }) {
    if (!conversation?._id || !['buyer', 'seller'].includes(role)) return;
    const chat = useChatStore.getState();
    if (chat.currentMode !== role) chat.toggleMode(role);
    useChatStore.getState().selectConversation(conversation);
    navigate('/messages');
    useChatStore.getState().getMessages(conversation._id, role);
  }

  return <Toaster onToastClick={openConversation} />;
}
