import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client.js';
import { handleAuthenticationError } from '../auth/handleAuthenticationError.js';
import { buildReturnPath } from '../auth/returnPath.js';
import { session } from '../auth/session.js';
import ListingGrid from '../components/ListingGrid.jsx';
import { getAvailabilityErrorMessage, requestListingAvailabilityUpdate } from '../utils/sellerListings.js';
import '../css/listings.css';

export default function MyListings() {
  const navigate = useNavigate();
  const location = useLocation();
  const mounted = useRef(false);
  const activeStatusIds = useRef(new Set());
  const statusControllers = useRef(new Map());
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [updatingIds, setUpdatingIds] = useState(new Set());
  const returnPath = buildReturnPath(location);

  useEffect(() => {
    const controllers = statusControllers.current;
    mounted.current = true;
    return () => {
      mounted.current = false;
      controllers.forEach((controller) => controller.abort());
      controllers.clear();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchListings() {
      setLoading(true);
      setLoadError('');
      try {
        const data = await apiFetch('/api/listings/mine', {
          auth: true,
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setListings(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        if (!handleAuthenticationError(error, {
          sessionManager: session,
          navigate,
          returnPath,
        })) {
          setLoadError(error instanceof Error ? error.message : 'Unable to load your listings. Please try again.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    fetchListings();
    return () => controller.abort();
  }, [navigate, returnPath]);

  async function updateAvailability(listing) {
    const controller = new AbortController();
    const sold = !listing.soldAt;
    setActionError('');
    setFeedback('');

    try {
      const updated = await requestListingAvailabilityUpdate({
        listingId: listing._id,
        sold,
        activeIds: activeStatusIds.current,
        request: apiFetch,
        signal: controller.signal,
        onPendingChange: (pending) => {
          if (pending) statusControllers.current.set(listing._id, controller);
          else if (statusControllers.current.get(listing._id) === controller) statusControllers.current.delete(listing._id);
          if (!mounted.current) return;
          setUpdatingIds((current) => {
            const next = new Set(current);
            if (pending) next.add(listing._id);
            else next.delete(listing._id);
            return next;
          });
        },
      });

      if (updated && mounted.current) {
        setListings((current) => current.map((item) => item._id === listing._id ? { ...item, ...updated } : item));
        setFeedback(`“${listing.title || 'Listing'}” is now ${sold ? 'sold out' : 'available'}.`);
      }
    } catch (error) {
      if (controller.signal.aborted || !mounted.current) return;
      if (!handleAuthenticationError(error, {
        sessionManager: session,
        navigate,
        returnPath,
      })) {
        setActionError(getAvailabilityErrorMessage(error));
      }
    } finally {
      if (statusControllers.current.get(listing._id) === controller) statusControllers.current.delete(listing._id);
    }
  }

  function renderActions(listing) {
    const updating = updatingIds.has(listing._id);
    return (
      <div className="seller-listing-actions">
        <span className={listing.soldAt ? 'seller-listing-status seller-listing-status--sold' : 'seller-listing-status'}>
          {listing.soldAt ? 'Sold out' : 'Available'}
        </span>
        <Link to={`/listings/${listing._id}/edit`}>Edit</Link>
        <button
          type="button"
          onClick={() => updateAvailability(listing)}
          disabled={updating}
          aria-label={`${listing.soldAt ? 'Make available' : 'Mark sold out'} ${listing.title || 'listing'}`}
        >
          {updating ? 'Updating…' : listing.soldAt ? 'Make available' : 'Mark sold out'}
        </button>
      </div>
    );
  }

  return (
    <main className="marketplace-page">
      <div className="marketplace-page__content">
        <header className="marketplace-page__header">
          <h1>My listings</h1>
          <p>Manage the items you have listed for the university community.</p>
        </header>

        {feedback ? <p className="seller-listings__feedback" role="status">{feedback}</p> : null}
        {actionError ? <p className="listing-state listing-state--error seller-listings__action-error" role="alert">{actionError}</p> : null}

        <ListingGrid
          listings={listings}
          loading={loading}
          error={loadError}
          emptyMessage={<>You have not created any listings yet. <Link to="/sell">Create a listing</Link>.</>}
          renderActions={renderActions}
        />
      </div>
    </main>
  );
}
