import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { handleAuthenticationError } from '../auth/handleAuthenticationError.js';
import { buildReturnPath } from '../auth/returnPath.js';
import { session } from '../auth/session.js';
import { formatListingPrice } from '../utils/listingFormat.js';
import { loadBuyerPurchaseHistory } from '../utils/purchaseHistory.js';
import '../css/listings.css';

export default function PurchaseHistory() {
  const navigate = useNavigate();
  const location = useLocation();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const returnPath = buildReturnPath(location);

  useEffect(() => {
    let cancelled = false;

    loadBuyerPurchaseHistory()
      .then((items) => {
        if (!cancelled) setListings(items);
      })
      .catch((requestError) => {
        if (cancelled) return;
        if (!handleAuthenticationError(requestError, { sessionManager: session, navigate, returnPath })) {
          setError(requestError instanceof Error ? requestError.message : 'Unable to load purchase history.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [navigate, returnPath]);

  return (
    <main className="marketplace-page">
      <div className="marketplace-page__content">
        <header className="marketplace-page__header">
          <h1>Purchase history</h1>
        </header>

        {loading ? <p className="listing-state" role="status">Loading purchase history…</p> : null}
        {error ? <p className="listing-state listing-state--error" role="alert">{error}</p> : null}
        {!loading && !error && listings.length === 0 ? (
          <p className="listing-state" role="status">No purchase history yet.</p>
        ) : null}

        {!loading && !error && listings.length > 0 ? (
          <ul className="purchase-history" aria-label="Listings you have messaged about">
            {listings.map((listing) => {
              const image = listing.images?.[0];
              return (
                <li key={listing._id}>
                  <Link className="purchase-history__item" to={`/listings/${listing._id}`}>
                    {image?.url ? (
                      <img src={image.url} alt={listing.title} loading="lazy" />
                    ) : (
                      <span className="purchase-history__image-empty">No image</span>
                    )}
                    <span className="purchase-history__details">
                      <strong>{listing.title}</strong>
                      <span>{formatListingPrice(listing.price)}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </main>
  );
}
