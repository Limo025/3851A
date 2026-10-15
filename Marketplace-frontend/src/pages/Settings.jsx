import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client.js';

export default function Settings() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = 'Settings | UON Marketplace';
    apiFetch('/api/users/me', { auth: true })
      .then((data) => { setUser(data); setName(data.username || ''); })
      .catch((error) => setMessage(error.message));
  }, []);

  async function save(event) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const body = new FormData(); body.append('username', name);
      if (avatar) body.append('images', avatar);
      const updated = await apiFetch('/api/users/me', { auth: true, method: 'PATCH', body });
      setUser(updated); setAvatar(null); setMessage('Profile saved.');
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  return <main className="marketplace-page"><div className="marketplace-page__content listing-form-page">
    <h1>Settings</h1>
    {message && <p role="status">{message}</p>}
    {!user ? <p>{message ? '' : 'Loading…'}</p> : <>
      <form onSubmit={save} className="listing-form mt-6">
        <div className="mb-4 flex items-center gap-4 p-2">
          {user.avatarUrl ? <img src={user.avatarUrl} alt={`${user.username}'s avatar`} className="h-24 w-24 rounded-full object-cover" /> : <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-200 text-2xl" aria-label="No profile picture">{(user.username || '?')[0]}</div>}
          <strong className="text-xl text-[#00225e]">{user.username || 'Marketplace user'}</strong>
        </div>
        <label htmlFor="profile-name">Display name</label>
        <input id="profile-name" required maxLength={50} value={name} onChange={(event) => setName(event.target.value)} />
        <label htmlFor="profile-avatar">Profile picture (JPEG, PNG or WebP, up to 5 MB)</label>
        <input id="profile-avatar" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setAvatar(event.target.files?.[0] || null)} />
        <button className="listing-form__submit listing-form__submit--blue" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>
      </form>
    </>}
  </div></main>;
}
