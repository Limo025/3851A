import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatListingPrice } from '../utils/listingFormat.js';
import { loadTransactionHistory } from '../utils/transactionHistory.js';
import '../css/listings.css';

export default function TransactionHistory() {
  const [role, setRole] = useState('buyer');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { document.title = 'Transaction History | UON Marketplace'; }, []);
  useEffect(() => {
    let active = true;
    loadTransactionHistory(role, page).then((data) => { if (active) { setItems(data.transactions); setPages(data.pages); } })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [role, page]);
  function changeRole(nextRole) { setLoading(true); setError(''); setPage(1); setRole(nextRole); }
  return <main className="marketplace-page"><div className="marketplace-page__content">
    <header className="marketplace-page__header"><h1>Transaction history</h1></header>
    <div className="transaction-history__tabs" role="tablist">
      <button type="button" aria-selected={role === 'buyer'} onClick={() => changeRole('buyer')}>Purchased</button>
      <button type="button" aria-selected={role === 'seller'} onClick={() => changeRole('seller')}>Sold</button>
    </div>
    {loading && <p className="listing-state">Loading transactions…</p>}
    {error && <p className="listing-state listing-state--error" role="alert">{error}</p>}
    {!loading && !error && !items.length && <p className="listing-state">No confirmed {role === 'buyer' ? 'purchases' : 'sales'} yet.</p>}
    {!loading && !error && <ul className="purchase-history">{items.map((conversation) => {
      const snapshot = conversation.transactionSnapshot || {};
      const other = role === 'buyer' ? conversation.sellerDetails : conversation.buyerDetails;
      return <li key={conversation._id}><div className="purchase-history__item">
        {snapshot.imageUrl ? <img src={snapshot.imageUrl} alt={snapshot.title} /> : <span className="purchase-history__image-empty">No image</span>}
        <span className="purchase-history__details"><strong>{snapshot.title || 'Deleted listing'}</strong><span>{formatListingPrice(snapshot.price)}</span><span>{role === 'buyer' ? 'Seller' : 'Buyer'}: {other?.username || 'Marketplace user'}</span><time>{new Date(conversation.transactionConfirmedAt).toLocaleDateString('en-AU')}</time>{snapshot.listingId && <Link to={`/listings/${snapshot.listingId}`}>View listing</Link>}</span>
      </div></li>;
    })}</ul>}
    {!loading && !error && pages > 1 && <div className="listing-pagination"><button disabled={page <= 1} onClick={() => { setLoading(true); setPage(page - 1); }}>Previous</button><span>Page {page} of {pages}</span><button disabled={page >= pages} onClick={() => { setLoading(true); setPage(page + 1); }}>Next</button></div>}
  </div></main>;
}
