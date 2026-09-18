import { useState } from 'react';
import { Link } from 'react-router-dom';

const MAX_LISTINGS = 5;

function formatPrice(value) {
  return typeof value === 'number' && Number.isFinite(value)
    ? new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value)
    : '';
}

function safePublicThumbnail(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

function InventorySummary({ summary }) {
  if (!summary) return null;

  const total = Number.isFinite(summary.total) ? summary.total : 0;
  const priceRange = Number.isFinite(summary.minPrice) && Number.isFinite(summary.maxPrice)
    ? `AUD ${summary.minPrice}–${summary.maxPrice}`
    : 'No price range available';

  return (
    <section className="marketplace-assistant__summary" aria-label="Inventory summary">
      <h3>{total} matching {total === 1 ? 'listing' : 'listings'}</h3>
      <p>{priceRange}</p>
      {summary.byCondition ? (
        <ul>
          {Object.entries(summary.byCondition).map(([condition, count]) => (
            <li key={condition}>{condition}: {count}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function ListingResults({ listings }) {
  if (!Array.isArray(listings) || listings.length === 0) return null;

  return (
    <section className="marketplace-assistant__results" aria-label="Matching listings">
      <h3>Marketplace matches</h3>
      <ul>
        {listings.slice(0, MAX_LISTINGS).map((listing) => (
          <li key={listing.id}>
            {safePublicThumbnail(listing.imageUrl) ? (
              <img
                src={safePublicThumbnail(listing.imageUrl)}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : null}
            <strong>{listing.title}</strong>
            <span>{formatPrice(listing.price)}{listing.condition ? ` · ${listing.condition}` : ''}</span>
            <Link to={`/listings/${encodeURIComponent(listing.id)}`}>View listing</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DraftSummary({ draft }) {
  if (!draft || typeof draft !== 'object') return null;

  return (
    <section className="marketplace-assistant__draft" aria-label="Listing draft summary">
      <h3>Draft listing</h3>
      <strong>{draft.title}</strong>
      <p>{draft.description}</p>
      <p>
        {formatPrice(draft.price)}
        {draft.condition ? ` · ${draft.condition}` : ''}
        {draft.category ? ` · ${draft.category}` : ''}
      </p>
    </section>
  );
}

export default function ChatPanel({
  messages = [],
  inventorySummary,
  listings = [],
  loading = false,
  error = '',
  draftReady = false,
  draft,
  onSubmit,
  onReviewDraft,
  onClose,
}) {
  const [message, setMessage] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage || loading) return;
    onSubmit(trimmedMessage);
    setMessage('');
  }

  return (
    <section
      id="marketplace-assistant-panel"
      className="marketplace-assistant__panel"
      role="dialog"
      aria-modal="false"
      aria-labelledby="marketplace-assistant-title"
    >
      <header className="marketplace-assistant__header">
        <div>
          <p>Marketplace</p>
          <h2 id="marketplace-assistant-title">Marketplace assistant</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Close marketplace assistant">×</button>
      </header>

      <div className="marketplace-assistant__log" role="log" aria-live="polite" aria-relevant="additions text">
        {messages.length === 0 ? (
          <p className="marketplace-assistant__welcome">
            Ask me to find an item or prepare a listing draft.
          </p>
        ) : messages.map((entry, index) => (
          <div
            className={`marketplace-assistant__message marketplace-assistant__message--${entry.role === 'user' ? 'user' : 'assistant'}`}
            key={`${entry.role}-${index}`}
          >
            <span>{entry.role === 'user' ? 'You' : 'Assistant'}</span>
            <p>{entry.content}</p>
          </div>
        ))}

        <InventorySummary summary={inventorySummary} />
        <ListingResults listings={listings} />

        {draftReady ? (
          <>
            <DraftSummary draft={draft} />
            <button className="marketplace-assistant__review" type="button" onClick={onReviewDraft}>
              Review listing draft
            </button>
          </>
        ) : null}
        {loading ? <p className="marketplace-assistant__status" role="status">Assistant is thinking…</p> : null}
        {error ? <p className="marketplace-assistant__error" role="alert">{error}</p> : null}
      </div>

      <form className="marketplace-assistant__form" onSubmit={handleSubmit}>
        <label htmlFor="marketplace-assistant-message">Message the marketplace assistant</label>
        <div>
          <input
            id="marketplace-assistant-message"
            name="message"
            type="text"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={1000}
            autoComplete="off"
            disabled={loading}
          />
          <button type="submit" disabled={loading || !message.trim()}>Send</button>
        </div>
      </form>
    </section>
  );
}
