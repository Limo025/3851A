import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { handleAuthenticationError } from '../auth/handleAuthenticationError.js';
import { buildReturnPath } from '../auth/returnPath.js';
import { session } from '../auth/session.js';
import { formatListingPrice } from '../utils/listingFormat.js';
import { loadWatchlist, removeFromWatchlist, splitWatchlist } from '../utils/watchlist.js';
import '../css/listings.css';

function WatchlistSection({ title, listings, unavailable, removingId, onRemove }) {
  return (
    <section className="watchlist-section">
      <h2>{title}</h2>
      {listings.length === 0 ? <p className="watchlist-empty">No items in this section.</p> : (
        <ul className="watchlist-grid">
          {listings.map((listing) => {
            const image = listing.images?.[0];
            return (
              <li className={unavailable ? 'watchlist-item watchlist-item--unavailable' : 'watchlist-item'} key={listing._id}>
                <Link to={`/listings/${listing._id}`}>
                  {image?.url ? <img src={image.url} alt={listing.title} loading="lazy" /> : <span className="watchlist-item__image-empty">No image</span>}
                  <strong>{listing.title}</strong>
                  <span>{formatListingPrice(listing.price)}</span>
                  {unavailable ? <span className="watchlist-item__status">No longer available</span> : null}
                </Link>
                <button type="button" disabled={removingId === listing._id} onClick={() => onRemove(listing)}>
                  {removingId === listing._id ? 'Removing…' : 'Remove'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default function Watchlist() {
  const navigate = useNavigate();
  const location = useLocation();
  const [listings, setListings] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [removingId, setRemovingId] = useState('');
  const returnPath = buildReturnPath(location);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    loadWatchlist(page)
      .then((data) => {
        if (cancelled) return;
        setListings(Array.isArray(data?.listings) ? data.listings : []);
        setPages(Number.isInteger(data?.pages) ? data.pages : 1);
      })
      .catch((requestError) => {
        if (cancelled) return;
        if (!handleAuthenticationError(requestError, { sessionManager: session, navigate, returnPath })) {
          setError(requestError instanceof Error ? requestError.message : 'Unable to load your watchlist.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [navigate, page, returnPath]);

  async function handleRemove(listing) {
    setRemovingId(listing._id);
    setError('');
    try {
      await removeFromWatchlist(listing._id);
      setListings((current) => current.filter((item) => item._id !== listing._id));
    } catch (requestError) {
      if (!handleAuthenticationError(requestError, { sessionManager: session, navigate, returnPath })) {
        setError(requestError instanceof Error ? requestError.message : 'Unable to remove this listing.');
      }
    } finally {
      setRemovingId('');
    }
  }

  const groups = splitWatchlist(listings);

  return (
    <main className="marketplace-page">
      <div className="marketplace-page__content">
        <header className="marketplace-page__header"><h1>Watchlist</h1></header>
        {loading ? <p className="listing-state" role="status">Loading watchlist…</p> : null}
        {error ? <p className="listing-state listing-state--error" role="alert">{error}</p> : null}
        {!loading ? (
          <>
            <WatchlistSection title="Watchlisted items" listings={groups.available} removingId={removingId} onRemove={handleRemove} />
            <WatchlistSection title="Items no longer available" listings={groups.unavailable} unavailable removingId={removingId} onRemove={handleRemove} />
            {pages > 1 ? (
              <nav className="listing-pagination" aria-label="Watchlist pages">
                <button type="button" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Previous</button>
                <span>Page {page} of {pages}</span>
                <button type="button" disabled={page === pages} onClick={() => setPage((current) => current + 1)}>Next</button>
              </nav>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}
