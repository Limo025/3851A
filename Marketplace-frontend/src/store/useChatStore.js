import { create } from 'zustand'
import { apiFetch } from '../api/client';
export const useChatStore = create((set, get) => ({
    conversations: [],
    messages: [],
    currentMode: "buyer",
    selectedUser: null,
    isUserLoading: false,
    isMessagesLoading: false,
    
    toggleMode: (mode) => {
        localStorage.setItem("currentMode", mode);
        set({ currentMode: mode, selectedUser: null});
    },

    setSelectedUser: (user) => set({ selectedUser: user}),
    getAllConversations:  async () => {
        set({ isUserLoading: true });
        try {
            const res = await apiFetch('/api/chat/allContacts', {
                auth: true,
                signal: controller.signal,
            });
            set({ conversations: res });
        } catch (error) {
            toast.error(error.message || 'Could not load conversation');
            return []
        } finally {
            set({ isUserLoading: false });
        }
    }
}));