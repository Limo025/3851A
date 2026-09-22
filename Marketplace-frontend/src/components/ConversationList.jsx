import { useState } from 'react';
import { Search } from 'lucide-react';
import { useChatStore } from '../store/useChatStore.js';

function formatConversationTime(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function ConversationList() {
  const [searchTerm, setSearchTerm] = useState('');
  const {
    conversations,
    currentMode,
    selectedUser,
    unreadConversationIds,
    isUserLoading,
    selectConversation,
    getMessages,
  } = useChatStore();

  async function handleSelect(conversation) {
    selectConversation(conversation);
    await getMessages(conversation._id, currentMode);
  }

  const normalizedSearch = searchTerm.trim().toLocaleLowerCase();
  const filteredConversations = conversations.filter((conversation) => {
    if (!normalizedSearch) return true;

    const otherUser = currentMode === 'buyer'
      ? conversation.sellerDetails
      : conversation.buyerDetails;
    const searchableText = [
      otherUser?.username,
      conversation.listing?.title,
      conversation.lastMessage,
    ].filter(Boolean).join(' ').toLocaleLowerCase();

    return searchableText.includes(normalizedSearch);
  });

  return (
    <div>
      <label className="relative mb-4 block">
        <span className="sr-only">Search conversations</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
        <input
          type="search"
          className="h-10 w-full rounded-lg border border-white/40 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-white focus:ring-2 focus:ring-white/40"
          placeholder="Search conversations"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </label>

      {isUserLoading ? (
        <p className="px-2 py-4 text-sm text-blue-100">Loading conversations…</p>
      ) : conversations.length === 0 ? (
        <p className="px-2 py-4 text-sm text-blue-100">
          No {currentMode} conversations yet.
        </p>
      ) : filteredConversations.length === 0 ? (
        <p className="px-2 py-4 text-sm text-blue-100">No matching conversations.</p>
      ) : (
        <ul className="space-y-2" aria-label={`${currentMode} conversations`}>
          {filteredConversations.map((conversation) => {
            const otherUser = currentMode === 'buyer'
              ? conversation.sellerDetails
              : conversation.buyerDetails;
            const username = otherUser?.username || 'Marketplace user';
            const isSelected = selectedUser?._id === conversation._id;
            const isUnread = unreadConversationIds.includes(String(conversation._id));

            return (
              <li key={conversation._id}>
                <button
                  type="button"
                  className={`w-full rounded-lg p-3 text-left transition-colors ${
                    isSelected
                      ? 'bg-white/25 text-white'
                      : 'text-white hover:bg-white/15'
                  }`}
                  aria-pressed={isSelected}
                  aria-label={isUnread ? `${username}, unread messages` : undefined}
                  onClick={() => handleSelect(conversation)}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 font-semibold">
                        <span className="min-w-0 truncate">{username}</span>
                        {isUnread && <span className="size-2.5 shrink-0 rounded-full border border-white bg-blue-300" aria-hidden="true" />}
                      </span>
                      <span className="block truncate text-xs text-blue-100">
                        {conversation.listing?.title || 'Listing unavailable'}
                      </span>
                    </span>
                    <span className="shrink-0 text-[0.7rem] text-blue-100">
                      {formatConversationTime(conversation.lastMessageAt)}
                    </span>
                  </span>
                  <span className="mt-2 block truncate text-sm text-blue-50">
                    {conversation.lastMessage || 'No messages yet'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
