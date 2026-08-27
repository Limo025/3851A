import { Link } from 'react-router-dom';

const currencyFormatter = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
});

export default function ListingCard({ listing, actions = null }) {
  const image = listing.images?.[0];
  const price = Number(listing.price);
  const formattedPrice = Number.isFinite(price) ? currencyFormatter.format(price) : 'Price unavailable';

  return (
    <article className="listing-card" role="listitem">
      {image?.url ? (
        <img className="listing-card__image" src={image.url} alt={listing.title} loading="lazy" />
      ) : (
        <div className="listing-card__image listing-card__image--empty" role="img" aria-label={`No image available for ${listing.title}`}>
          No image available
        </div>
      )}
      <div className="listing-card__body">
        <p className="listing-card__category">{listing.category}</p>
        <h2 className="listing-card__title">
          <Link to={`/listings/${listing._id}`}>{listing.title}</Link>
        </h2>
        <p className="listing-card__price">{formattedPrice}</p>
        <dl className="listing-card__details">
          <div>
            <dt>Condition</dt>
            <dd>{listing.condition}</dd>
          </div>
          <div>
            <dt>Seller</dt>
            <dd>{listing.seller?.username || 'Unknown seller'}</dd>
          </div>
        </dl>
        {actions ? <div className="listing-card__actions">{actions}</div> : null}
      </div>
    </article>
  );
}
