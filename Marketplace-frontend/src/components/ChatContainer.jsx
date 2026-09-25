import { Fragment, useLayoutEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowDown, Paperclip, Send, X } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import { Message, MessageAvatar, MessageContent, MessageFooter } from '@/components/ui/message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChatStore } from '../store/useChatStore.js';
import { getOtherParticipant, isConversationListingSold, isOtherParticipantBanned } from '../utils/chatParticipants.js';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function initials(name) {
  return (name || 'Marketplace user').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

function formatMessageTime(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' });
}

function messageDay(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toDateString();
}

function formatMessageDay(value) {
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return 'Today';
  today.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read the selected image'));
    reader.readAsDataURL(file);
  });
}

export default function ChatContainer({ user: conversation }) {
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const fileInputRef = useRef(null);
  const messageListRef = useRef(null);
  const hasScrolledInitially = useRef(false);
  const isNearBottom = useRef(true);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const { messages, currentMode, isMessagesLoading, isSendingMessage, sendMessage } = useChatStore();

  const currentUserId = currentMode === 'buyer' ? conversation.buyer : conversation.seller;
  const recipient = getOtherParticipant(conversation, currentMode);
  const recipientIsBanned = isOtherParticipantBanned(conversation, currentMode);
  const listingIsSold = isConversationListingSold(conversation);
  const recipientId = currentMode === 'buyer' ? conversation.seller : conversation.buyer;
  const recipientName = recipient?.username || 'Marketplace user';
  const listingId = conversation.listing?._id || conversation.listing;

  useLayoutEffect(() => {
    if (isMessagesLoading) {
      hasScrolledInitially.current = false;
      isNearBottom.current = true;
      return;
    }
    if (messages.length === 0) return;
    const messageList = messageListRef.current;
    if (!messageList) return;
    if (!hasScrolledInitially.current || isNearBottom.current) {
      messageList.scrollTop = messageList.scrollHeight;
      hasScrolledInitially.current = true;
      isNearBottom.current = true;
    }
  }, [messages, isMessagesLoading]);

  function handleMessageScroll() {
    const messageList = messageListRef.current;
    if (!messageList) return;
    isNearBottom.current = messageList.scrollHeight - messageList.scrollTop - messageList.clientHeight < 120;
    setShowJumpToLatest(!isNearBottom.current);
  }

  function scrollToLatest() {
    const messageList = messageListRef.current;
    if (!messageList) return;
    isNearBottom.current = true;
    setShowJumpToLatest(false);
    messageList.scrollTo({ top: messageList.scrollHeight, behavior: 'smooth' });
  }

  async function handleImageChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      toast.error('Choose a JPEG, PNG, WebP, or GIF image');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error('Image must be 5 MB or smaller');
      return;
    }

    try {
      setImage({ name: file.name, dataUrl: await readImage(file) });
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (recipientIsBanned || (!text.trim() && !image) || isSendingMessage) return;

    const sent = await sendMessage({
      conversationId: conversation.isDraft ? undefined : conversation._id,
      recipientId,
      listingId,
      text,
      image: image?.dataUrl,
    });
    if (sent) {
      setText('');
      setImage(null);
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-col bg-white" aria-label={`Chat with ${recipientName}`}>
      <header className="border-b border-blue-800 bg-blue-700 px-5 py-4 text-white shadow-sm">
        <h2 className="font-semibold">{recipientName}</h2>
        <p className="truncate text-sm text-cyan-100">{conversation.listing?.title || 'Marketplace listing'}</p>
      </header>

      {recipientIsBanned && <p className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm font-medium text-red-800" role="alert">This user has been banned.</p>}
      {listingIsSold && <p className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm font-medium text-amber-900" role="status">This item is sold out.</p>}

      <div className="relative min-h-0 flex-1">
      <div ref={messageListRef} onScroll={handleMessageScroll} className="h-full space-y-4 overflow-y-auto p-4" aria-live="polite">
        {isMessagesLoading ? (
          <p className="text-center text-sm text-slate-500">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-slate-500">No messages yet. Start the conversation.</p>
        ) : messages.map((message, index) => {
          const isOwnMessage = message.senderId === currentUserId;
          const day = messageDay(message.createdAt);
          const showDayDivider = day && day !== messageDay(messages[index - 1]?.createdAt);
          return (
            <Fragment key={message._id}>
            {showDayDivider && (
              <div className="flex items-center gap-3 py-2 text-xs font-medium text-slate-500" aria-label={`Messages from ${formatMessageDay(message.createdAt)}`}>
                <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
                <span>{formatMessageDay(message.createdAt)}</span>
                <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
              </div>
            )}
            <Message align={isOwnMessage ? 'end' : 'start'}>
              <MessageAvatar>
                <Avatar><AvatarFallback>{initials(isOwnMessage ? 'You' : recipientName)}</AvatarFallback></Avatar>
              </MessageAvatar>
              <MessageContent>
                <Bubble variant={isOwnMessage ? 'default' : 'tinted'}>
                  <BubbleContent>
                    {message.image ? (
                      <a href={message.image} target="_blank" rel="noreferrer">
                        <img className="mb-2 max-h-72 max-w-full rounded-lg object-contain" src={message.image} alt="Message attachment" onLoad={() => {
                          if (isNearBottom.current) messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight });
                        }} />
                      </a>
                    ) : null}
                    {message.text ? <p className="whitespace-pre-wrap">{message.text}</p> : null}
                  </BubbleContent>
                </Bubble>
                <MessageFooter>{formatMessageTime(message.createdAt)}</MessageFooter>
              </MessageContent>
            </Message>
            </Fragment>
          );
        })}
      </div>
      {showJumpToLatest && <Button type="button" size="sm" className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full shadow-lg" onClick={scrollToLatest}><ArrowDown className="size-4" />Latest messages</Button>}
      </div>

      <form className="border-t border-slate-200 bg-white p-3" onSubmit={handleSubmit}>
        {image ? (
          <div className="mb-3 flex w-fit items-start gap-2 rounded-lg border border-slate-200 p-2">
            <img className="h-20 w-20 rounded object-cover" src={image.dataUrl} alt={image.name} />
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove image" onClick={() => setImage(null)}><X /></Button>
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={recipientIsBanned} onChange={handleImageChange} />
          <Button type="button" variant="outline" size="icon-lg" aria-label="Attach image" disabled={recipientIsBanned || isSendingMessage} onClick={() => fileInputRef.current?.click()}><Paperclip /></Button>
          <Input className="h-9" value={text} placeholder={recipientIsBanned ? 'This user has been banned' : `Message ${recipientName}`} aria-label="Message" readOnly={recipientIsBanned || isSendingMessage} onChange={(event) => setText(event.target.value)} />
          <Button type="submit" size="icon-lg" aria-label="Send message" disabled={recipientIsBanned || isSendingMessage || (!text.trim() && !image)}><Send /></Button>
        </div>
      </form>
    </section>
  );
}
