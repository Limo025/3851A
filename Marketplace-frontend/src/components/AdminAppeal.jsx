import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client.js';
import '../css/styles/admin-appeal.css';

export default function AdminAppeal({ pending, setPending, setError, setNotice, report, onReviewed }) {
  const [appeals, setAppeals] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    apiFetch(`/api/admin/appeals?page=${page}`, { auth: true, signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        setAppeals(data.appeals);
        setPages(data.pages);
      })
      .catch((requestError) => { if (!controller.signal.aborted) report(requestError); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, refresh, report]);

  async function reviewAppeal(user, status) {
    const action = status === 'approved' ? 'Approve appeal and unban' : 'Reject appeal from';
    if (!window.confirm(`${action} ${user.username || user.email}?`)) return;

    setPending(`appeal:${user._id}`);
    setError('');
    setNotice('');
    try {
      const result = await apiFetch(`/api/admin/appeals/${user._id}`, {
        auth: true,
        method: 'PATCH',
        body: { status },
      });
      setNotice(result.message);
      setPage(1);
      setRefresh((value) => value + 1);
      onReviewed();
    } catch (requestError) {
      report(requestError);
      setRefresh((value) => value + 1);
    } finally {
      setPending('');
    }
  }

  return (
    <section className="admin-page__appeals" aria-label="Ban appeals">
      <div className="admin-page__section-header">
        <h2>Ban appeals</h2>
        <button type="button" disabled={loading || Boolean(pending)} onClick={() => setRefresh((value) => value + 1)}>Refresh appeals</button>
      </div>
      {loading ? <p>Loading appeals...</p> : !appeals.length ? <p>No pending appeals.</p> : (
        <ul className="admin-page__list">
          {appeals.map((user) => (
            <li className="admin-page__appeal" key={user._id}>
              <strong>{user.username || 'Unnamed user'}</strong>
              <p>{user.email} . {new Date(user.appeal.submittedAt).toLocaleString()}</p>
              <p>{user.appeal.reason}</p>
              <div>
                <button type="button" disabled={Boolean(pending)} onClick={() => reviewAppeal(user, 'approved')}>Approve &amp; unban</button>
                <button className='reject' type="button" disabled={Boolean(pending)} onClick={() => reviewAppeal(user, 'rejected')}>Reject</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="admin-page__pagination">
        <button disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Previous</button>
        <span>Page {page} of {pages}</span>
        <button disabled={page >= pages || loading} onClick={() => setPage((value) => value + 1)}>Next</button>
      </div>
    </section>
  );
}