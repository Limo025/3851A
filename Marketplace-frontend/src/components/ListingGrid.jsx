import ListingCard from './ListingCard.jsx';

export default function ListingGrid({
  listings,
  loading,
  error,
  emptyMessage,
  renderActions = null,
}) {
  if (loading) {
    return <p className="listing-state" role="status" aria-live="polite">Loading listings…</p>;
  }

  if (error) {
    return <p className="listing-state listing-state--error" role="alert">{error}</p>;
  }

  if (!listings.length) {
    return <p className="listing-state" role="status">{emptyMessage}</p>;
  }

  return (
    <div className="listing-grid" role="list" aria-label="Marketplace listings">
      {listings.map((listing) => (
        <ListingCard
          key={listing._id}
          listing={listing}
          actions={renderActions ? renderActions(listing) : null}
        />
      ))}
    </div>
  );
}
