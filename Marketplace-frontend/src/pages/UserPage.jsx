import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../api/client.js';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar.jsx';
import { getSellerProfileRequest } from '../utils/userProfile.js';
import '../css/listings.css';
import '../css/user-profile.css';

const currencyFormatter = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' });

function initials(name) {
  return (name || 'User').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

export default function UserPage() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [score, setScore] = useState('5');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setPage(1); }, [id]);
  useEffect(() => {
    document.title = 'Seller Profile | UON Marketplace';
  }, []);

  useEffect(() => {
    let cancelled = false;
    setUser(null);
    setMessage('');
    setIsError(false);
    apiFetch(getSellerProfileRequest(id, page))
      .then((data) => {
        if (!cancelled) {
          setUser(data);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setMessage(error.message);
          setIsError(true);
        }
      });
    return () => { cancelled = true; };
  }, [id, page]);

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    setIsError(false);
    try {
      await apiFetch(`/api/users/${id}/rating`, { auth: true, method: 'PUT', body: { score: Number(score) } });
      setUser(await apiFetch(getSellerProfileRequest(id, page)));
      setMessage('Rating saved.');
    } catch (error) {
      setMessage(error.message);
      setIsError(true);
    } finally {
      setBusy(false);
    }
  }

  if (!user) {
    return (
      <main className="marketplace-page">
        <div className="marketplace-page__content listing-form-page">
          <p className={isError ? 'listing-state listing-state--error' : 'listing-state'} role={isError ? 'alert' : 'status'}>
            {message || 'Loading profile…'}
          </p>
        </div>
      </main>
    );
  }

  const rating = user.rating || { average: 0, count: 0 };
  const listings = user.listings || [];

  return (
    <main className="marketplace-page">
      <div className="marketplace-page__content">
        <header className="marketplace-page__header">
          <div>
            <h1>{user.username}</h1>
            <p>Seller profile and available listings.</p>
          </div>
        </header>

        <div className="profile-card">
          <section className="profile-summary" aria-label="Profile summary">
            <Avatar className="profile-summary__avatar">
              {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
              <AvatarFallback>{initials(user.username)}</AvatarFallback>
            </Avatar>
            <div>
              <h2>{user.username}</h2>
              <p className="profile-summary__rating">
                <Star aria-hidden="true" fill="currentColor" />
                {rating.average.toFixed(1)} / 5 ({rating.count} {rating.count === 1 ? 'rating' : 'ratings'})
              </p>
            </div>
          </section>

          {message ? <p className={isError ? 'listing-form__submit-error' : 'profile-feedback'} role={isError ? 'alert' : 'status'}>{message}</p> : null}

          <form className="listing-form profile-rating-form" onSubmit={save}>
            <label htmlFor="user-rating">Rate this seller</label>
            <select id="user-rating" value={score} onChange={(event) => setScore(event.target.value)}>
              {[5, 4, 3, 2, 1].map((number) => <option key={number} value={number}>{number} {number === 1 ? 'star' : 'stars'}</option>)}
            </select>
            <p className="profile-form__hint">You must have messaged this seller before you can rate them.</p>
            <button className="listing-form__submit" disabled={busy}>{busy ? 'Saving…' : 'Save rating'}</button>
          </form>
        </div>

        <section className="profile-listings" aria-labelledby="profile-listings-heading">
          <div className="profile-listings__header">
            <h2 id="profile-listings-heading">Available listings</h2>
            <span>{user.total} {user.total === 1 ? 'item' : 'items'}</span>
          </div>
          {listings.length === 0 ? <p className="listing-state">No available listings.</p> : (
            <div className="listing-grid" role="list">
              {listings.map((item) => (
                <article className="listing-card" role="listitem" key={item._id}>
                  {item.images?.[0]?.url ? <img className="listing-card__image" src={item.images[0].url} alt={item.title} loading="lazy" /> : <div className="listing-card__image listing-card__image--empty">No image available</div>}
                  <div className="listing-card__body">
                    {item.condition ? <p className="listing-card__category">{item.condition}</p> : null}
                    <h3 className="listing-card__title"><Link to={`/listings/${item._id}`}>{item.title}</Link></h3>
                    <p className="listing-card__price">{currencyFormatter.format(item.price)}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
          {user.pages > 1 ? (
            <nav className="listing-pagination" aria-label="Seller listings pages">
              <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button>
              <span>Page {page} of {user.pages}</span>
              <button type="button" disabled={page >= user.pages} onClick={() => setPage((current) => current + 1)}>Next</button>
            </nav>
          ) : null}
        </section>
      </div>
    </main>
  );
}
