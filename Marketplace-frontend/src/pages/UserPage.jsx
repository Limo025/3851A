import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../api/client.js';

export default function UserPage() {
  const { id } = useParams();
  const own = !id;
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [score, setScore] = useState('5');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { setPage(1); }, [id]);
  useEffect(() => {
    let cancelled = false;
    setUser(null); setMessage('');
    apiFetch(own ? '/api/users/me' : `/api/users/${id}?page=${page}`, { auth: own })
      .then(data => { if (!cancelled) { setUser(data); setName(data.username); } })
      .catch(error => { if (!cancelled) setMessage(error.message); });
    return () => { cancelled = true; };
  }, [id, own, page]);
  async function save(event) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      if (own) {
        const body = new FormData(); body.append('username', name);
        if (avatar) body.append('images', avatar);
        setUser(await apiFetch('/api/users/me', { auth: true, method: 'PATCH', body }));
        setAvatar(null); setMessage('Profile saved.');
      } else {
        await apiFetch(`/api/users/${id}/rating`, { auth: true, method: 'PUT', body: { score: Number(score) } });
        setUser(await apiFetch(`/api/users/${id}?page=${page}`)); setMessage('Rating saved.');
      }
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  return <main className="w-full bg-white text-black">
    <div className="max-w-4xl mx-auto p-6">
    <h1>{own ? 'My profile' : 'Seller profile'}</h1>
    {message && <p role="status">{message}</p>}
    {!user ? <p>{message ? '' : 'Loading…'}</p> : <>
      {user.avatarUrl && <img src={user.avatarUrl} alt={`${user.username}'s avatar`} className="w-24 h-24 rounded-full object-cover" />}
      <h2>{user.username}</h2>
      {own ? <form onSubmit={save} className="flex flex-col gap-3 max-w-sm">
        <label htmlFor="profile-name">Display name</label>
        <input id="profile-name" className="border p-2" required maxLength={50} value={name} onChange={e => setName(e.target.value)} />
        <label htmlFor="profile-avatar">Avatar (JPEG, PNG or WebP, up to 5 MB)</label>
        <input id="profile-avatar" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setAvatar(e.target.files[0] || null)} />
        <button disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>
      </form> : <>
        <p>Rating: {user.rating.average.toFixed(1)} / 5 ({user.rating.count} ratings)</p>
        <form onSubmit={save} className="flex gap-3 items-center">
          <label htmlFor="user-rating">Rate this seller</label>
          <select id="user-rating" value={score} onChange={e => setScore(e.target.value)}>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} stars</option>)}</select>
          <button disabled={busy}>{busy ? 'Saving…' : 'Save rating'}</button>
        </form>
        <p>You must have messaged this seller to rate them.</p>
        <h2>Available listings</h2>
        {!user.listings.length && <p>No available listings.</p>}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{user.listings.map(item => <Link key={item._id} to={`/listings/${item._id}`}>
          {item.images?.[0]?.url && <img className="w-full h-40 object-cover rounded" src={item.images[0].url} alt={item.title} />}
          <h3>{item.title}</h3><p>{new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(item.price)}</p>
        </Link>)}</div>
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
        <span> Page {page} </span>
        <button disabled={page >= user.pages} onClick={() => setPage(page + 1)}>Next</button>
      </>}
    </>}
    </div>
  </main>;
}
