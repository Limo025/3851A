import { create } from 'zustand';
import toast from 'react-hot-toast';
import { apiFetch } from '../api/client.js';

const validModes = new Set(['buyer', 'seller']);
let chatStateVersion = 0;

function sortConversations(conversations) {
  return [...conversations].sort((first, second) => {
    const firstTime = new Date(first.lastMessageAt || first.updatedAt || 0).getTime();
    const secondTime = new Date(second.lastMessageAt || second.updatedAt || 0).getTime();
    return secondTime - firstTime;
  });
}

function getInitialMode() {
  if (typeof window === 'undefined') return 'buyer';

  const storedMode = window.localStorage.getItem('currentMode');
  return validModes.has(storedMode) ? storedMode : 'buyer';
}

export const useChatStore = create((set, get) => ({
  conversations: [],
  messages: [],
  currentMode: getInitialMode(),
  selectedUser: null,
  isUserLoading: false,
  isMessagesLoading: false,
  isSendingMessage: false,

  resetChatState: () => {
    chatStateVersion += 1;
    set({
      conversations: [],
      messages: [],
      selectedUser: null,
      isUserLoading: false,
      isMessagesLoading: false,
      isSendingMessage: false,
    });
  },

  toggleMode: (mode) => {
    if (!validModes.has(mode)) return;

    window.localStorage.setItem('currentMode', mode);
    set({
      currentMode: mode,
      selectedUser: null,
      conversations: [],
      messages: [],
    });
  },

  setSelectedUser: (conversation) => {
    set({ selectedUser: conversation, messages: [] });
  },

  selectConversation: (conversation) => {
    set({ selectedUser: conversation, messages: [] });
  },

  startConversationDraft: (conversation) => {
    window.localStorage.setItem('currentMode', 'buyer');
    set({ currentMode: 'buyer', selectedUser: conversation, messages: [] });
  },

  getAllConversations: async (mode = get().currentMode) => {
    const requestVersion = chatStateVersion;
    const role = validModes.has(mode) ? mode : 'buyer';
    set({ isUserLoading: true });

    try {
      const conversations = await apiFetch(`/api/chat?role=${role}`, {
        auth: true,
      });
      const nextConversations = Array.isArray(conversations)
        ? sortConversations(conversations)
        : [];
      if (requestVersion !== chatStateVersion) return [];
      set({ conversations: nextConversations });
      return nextConversations;
    } catch (error) {
      if (requestVersion !== chatStateVersion) return [];
      set({ conversations: [] });
      toast.error(error.message || 'Could not load conversations');
      return [];
    } finally {
      if (requestVersion === chatStateVersion) {
        set({ isUserLoading: false });
      }
    }
  },

  getMessages: async (conversationId, mode = get().currentMode) => {
    if (!conversationId) return [];

    const requestVersion = chatStateVersion;
    const role = validModes.has(mode) ? mode : 'buyer';
    set({ isMessagesLoading: true, messages: [] });

    try {
      const result = await apiFetch(
        `/api/chat/messages/${encodeURIComponent(conversationId)}?role=${role}`,
        { auth: true },
      );
      const nextMessages = Array.isArray(result?.messages) ? result.messages : [];
      if (requestVersion !== chatStateVersion) return [];
      set({
        messages: nextMessages,
        selectedUser: result?.conversation ?? get().selectedUser,
      });
      return nextMessages;
    } catch (error) {
      if (requestVersion !== chatStateVersion) return [];
      set({ messages: [] });
      toast.error(error.message || 'Could not load messages');
      return [];
    } finally {
      if (requestVersion === chatStateVersion) {
        set({ isMessagesLoading: false });
      }
    }
  },

  sendMessage: async ({ conversationId, recipientId, listingId, text, image }) => {
    const normalizedText = typeof text === 'string' ? text.trim() : '';
    if (!recipientId || !listingId || (!normalizedText && !image)) {
      toast.error('A recipient, listing, and message or image are required');
      return null;
    }

    const requestVersion = chatStateVersion;
    set({ isSendingMessage: true });

    try {
      const message = await apiFetch(
        `/api/chat/send/${encodeURIComponent(recipientId)}`,
        {
          method: 'POST',
          auth: true,
          body: { conversationId, listingId, text: normalizedText, image },
        },
      );

      if (requestVersion !== chatStateVersion) return null;
      set((state) => {
        const preview = message.text || (message.image ? 'Image' : '');
        const selectedConversation = state.selectedUser;
        const persistedConversation = selectedConversation?.isDraft
          ? {
              ...selectedConversation,
              _id: message.conversationId,
              isDraft: false,
              lastMessage: preview,
              lastMessageAt: message.createdAt,
            }
          : null;
        const hasConversation = state.conversations.some(
          (conversation) => conversation._id === message.conversationId,
        );
        const conversations = state.conversations.map((conversation) =>
          conversation._id === message.conversationId
            ? { ...conversation, lastMessage: preview, lastMessageAt: message.createdAt }
            : conversation,
        );

        if (persistedConversation && !hasConversation) {
          conversations.push(persistedConversation);
        }

        return {
          messages: [...state.messages, message],
          selectedUser: persistedConversation ?? selectedConversation,
          conversations: sortConversations(conversations),
        };
      });
      return message;
    } catch (error) {
      if (requestVersion !== chatStateVersion) return null;
      toast.error(error.message || 'Could not send message');
      return null;
    } finally {
      if (requestVersion === chatStateVersion) {
        set({ isSendingMessage: false });
      }
    }
  },

  receiveMessage: ({ message, conversation }) => {
  if (!message?._id || !message.conversationId || !conversation?._id) {
    return;
  }

  set((state) => {
    const conversationId = String(message.conversationId);
    const selectedConversationId = String(state.selectedUser?._id || '');
    const isSelectedConversation =
      selectedConversationId === conversationId;

    const messageAlreadyExists = state.messages.some(
      (existingMessage) => String(existingMessage._id) === String(message._id),
    );

    let recipientRole = null;

    if (String(conversation.buyer) === String(message.recipientId)) {
      recipientRole = 'buyer';
    } else if (String(conversation.seller) === String(message.recipientId)) {
      recipientRole = 'seller';
    }

    if (!recipientRole) {
      return state;
    }

    let conversations = state.conversations;

    // Only show the conversation in the mode where this user received it.
    if (state.currentMode === recipientRole) {
      const preview = message.text || (message.image ? 'Image' : '');
      const existingConversation = state.conversations.some(
        (item) => String(item._id) === String(conversation._id),
      );

      conversations = existingConversation
        ? state.conversations.map((item) =>
            String(item._id) === String(conversation._id)
              ? {
                  ...item,
                  ...conversation,
                  lastMessage: preview,
                  lastMessageAt: message.createdAt,
                }
              : item,
          )
        : [
            ...state.conversations,
            {
              ...conversation,
              lastMessage: preview,
              lastMessageAt: message.createdAt,
            },
          ];

      conversations = sortConversations(conversations);
    }

    return {
      conversations,
      messages:
        state.currentMode === recipientRole
          && isSelectedConversation
          && !messageAlreadyExists
            ? [...state.messages, message]
            : state.messages,
    };
  });
},
}));
