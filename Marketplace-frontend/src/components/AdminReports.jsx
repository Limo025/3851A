import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadAdminReports, reviewAdminReport } from '../utils/adminReports.js';
import { apiFetch } from '../api/client.js';
import '../css/styles/admin-reports.css';

export default function AdminReports({ pending, setPending, setError, setNotice, report }) {
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ reports: [], pages: 1 });
  const [refresh, setRefresh] = useState(0);
  const load = useCallback(() => loadAdminReports({ status, page }), [status, page]);
  useEffect(() => {
    let active = true;
    load().then((result) => { if (active) { setData(result); setError(''); } }).catch((error) => { if (active) report(error); });
    return () => { active = false; };
  }, [load, refresh, report, setError]);

  async function review(item, nextStatus) {
    setPending(`report:${item._id}`); setError(''); setNotice('');
    try { await reviewAdminReport({ id: item._id, status: nextStatus }); setNotice(`Report ${nextStatus}.`); setRefresh((value) => value + 1); }
    catch (error) { report(error); }
    finally { setPending(''); }
  }

  async function banReportedUser(item) {
    const reason = window.prompt(`Ban ${item.targetLabel}: enter a reason`);
    if (reason === null) return;
    if (!reason.trim()) { setError('A ban reason is required.'); return; }
    setPending(`report:${item._id}`); setError(''); setNotice('');
    try {
      await apiFetch(`/api/admin/users/${item.targetUser._id}/ban`, { auth: true, method: 'PATCH', body: { banned: true, reason: reason.trim() } });
      await reviewAdminReport({ id: item._id, status: 'resolved' });
      setNotice('User banned and report resolved.'); setRefresh((value) => value + 1);
    } catch (error) { report(error); }
    finally { setPending(''); }
  }

  async function deleteReportedListing(item) {
    if (!window.confirm(`Permanently delete “${item.targetLabel}”?`)) return;
    setPending(`report:${item._id}`); setError(''); setNotice('');
    try {
      await apiFetch(`/api/admin/listings/${item.targetListing._id}`, { auth: true, method: 'DELETE' });
      await reviewAdminReport({ id: item._id, status: 'resolved' });
      setNotice('Listing deleted and report resolved.'); setRefresh((value) => value + 1);
    } catch (error) { report(error); }
    finally { setPending(''); }
  }

  return <section className="admin-reports">
    <div className="admin-reports__filters"><label>Status <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="pending">Pending</option><option value="resolved">Resolved</option><option value="dismissed">Dismissed</option></select></label></div>
    {!data.reports?.length ? <p>No {status} reports.</p> : <ul>{data.reports.map((item) => <li key={item._id}>
      <h2>{item.targetLabel}</h2><p><strong>{item.targetType}</strong> · {item.reason}</p><p>{item.description}</p><time>{new Date(item.createdAt).toLocaleString('en-AU')}</time>
      <div>{item.targetUser?._id && <Link to={`/users/${item.targetUser._id}`}>View user</Link>}{item.targetListing?._id && <Link to={`/listings/${item.targetListing._id}`}>View listing</Link>}</div>
      {item.status === 'pending' && <div className="admin-reports__actions">
        {item.targetUser?._id && !item.targetUser.isBanned && <button disabled={pending === `report:${item._id}`} onClick={() => banReportedUser(item)}>Ban user</button>}
        {item.targetListing?._id && <button disabled={pending === `report:${item._id}`} onClick={() => deleteReportedListing(item)}>Delete listing</button>}
        <button disabled={pending === `report:${item._id}`} onClick={() => review(item, 'resolved')}>Resolve</button><button disabled={pending === `report:${item._id}`} onClick={() => review(item, 'dismissed')}>Dismiss</button>
      </div>}
    </li>)}</ul>}
    <div><button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span> Page {page} of {data.pages || 1} </span><button disabled={page >= (data.pages || 1)} onClick={() => setPage(page + 1)}>Next</button></div>
  </section>;
}
