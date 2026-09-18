import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Paperclip, Send, X } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import { Message, MessageAvatar, MessageContent, MessageFooter } from '@/components/ui/message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChatStore } from '../store/useChatStore.js';

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
  const messageEndRef = useRef(null);
  const { messages, currentMode, isMessagesLoading, isSendingMessage, sendMessage } = useChatStore();

  const currentUserId = currentMode === 'buyer' ? conversation.buyer : conversation.seller;
  const recipient = currentMode === 'buyer' ? conversation.sellerDetails : conversation.buyerDetails;
  const recipientId = currentMode === 'buyer' ? conversation.seller : conversation.buyer;
  const recipientName = recipient?.username || 'Marketplace user';
  const listingId = conversation.listing?._id || conversation.listing;

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    if ((!text.trim() && !image) || isSendingMessage) return;

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
    <section className="flex h-full min-h-0 flex-col bg-slate-50" aria-label={`Chat with ${recipientName}`}>
      <header className="border-b border-cyan-800 bg-cyan-700 px-5 py-4 text-white shadow-sm">
        <h2 className="font-semibold">{recipientName}</h2>
        <p className="truncate text-sm text-cyan-100">{conversation.listing?.title || 'Marketplace listing'}</p>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
        {isMessagesLoading ? (
          <p className="text-center text-sm text-slate-500">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-slate-500">No messages yet. Start the conversation.</p>
        ) : messages.map((message) => {
          const isOwnMessage = message.senderId === currentUserId;
          return (
            <Message key={message._id} align={isOwnMessage ? 'end' : 'start'}>
              <MessageAvatar>
                <Avatar><AvatarFallback>{initials(isOwnMessage ? 'You' : recipientName)}</AvatarFallback></Avatar>
              </MessageAvatar>
              <MessageContent>
                <Bubble variant={isOwnMessage ? 'default' : 'secondary'}>
                  <BubbleContent>
                    {message.image ? (
                      <a href={message.image} target="_blank" rel="noreferrer">
                        <img className="mb-2 max-h-72 max-w-full rounded-lg object-contain" src={message.image} alt="Message attachment" />
                      </a>
                    ) : null}
                    {message.text ? <p className="whitespace-pre-wrap">{message.text}</p> : null}
                  </BubbleContent>
                </Bubble>
                <MessageFooter>{formatMessageTime(message.createdAt)}</MessageFooter>
              </MessageContent>
            </Message>
          );
        })}
        <div ref={messageEndRef} />
      </div>

      <form className="border-t border-slate-200 bg-white p-3" onSubmit={handleSubmit}>
        {image ? (
          <div className="mb-3 flex w-fit items-start gap-2 rounded-lg border border-slate-200 p-2">
            <img className="h-20 w-20 rounded object-cover" src={image.dataUrl} alt={image.name} />
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove image" onClick={() => setImage(null)}><X /></Button>
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageChange} />
          <Button type="button" variant="outline" size="icon-lg" aria-label="Attach image" disabled={isSendingMessage} onClick={() => fileInputRef.current?.click()}><Paperclip /></Button>
          <Input className="h-9" value={text} placeholder={`Message ${recipientName}`} aria-label="Message" disabled={isSendingMessage} onChange={(event) => setText(event.target.value)} />
          <Button type="submit" size="icon-lg" aria-label="Send message" disabled={isSendingMessage || (!text.trim() && !image)}><Send /></Button>
        </div>
      </form>
    </section>
  );
}
