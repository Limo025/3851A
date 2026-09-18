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
  const {
    conversations,
    currentMode,
    selectedUser,
    isUserLoading,
    selectConversation,
    getMessages,
  } = useChatStore();

  async function handleSelect(conversation) {
    selectConversation(conversation);
    await getMessages(conversation._id, currentMode);
  }

  if (isUserLoading) {
    return <p className="px-2 py-4 text-sm text-slate-300">Loading conversations…</p>;
  }

  if (conversations.length === 0) {
    return (
      <p className="px-2 py-4 text-sm text-slate-300">
        No {currentMode} conversations yet.
      </p>
    );
  }

  return (
    <ul className="space-y-2" aria-label={`${currentMode} conversations`}>
      {conversations.map((conversation) => {
        const otherUser = currentMode === 'buyer'
          ? conversation.sellerDetails
          : conversation.buyerDetails;
        const username = otherUser?.username || 'Marketplace user';
        const isSelected = selectedUser?._id === conversation._id;

        return (
          <li key={conversation._id}>
            <button
              type="button"
              className={`w-full rounded-lg p-3 text-left transition-colors ${
                isSelected
                  ? 'bg-cyan-500/20 text-white'
                  : 'text-slate-200 hover:bg-slate-700'
              }`}
              aria-pressed={isSelected}
              onClick={() => handleSelect(conversation)}
            >
              <span className="flex items-start justify-between gap-2">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{username}</span>
                  <span className="block truncate text-xs text-slate-400">
                    {conversation.listing?.title || 'Listing unavailable'}
                  </span>
                </span>
                <span className="shrink-0 text-[0.7rem] text-slate-400">
                  {formatConversationTime(conversation.lastMessageAt)}
                </span>
              </span>
              <span className="mt-2 block truncate text-sm text-slate-300">
                {conversation.lastMessage || 'No messages yet'}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
