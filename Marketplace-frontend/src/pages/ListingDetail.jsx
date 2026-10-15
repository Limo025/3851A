import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../api/client.js';
import { handleAuthenticationError } from '../auth/handleAuthenticationError.js';
import { session } from '../auth/session.js';
import { useChatStore } from '../store/useChatStore.js';
import { formatListingDate, formatListingPrice } from '../utils/listingFormat.js';
import { saveToWatchlist } from '../utils/watchlist.js';
import { LISTING_REPORT_REASONS, submitListingReport } from '../utils/reports.js';
import '../css/listings.css';

function displayValue(value, fallback = 'Not specified') {
  return value || fallback;
}

export default function ListingDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const startConversationDraft = useChatStore((state) => state.startConversationDraft);
  const [listing, setListing] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [watchlistSaving, setWatchlistSaving] = useState(false);
  const [watchlistFeedback, setWatchlistFeedback] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState(LISTING_REPORT_REASONS[0]);
  const [reportDescription, setReportDescription] = useState('');
  const [reporting, setReporting] = useState(false);
  const feedback = location.state?.message ? <p className="listing-detail__feedback" role="status">{location.state.message}</p> : null;

  useEffect(() => { document.title = 'Listing Detail | UON Marketplace'; }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchListing() {
      setLoading(true);
      setError('');
      setNotFound(false);
      setListing(null);
      setSelectedImage(null);

      try {
        const data = await apiFetch(`/api/listings/${encodeURIComponent(id || '')}`, {
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          const images = Array.isArray(data.images) ? data.images.filter((image) => image?.url) : [];
          setListing({ ...data, images });
          setSelectedImage(images[0] || null);
        }
      } catch (requestError) {
        if (!controller.signal.aborted) {
          if (requestError?.status === 404) {
            setNotFound(true);
          } else {
            setError(requestError instanceof Error ? requestError.message : 'Unable to load this listing. Please try again.');
          }
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchListing();
    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    if (!listing?._id) return;
    apiFetch('/api/recently-viewed', {
      auth: true,
      method: 'POST',
      body: { listingId: listing._id },
    }).catch(() => {
    });
  }, [listing?._id]);

  if (loading) {
    return <main className="marketplace-page"><div className="marketplace-page__content">{feedback}<p className="listing-state" role="status">Loading listing…</p></div></main>;
  }

  if (notFound) {
    return <main className="marketplace-page"><div className="marketplace-page__content">{feedback}<p className="listing-state listing-state--error" role="alert">This listing could not be found.</p></div></main>;
  }

  if (error) {
    return <main className="marketplace-page"><div className="marketplace-page__content">{feedback}<p className="listing-state listing-state--error" role="alert">{error}</p></div></main>;
  }

  if (!listing) {
    return <main className="marketplace-page"><div className="marketplace-page__content">{feedback}<p className="listing-state listing-state--error" role="alert">Unable to load this listing. Please try again.</p></div></main>;
  }

  const title = displayValue(listing.title, 'Listing');
  const images = listing.images || [];
  const isOwnListing = session.getUser()?.uid === listing.seller?.uid;

  function handleContactSeller() {
    if (!session.hasSession()) {
      navigate('/login', {
        state: {
          from: `${location.pathname}${location.search}${location.hash}`,
          message: 'Please log in to contact the seller.',
        },
      });
      return;
    }

    if (!listing.seller?.uid) {
      setError('Seller contact information is unavailable.');
      return;
    }

    startConversationDraft({
      _id: `draft:${listing._id}`,
      isDraft: true,
      buyer: session.getUser()?.uid,
      seller: listing.seller.uid,
      sellerDetails: listing.seller,
      listing: {
        _id: listing._id,
        title: listing.title,
        price: listing.price,
        images: listing.images,
      },
    });
    navigate('/messages');
  }

  async function handleAddToWatchlist() {
    if (!session.hasSession()) {
      navigate('/login', {
        state: {
          from: `${location.pathname}${location.search}${location.hash}`,
          message: 'Please log in to use your watchlist.',
        },
      });
      return;
    }

    setWatchlistSaving(true);
    setWatchlistFeedback('');
    try {
      await saveToWatchlist(listing._id);
      setWatchlistFeedback('Added to your watchlist.');
    } catch (requestError) {
      if (!handleAuthenticationError(requestError, {
        sessionManager: session,
        navigate,
        returnPath: `${location.pathname}${location.search}${location.hash}`,
      })) {
        setWatchlistFeedback(requestError instanceof Error ? requestError.message : 'Unable to add this listing.');
      }
    } finally {
      setWatchlistSaving(false);
    }
  }

  function openReport() {
    if (!session.hasSession()) {
      navigate('/login', { state: { from: `${location.pathname}${location.search}${location.hash}`, message: 'Please log in to report a listing.' } });
      return;
    }
    setShowReport((open) => !open);
  }

  async function handleReport(event) {
    event.preventDefault(); setReporting(true); setWatchlistFeedback('');
    try {
      await submitListingReport({ listingId: listing._id, reason: reportReason, description: reportDescription });
      setWatchlistFeedback('Report submitted.'); setReportDescription(''); setShowReport(false);
    } catch (requestError) { setWatchlistFeedback(requestError.message); }
    finally { setReporting(false); }
  }

  return (
    <main className="marketplace-page">
      <div className="marketplace-page__content listing-detail">
        {feedback}
        <div className="listing-detail__gallery">
          {selectedImage ? (
            <img className="listing-detail__main-image" src={selectedImage.url} alt={`${title} — image ${images.indexOf(selectedImage) + 1}`} title={title} />
          ) : (
            <div className="listing-detail__main-image listing-card__image--empty" role="img" aria-label={`No image available for ${title}`}>
              No image available
            </div>
          )}
          {images.length > 1 ? (
            <div className="listing-detail__thumbnails" aria-label="Listing images">
              {images.map((image, index) => (
                <button
                  className={`listing-detail__thumbnail${selectedImage === image ? ' listing-detail__thumbnail--selected' : ''}`}
                  type="button"
                  key={image.publicId || image.url}
                  onClick={() => setSelectedImage(image)}
                  aria-label={`View image ${index + 1}`}
                  aria-pressed={selectedImage === image}
                >
                  <img src={image.url} alt="" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="listing-detail__content">
          <p className="listing-card__category">{displayValue(listing.category)}</p>
          <h1>{title}</h1>
          <p className="listing-detail__price">{formatListingPrice(listing.price)}</p>
          <p className="listing-detail__description">{displayValue(listing.description, 'No description provided.')}</p>
          <dl className="listing-detail__details">
            <div><dt>Condition</dt><dd>{displayValue(listing.condition)}</dd></div>
            <div><dt>Seller</dt><dd>{listing.seller?._id ? <Link to={`/users/${listing.seller._id}`}>{displayValue(listing.seller.username, 'Unknown seller')}</Link> : 'Unknown seller'}</dd></div>
            <div><dt>Listed</dt><dd>{formatListingDate(listing.createdAt)}</dd></div>
          </dl>
          {watchlistFeedback ? <p className="listing-detail__watchlist-feedback" role="status">{watchlistFeedback}</p> : null}
          <div className="listing-detail__actions">
            <button className="listing-detail__contact" type="button" disabled={isOwnListing || Boolean(listing.soldAt)} onClick={handleContactSeller}>
              {listing.soldAt ? 'Listing sold' : isOwnListing ? 'This is your listing' : 'Contact Seller'}
            </button>
            <button
              className="listing-detail__contact"
              type="button"
              disabled={isOwnListing || Boolean(listing.soldAt) || watchlistSaving}
              onClick={handleAddToWatchlist}
            >
              {listing.soldAt ? 'Listing sold' : watchlistSaving ? 'Adding…' : 'Add to Watchlist'}
            </button>
            {!isOwnListing && <button className="listing-detail__contact" type="button" onClick={openReport}>Report listing</button>}
          </div>
          {showReport && <form className="listing-form listing-report-form" onSubmit={handleReport}>
            <label htmlFor="listing-report-reason">Reason</label><select id="listing-report-reason" value={reportReason} onChange={(event) => setReportReason(event.target.value)}>{LISTING_REPORT_REASONS.map((reason) => <option key={reason}>{reason}</option>)}</select>
            <label htmlFor="listing-report-description">Details</label><textarea id="listing-report-description" required minLength={10} maxLength={1000} value={reportDescription} onChange={(event) => setReportDescription(event.target.value)} />
            <button className="listing-form__submit" disabled={reporting}>{reporting ? 'Submitting…' : 'Submit report'}</button>
          </form>}
        </div>
      </div>
    </main>
  );
}
