import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../api/client.js';
import { handleAuthenticationError } from '../auth/handleAuthenticationError.js';
import { buildReturnPath } from '../auth/returnPath.js';
import { session } from '../auth/session.js';
import ListingForm from '../components/ListingForm.jsx';
import { buildEditListingFormData, prepareListingForEdit } from '../utils/sellerListings.js';
import '../css/listings.css';

export default function EditListing() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const mounted = useRef(false);
  const submitControllers = useRef(new Set());
  const [editState, setEditState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const returnPath = buildReturnPath(location);

  useEffect(() => {
    const controllers = submitControllers.current;
    mounted.current = true;
    return () => {
      mounted.current = false;
      controllers.forEach((controller) => controller.abort());
      controllers.clear();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchListing() {
      setLoading(true);
      setError('');
      setNotFound(false);
      setForbidden(false);
      setEditState(null);

      try {
        const listing = await apiFetch(`/api/listings/${encodeURIComponent(id || '')}`, {
          auth: true,
          signal: controller.signal,
        });
        if (!controller.signal.aborted) setEditState(prepareListingForEdit(listing));
      } catch (requestError) {
        if (controller.signal.aborted) return;
        if (requestError?.status === 403) {
          setForbidden(true);
        } else if (requestError?.status === 404) {
          setNotFound(true);
        } else if (!handleAuthenticationError(requestError, {
          sessionManager: session,
          navigate,
          returnPath,
        })) {
          setError(requestError instanceof Error ? requestError.message : 'Unable to load this listing. Please try again.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    fetchListing();
    return () => controller.abort();
  }, [id, navigate, returnPath]);

  async function updateListing({ values, retainedImages, newFiles }) {
    const controller = new AbortController();
    submitControllers.current.add(controller);
    const body = buildEditListingFormData(values, retainedImages, newFiles);

    try {
      await apiFetch(`/api/listings/${encodeURIComponent(id || '')}`, {
        method: 'PUT',
        body,
        auth: true,
        signal: controller.signal,
      });
      if (mounted.current) {
        navigate(`/listings/${id}`, {
          replace: true,
          state: { message: 'Listing updated successfully' },
        });
      }
    } catch (requestError) {
      if (controller.signal.aborted || !mounted.current) return;
      if (requestError?.status === 403) {
        setForbidden(true);
        return;
      }
      if (requestError?.status === 404) {
        setNotFound(true);
        return;
      }
      if (!handleAuthenticationError(requestError, {
        sessionManager: session,
        navigate,
        returnPath,
      })) {
        throw requestError;
      }
    } finally {
      submitControllers.current.delete(controller);
    }
  }

  if (loading) {
    return <main className="marketplace-page"><div className="marketplace-page__content"><p className="listing-state" role="status">Loading listing editor…</p></div></main>;
  }

  if (forbidden) {
    return <main className="marketplace-page"><div className="marketplace-page__content"><p className="listing-state listing-state--error" role="alert">You do not own this listing</p></div></main>;
  }

  if (notFound) {
    return <main className="marketplace-page"><div className="marketplace-page__content"><p className="listing-state listing-state--error" role="alert">This listing could not be found.</p></div></main>;
  }

  if (error || !editState) {
    return <main className="marketplace-page"><div className="marketplace-page__content"><p className="listing-state listing-state--error" role="alert">{error || 'Unable to load this listing. Please try again.'}</p></div></main>;
  }

  return (
    <main className="marketplace-page">
      <div className="marketplace-page__content listing-form-page">
        <header className="marketplace-page__header">
          <h1>Edit listing</h1>
          <p>Update the details or images for your listing.</p>
        </header>
        <ListingForm
          initialValues={editState.initialValues}
          retainedImages={editState.retainedImages}
          submitLabel="Save changes"
          onSubmit={updateListing}
        />
      </div>
    </main>
  );
}
