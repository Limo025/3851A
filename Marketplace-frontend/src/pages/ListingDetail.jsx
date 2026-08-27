import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { apiFetch } from '../api/client.js';
import { formatListingDate, formatListingPrice } from '../utils/listingFormat.js';
import '../css/listings.css';

function displayValue(value, fallback = 'Not specified') {
  return value || fallback;
}

export default function ListingDetail() {
  const { id } = useParams();
  const location = useLocation();
  const [listing, setListing] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const feedback = location.state?.message ? <p className="listing-detail__feedback" role="status">{location.state.message}</p> : null;

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
            <div><dt>Seller</dt><dd>{displayValue(listing.seller?.username, 'Unknown seller')}</dd></div>
            <div><dt>Listed</dt><dd>{formatListingDate(listing.createdAt)}</dd></div>
          </dl>
          <button className="listing-detail__contact" type="button" disabled>Contact Seller — messaging coming later</button>
        </div>
      </div>
    </main>
  );
}
