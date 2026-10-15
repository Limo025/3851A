export function filterMyListings(listings, filters = {}) {
  const search = String(filters.search || '').trim().toLowerCase();
  return (Array.isArray(listings) ? listings : []).filter((listing) => (
    (!search || String(listing?.title || '').toLowerCase().includes(search))
    && (!filters.availability || filters.availability === 'all'
      || (filters.availability === 'sold' ? Boolean(listing?.soldAt) : !listing?.soldAt))
    && (!filters.category || listing?.category === filters.category)
    && (!filters.condition || listing?.condition === filters.condition)
  ));
}
