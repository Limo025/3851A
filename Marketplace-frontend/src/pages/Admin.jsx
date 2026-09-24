import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client.js';
import { handleAuthenticationError } from '../auth/handleAuthenticationError.js';
import { session } from '../auth/session.js';
import './Admin.css';

export default function Admin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [pages, setPages] = useState(1);
  const [selected, setSelected] = useState(null);
  const [listingPage, setListingPage] = useState(1);
  const [listings, setListings] = useState([]);
  const [listingPages, setListingPages] = useState(1);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingListings, setLoadingListings] = useState(false);
  const [pending, setPending] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const selectedId = selected?._id;
  const report = useCallback((errorValue) => {
    if (!handleAuthenticationError(errorValue, { sessionManager: session, navigate, returnPath: location.pathname })) {
      setError(errorValue.message || 'The request failed. Please try again.');
    }
  }, [navigate, location.pathname]);

  useEffect(() => {
    const controller = new AbortController();
    setLoadingUsers(true);
    apiFetch(`/api/admin/users?page=${page}&search=${encodeURIComponent(search)}`, { auth: true, signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        setUsers(data.users);
        setPages(data.pages);
        setError('');
      })
      .catch((requestError) => { if (!controller.signal.aborted) report(requestError); })
      .finally(() => { if (!controller.signal.aborted) setLoadingUsers(false); });
    return () => controller.abort();
  }, [page, search, report]);

  function submitSearch(event) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    setLoadingListings(true);
    apiFetch(`/api/admin/users/${selectedId}/listings?page=${listingPage}`, { auth: true, signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        setListings(data.listings);
        setListingPages(data.pages);
        setError('');
      })
      .catch((requestError) => { if (!controller.signal.aborted) report(requestError); })
      .finally(() => { if (!controller.signal.aborted) setLoadingListings(false); });
    return () => controller.abort();
  }, [selectedId, listingPage, report]);

  async function changeBan(user) {
    const banned = !user.isBanned;
    if (!window.confirm(`${banned ? 'Ban' : 'Unban'} ${user.username || user.email}?`)) return;
    setPending(`user:${user._id}`);
    setError('');
    setNotice('');
    try {
      const result = await apiFetch(`/api/admin/users/${user._id}/ban`, {
        auth: true, method: 'PATCH', body: { banned },
      });
      setUsers((current) => current.map((item) => item._id === user._id ? { ...item, isBanned: result.isBanned } : item));
      setSelected((current) => current?._id === user._id ? { ...current, isBanned: result.isBanned } : current);
      setNotice(result.message);
    } catch (requestError) {
      report(requestError);
    } finally {
      setPending('');
    }
  }

  async function removeListing(listing) {
    if (!window.confirm(`Permanently delete “${listing.title}”?`)) return;
    setPending(`listing:${listing._id}`);
    setError('');
    setNotice('');
    try {
      await apiFetch(`/api/admin/listings/${listing._id}`, { auth: true, method: 'DELETE' });
      setListings((current) => current.filter((item) => item._id !== listing._id));
      setNotice(`“${listing.title}” was deleted.`);
    } catch (requestError) {
      report(requestError);
    } finally {
      setPending('');
    }
  }

  return (
    <main className="admin-page">
      <div className="admin-page__inner">
        <h1>Admin</h1>
        <p>Manage users and their listings.</p>
        {error && <p role="alert" className="admin-page__error">{error}</p>}
        {notice && <p role="status" className="admin-page__notice">{notice}</p>}
        <div className="admin-page__columns">
          <section aria-label="Users">
            <h2>Users</h2>
            <form className="admin-page__search" role="search" onSubmit={submitSearch}>
              <input
                type="search"
                aria-label="Search users by name or email"
                placeholder="Search name or email"
                maxLength={100}
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
              <button type="submit">Search</button>
            </form>
            {loadingUsers ? <p>Loading users…</p> : users.length === 0 ? <p>{search ? 'No users match your search.' : 'No users found.'}</p> : (
              <ul className="admin-page__list">
                {users.map((user) => <li key={user._id}>
                  <button type="button" className={selected?._id === user._id ? 'admin-page__selected' : ''} onClick={() => { setSelected(user); setListingPage(1); setListings([]); setNotice(''); }}>
                    <strong>{user.username || 'Unnamed user'}</strong>
                    <span>{user.email}</span>
                    <small>{user.isBanned ? 'Banned' : 'Active'} · Joined {new Date(user.createdAt).toLocaleDateString()}</small>
                  </button>
                </li>)}
              </ul>
            )}
            <div className="admin-page__pagination">
              <button disabled={page === 1 || loadingUsers} onClick={() => setPage(page - 1)}>Previous</button>
              <span>Page {page} of {pages}</span>
              <button disabled={page >= pages || loadingUsers} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          </section>
          <section aria-label="Selected user listings">
            {!selected ? <p>Select a user to see their listings.</p> : <>
              <div className="admin-page__detail-header">
                <div><h2>{selected.username || 'Unnamed user'}</h2><p>{selected.email}</p></div>
                <button type="button" disabled={Boolean(pending)} onClick={() => changeBan(selected)}>{pending === `user:${selected._id}` ? 'Saving…' : selected.isBanned ? 'Unban user' : 'Ban user'}</button>
              </div>
              {loadingListings ? <p>Loading listings…</p> : listings.length === 0 ? <p>No listings on this page.</p> : (
                <ul className="admin-page__list">
                  {listings.map((listing) => <li className="admin-page__listing" key={listing._id}>
                    {listing.images?.[0]?.url && <img src={listing.images[0].url} alt="" />}
                    <div><Link to={`/listings/${listing._id}`}>{listing.title}</Link><small>${Number(listing.price).toFixed(2)} · {listing.soldAt ? 'Sold' : 'Available'}</small></div>
                    <button type="button" disabled={Boolean(pending)} onClick={() => removeListing(listing)}>{pending === `listing:${listing._id}` ? 'Deleting…' : 'Delete'}</button>
                  </li>)}
                </ul>
              )}
              <div className="admin-page__pagination">
                <button disabled={listingPage === 1 || loadingListings} onClick={() => setListingPage(listingPage - 1)}>Previous</button>
                <span>Page {listingPage} of {listingPages}</span>
                <button disabled={listingPage >= listingPages || loadingListings} onClick={() => setListingPage(listingPage + 1)}>Next</button>
              </div>
            </>}
          </section>
        </div>
      </div>
    </main>
  );
}
