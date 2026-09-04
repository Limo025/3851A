import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client.js';
import { handleAuthenticationError } from '../auth/handleAuthenticationError.js';
import { buildReturnPath } from '../auth/returnPath.js';
import { session } from '../auth/session.js';
import ListingGrid from '../components/ListingGrid.jsx';
import { getDeleteErrorMessage, requestListingDeletion } from '../utils/sellerListings.js';
import '../css/listings.css';

export default function MyListings() {
  const navigate = useNavigate();
  const location = useLocation();
  const mounted = useRef(false);
  const activeDeleteIds = useRef(new Set());
  const deleteControllers = useRef(new Map());
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [deletingIds, setDeletingIds] = useState(new Set());
  const returnPath = buildReturnPath(location);

  useEffect(() => {
    const controllers = deleteControllers.current;
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

  async function deleteListing(listing) {
    const controller = new AbortController();
    setActionError('');
    setFeedback('');

    try {
      const deleted = await requestListingDeletion({
        listingId: listing._id,
        activeIds: activeDeleteIds.current,
        confirmDelete: (message) => window.confirm(message),
        request: apiFetch,
        signal: controller.signal,
        onPendingChange: (pending) => {
          if (pending) deleteControllers.current.set(listing._id, controller);
          else if (deleteControllers.current.get(listing._id) === controller) deleteControllers.current.delete(listing._id);
          if (!mounted.current) return;
          setDeletingIds((current) => {
            const next = new Set(current);
            if (pending) next.add(listing._id);
            else next.delete(listing._id);
            return next;
          });
        },
      });

      if (deleted && mounted.current) {
        setListings((current) => current.filter((item) => item._id !== listing._id));
        setFeedback(`“${listing.title || 'Listing'}” was deleted successfully.`);
      }
    } catch (error) {
      if (controller.signal.aborted || !mounted.current) return;
      if (!handleAuthenticationError(error, {
        sessionManager: session,
        navigate,
        returnPath,
      })) {
        setActionError(getDeleteErrorMessage(error));
      }
    } finally {
      if (deleteControllers.current.get(listing._id) === controller) deleteControllers.current.delete(listing._id);
    }
  }

  function renderActions(listing) {
    const deleting = deletingIds.has(listing._id);
    return (
      <div className="seller-listing-actions">
        <Link to={`/listings/${listing._id}/edit`}>Edit</Link>
        <button
          type="button"
          onClick={() => deleteListing(listing)}
          disabled={deleting}
          aria-label={`Delete ${listing.title || 'listing'}`}
        >
          {deleting ? 'Deleting…' : 'Delete'}
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
