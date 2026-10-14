import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client.js';
import AdminUserDetails from './AdminUserDetails.jsx';
import AdminUserList from './AdminUserList.jsx';
import '../css/styles/admin-default.css';

export default function AdminDefault({ pending, setPending, setError, setNotice, report, refreshKey }) {
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
  const [banReason, setBanReason] = useState('');
  const selectedId = selected?._id;

  useEffect(() => {
    const controller = new AbortController();
    setLoadingUsers(true);
    apiFetch(`/api/admin/users?page=${page}&search=${encodeURIComponent(search)}`, { auth: true, signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        setUsers(data.users);
        setPages(data.pages);
        setSelected((current) => {
          if (!current) return null;
          return data.users.find((user) => user._id === current._id) ?? current;
        });
        setError('');
      })
      .catch((requestError) => { if (!controller.signal.aborted) report(requestError); })
      .finally(() => { if (!controller.signal.aborted) setLoadingUsers(false); });
    return () => controller.abort();
  }, [page, search, refreshKey, report, setError]);

  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    setLoadingListings(true);
    apiFetch(`/api/admin/users/${selectedId}/listings?page=${listingPage}&limit=10`, { auth: true, signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        setListings(data.listings);
        setListingPages(data.pages);
        setError('');
      })
      .catch((requestError) => { if (!controller.signal.aborted) report(requestError); })
      .finally(() => { if (!controller.signal.aborted) setLoadingListings(false); });
    return () => controller.abort();
  }, [selectedId, listingPage, report, setError]);

  function submitSearch(event) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function selectUser(user) {
    setSelected(user);
    setBanReason(user.banReason || '');
    setListingPage(1);
    setListings([]);
    setNotice('');
  }

  async function changeBan(user) {
    const banned = !user.isBanned;
    const reason = banReason.trim();
    if (banned && !reason) {
      setError('Enter a reason before banning this user.');
      return;
    }
    if (!window.confirm(`${banned ? 'Ban' : 'Unban'} ${user.username || user.email}?`)) return;

    setPending(`user:${user._id}`);
    setError('');
    setNotice('');
    try {
      const result = await apiFetch(`/api/admin/users/${user._id}/ban`, {
        auth: true,
        method: 'PATCH',
        body: { banned, reason: banned ? reason : '' },
      });
      const updateUser = (item) => item._id === user._id
        ? { ...item, isBanned: result.isBanned, banReason: result.banReason }
        : item;
      setUsers((current) => current.map(updateUser));
      setSelected((current) => current ? updateUser(current) : current);
      setBanReason(result.banReason || '');
      setNotice(result.message);
    } catch (requestError) {
      report(requestError);
    } finally {
      setPending('');
    }
  }

  async function removeListing(listing) {
    if (!window.confirm(`Permanently delete "${listing.title}"?`)) return;

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
    <div className="admin-page__columns">
      <AdminUserList
        users={users}
        selectedId={selectedId}
        loading={loadingUsers}
        page={page}
        pages={pages}
        search={search}
        searchInput={searchInput}
        onSearchInput={setSearchInput}
        onSearch={submitSearch}
        onSelect={selectUser}
        onPageChange={setPage}
      />
      <AdminUserDetails
        selected={selected}
        listings={listings}
        loadingListings={loadingListings}
        listingPage={listingPage}
        listingPages={listingPages}
        banReason={banReason}
        pending={pending}
        onBanReasonChange={setBanReason}
        onChangeBan={changeBan}
        onRemoveListing={removeListing}
        onListingPageChange={setListingPage}
      />
    </div>
  );
}
