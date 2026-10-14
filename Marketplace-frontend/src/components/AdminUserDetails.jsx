import { Link } from 'react-router-dom';
import '../css/styles/admin-user-details.css';

export default function AdminUserDetails({
  selected,
  listings,
  loadingListings,
  listingPage,
  listingPages,
  banReason,
  pending,
  onBanReasonChange,
  onChangeBan,
  onRemoveListing,
  onListingPageChange,
}) {
  return (
    <section aria-label="Selected user listings">
      {!selected ? <p>Select a user to see their listings.</p> : (
        <>
          <div className="admin-page__detail-header">
            <div><h2>{selected.username || 'Unnamed user'}</h2><p>{selected.email}</p></div>
          </div>

          {selected.isBanned ? (
            <div className="admin-page__ban-reason">
              <h3>Ban reason</h3>
              <p>{selected.banReason || 'No reason was recorded.'}</p>
              <button type="button" disabled={Boolean(pending)} onClick={() => onChangeBan(selected)}>
                {pending === `user:${selected._id}` ? 'Saving...' : 'Unban user'}
              </button>
            </div>
          ) : (
            <form className="admin-page__ban-form" onSubmit={(event) => { event.preventDefault(); onChangeBan(selected); }}>
              <label htmlFor="admin-ban-reason">Reason for ban</label>
              <textarea
                id="admin-ban-reason"
                value={banReason}
                onChange={(event) => onBanReasonChange(event.target.value)}
                maxLength={1000}
                rows={4}
                placeholder="Explain which marketplace rule was violated"
                disabled={Boolean(pending)}
                required
              />
              <div>
                <small>{banReason.length}/1000 characters</small>
                <button type="submit" disabled={Boolean(pending) || !banReason.trim()}>
                  {pending === `user:${selected._id}` ? 'Saving…' : 'Ban user'}
                </button>
              </div>
            </form>
          )}

          {loadingListings ? <p>Loading listings…</p> : listings.length === 0 ? <p>No listings on this page.</p> : (
            <ul className="admin-page__list">
              {listings.map((listing) => (
                <li className="admin-page__listing" key={listing._id}>
                  {listing.images?.[0]?.url && <img src={listing.images[0].url} alt="" />}
                  <div>
                    <Link to={`/listings/${listing._id}`}>{listing.title}</Link>
                    <small>${Number(listing.price).toFixed(2)} · {listing.soldAt ? 'Sold' : 'Available'}</small>
                  </div>
                  <button type="button" disabled={Boolean(pending)} onClick={() => onRemoveListing(listing)}>
                    {pending === `listing:${listing._id}` ? 'Deleting…' : 'Delete'}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="admin-page__pagination">
            <button disabled={listingPage === 1 || loadingListings} onClick={() => onListingPageChange(listingPage - 1)}>Previous</button>
            <span>Page {listingPage} of {listingPages}</span>
            <button disabled={listingPage >= listingPages || loadingListings} onClick={() => onListingPageChange(listingPage + 1)}>Next</button>
          </div>
        </>
      )}
    </section>
  );
}
