import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../api/client.js';

export default function UserPage() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [score, setScore] = useState('5');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { setPage(1); }, [id]);
  useEffect(() => {
    let active = true; setUser(null); setMessage('');
    apiFetch(`/api/users/${id}?page=${page}`).then((data) => { if (active) setUser(data); }).catch((error) => { if (active) setMessage(error.message); });
    return () => { active = false; };
  }, [id, page]);
  async function save(event) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      await apiFetch(`/api/users/${id}/rating`, { auth: true, method: 'PUT', body: { score: Number(score) } });
      setUser(await apiFetch(`/api/users/${id}?page=${page}`)); setMessage('Rating saved.');
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  return <main className="w-full bg-white text-black"><div className="mx-auto max-w-4xl p-6">
    <h1>Seller profile</h1>{message && <p role="status">{message}</p>}
    {!user ? <p>{message ? '' : 'Loading…'}</p> : <>
      {user.avatarUrl ? <img src={user.avatarUrl} alt={`${user.username}'s avatar`} className="h-24 w-24 rounded-full object-cover" /> : null}
      <h2>{user.username}</h2><p>Rating: {user.rating.average.toFixed(1)} / 5 ({user.rating.count} ratings)</p>
      <form onSubmit={save} className="flex items-center gap-3"><label htmlFor="user-rating">Rate this seller</label><select id="user-rating" value={score} onChange={(event) => setScore(event.target.value)}>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value} stars</option>)}</select><button disabled={busy}>{busy ? 'Saving…' : 'Save rating'}</button></form>
      <p>You must have messaged this seller to rate them.</p><h2>Available listings</h2>
      {!user.listings.length && <p>No available listings.</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">{user.listings.map((item) => <Link key={item._id} to={`/listings/${item._id}`}>{item.images?.[0]?.url && <img className="h-40 w-full rounded object-cover" src={item.images[0].url} alt={item.title} />}<h3>{item.title}</h3><p>{new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(item.price)}</p></Link>)}</div>
      <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span> Page {page} </span><button disabled={page >= user.pages} onClick={() => setPage(page + 1)}>Next</button>
    </>}
  </div></main>;
}
