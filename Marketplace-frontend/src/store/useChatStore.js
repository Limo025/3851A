import { create } from 'zustand';
import toast from 'react-hot-toast';
import { apiFetch } from '../api/client.js';
import { toast as messageToast } from '../components/ui/toast.jsx';

const validModes = new Set(['buyer', 'seller']);
let chatStateVersion = 0;
let messagesRequestId = 0;
let unreadStateVersion = 0;

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
  unreadConversationIds: [],
  unreadConversationRoles: {},
  isMessagesPageOpen: false,
  currentMode: getInitialMode(),
  selectedUser: null,
  isUserLoading: false,
  isMessagesLoading: false,
  isSendingMessage: false,

  resetChatState: () => {
    chatStateVersion += 1;
    messagesRequestId += 1;
    unreadStateVersion += 1;
    set({
      conversations: [],
      messages: [],
      unreadConversationIds: [],
      unreadConversationRoles: {},
      selectedUser: null,
      isUserLoading: false,
      isMessagesLoading: false,
      isSendingMessage: false,
    });
  },

  toggleMode: (mode) => {
    if (!validModes.has(mode)) return;

    window.localStorage.setItem('currentMode', mode);
    messagesRequestId += 1;
    set({
      currentMode: mode,
      selectedUser: null,
      conversations: [],
      messages: [],
    });
  },

  setSelectedUser: (conversation) => {
    messagesRequestId += 1;
    set({ selectedUser: conversation, messages: [] });
  },

  selectConversation: (conversation) => {
    messagesRequestId += 1;
    set({ selectedUser: conversation, messages: [] });
  },

  startConversationDraft: (conversation) => {
    messagesRequestId += 1;
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

  loadUnreadConversations: async () => {
    const requestVersion = chatStateVersion;
    const unreadVersion = unreadStateVersion;
    try {
      const unread = await apiFetch('/api/chat/unread', { auth: true });
      if (requestVersion === chatStateVersion && unreadVersion !== unreadStateVersion) {
        return get().loadUnreadConversations();
      }
      if (requestVersion === chatStateVersion) {
        const entries = Array.isArray(unread) ? unread : [];
        set({
          unreadConversationIds: entries.map((entry) => entry.id),
          unreadConversationRoles: Object.fromEntries(entries.map((entry) => [entry.id, entry.role])),
        });
      }
    } catch {
      // Keep the existing indicator if a refresh fails.
    }
  },

  markConversationRead: async (conversationId) => {
    if (!conversationId) return;
    const requestVersion = chatStateVersion;
    const unreadVersion = unreadStateVersion;
    try {
      await apiFetch(`/api/chat/messages/${encodeURIComponent(conversationId)}/read`, {
        method: 'POST', auth: true,
      });
      if (requestVersion === chatStateVersion && unreadVersion === unreadStateVersion) {
        unreadStateVersion += 1;
        set((state) => {
          const roles = { ...state.unreadConversationRoles };
          delete roles[String(conversationId)];
          return {
            unreadConversationIds: state.unreadConversationIds.filter((id) => id !== String(conversationId)),
            unreadConversationRoles: roles,
          };
        });
      }
    } catch {
      // The indicator stays visible until the server confirms the read.
    }
  },

  getMessages: async (conversationId, mode = get().currentMode) => {
    if (!conversationId) return [];

    const requestVersion = chatStateVersion;
    const requestId = ++messagesRequestId;
    const role = validModes.has(mode) ? mode : 'buyer';
    set({ isMessagesLoading: true, messages: [] });

    try {
      const result = await apiFetch(
        `/api/chat/messages/${encodeURIComponent(conversationId)}?role=${role}`,
        { auth: true },
      );
      const nextMessages = Array.isArray(result?.messages) ? result.messages : [];
      if (requestVersion !== chatStateVersion || requestId !== messagesRequestId) return [];
      set({
        messages: [...nextMessages, ...get().messages.filter((liveMessage) =>
          String(liveMessage.conversationId) === String(conversationId)
          && !nextMessages.some((fetchedMessage) => String(fetchedMessage._id) === String(liveMessage._id)),
        )],
        selectedUser: result?.conversation ?? get().selectedUser,
      });
      get().markConversationRead(conversationId);
      return nextMessages;
    } catch (error) {
      if (requestVersion !== chatStateVersion || requestId !== messagesRequestId) return [];
      set({ messages: [] });
      toast.error(error.message || 'Could not load messages');
      return [];
    } finally {
      if (requestVersion === chatStateVersion && requestId === messagesRequestId) {
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
  if (String(conversation.buyer) !== String(message.recipientId)
    && String(conversation.seller) !== String(message.recipientId)) return;

  const stateBefore = get();
  const conversationId = String(message.conversationId);
  const alreadyVisible = stateBefore.messages.some((item) => String(item._id) === String(message._id));
  const recipientRole = String(conversation.buyer) === String(message.recipientId) ? 'buyer' : 'seller';
  const isOpen = stateBefore.isMessagesPageOpen
    && stateBefore.currentMode === recipientRole
    && String(stateBefore.selectedUser?._id) === conversationId;
  unreadStateVersion += 1;
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
      unreadConversationIds: isOpen || state.unreadConversationIds.includes(conversationId)
        ? state.unreadConversationIds
        : [...state.unreadConversationIds, conversationId],
      unreadConversationRoles: isOpen ? state.unreadConversationRoles : {
        ...state.unreadConversationRoles,
        [conversationId]: recipientRole,
      },
      messages:
        state.currentMode === recipientRole
          && isSelectedConversation
          && !messageAlreadyExists
            ? [...state.messages, message]
            : state.messages,
    };
  });
  if (isOpen) get().markConversationRead(conversationId);
  if (!alreadyVisible && !isOpen) {
    const sender = String(conversation.buyer) === String(message.senderId)
      ? conversation.buyerDetails?.username : conversation.sellerDetails?.username;
    const role = String(conversation.buyer) === String(message.recipientId) ? 'buyer' : 'seller';
    try {
      messageToast.add({ title: 'You got a new message message', description: `${sender || 'Marketplace user'}: ${message.text || 'Image'}`, type: 'info', data: { conversation, role } });
    } catch (error) {
      console.error('Could not show message notification:', error);
    }
  }
},
}));
