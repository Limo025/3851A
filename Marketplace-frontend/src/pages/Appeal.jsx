import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client.js';
import { clearAppealContext, getAppealToken, getBanReason } from '../auth/banNotice.js';
import backgroundImg from '../img/well.jpg';
import logoImg from '../img/logoHrz.png';
import '../css/styles/ban-appeal.css';

export function BanListener() {
  const navigate = useNavigate();

  useEffect(() => {
    const onBan = () => navigate('/appeal');
    window.addEventListener('marketplace:banned', onBan);
    return () => window.removeEventListener('marketplace:banned', onBan);
  }, [navigate]);

  return null;
}

export default function Appeal() {
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [hasError, setHasError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const appealToken = getAppealToken();
  const banReason = getBanReason();

  async function submit(event) {
    event.preventDefault();
    if (busy || sent) return;

    setBusy(true);
    setMessage('');
    setHasError(false);

    try {
      const result = await apiFetch('/api/appeals', {
        method: 'POST',
        headers: { Authorization: `Bearer ${appealToken}` },
        body: { reason },
      });
      setMessage(result.message);
      setSent(true);
      clearAppealContext();
    } catch (error) {
      setMessage(error.message);
      setHasError(true);
    } finally {
      setBusy(false);
    }
  }

  document.title = 'Appeal Account Ban | UON Marketplace';

  return (
    <main className="ban-appeal-page" style={{ backgroundImage: `url(${backgroundImg})` }}>
      <section className="ban-appeal-card" aria-labelledby="ban-appeal-title">
        <img className="ban-appeal-card__logo" src={logoImg} alt="University of Newcastle logo" />
        <h1 id="ban-appeal-title">Your account has been banned</h1>
        <p className="ban-appeal-card__intro">
          If you believe this decision should be reviewed, submit an appeal for an administrator to assess.
        </p>

        <div className="ban-appeal-card__reason">
          <h2 className='font-bold'>Reason for your ban</h2>
          <p>{banReason || 'No specific reason was provided. Contact an administrator for more information.'}</p>
        </div>

        {message ? (
          <p
            className={`ban-appeal-card__message ${hasError ? 'ban-appeal-card__message--error' : 'ban-appeal-card__message--success'}`}
            role={hasError ? 'alert' : 'status'}
          >
            {message}
          </p>
        ) : null}

        {sent ? null : !appealToken ? (
          <p className="ban-appeal-card__sign-in">
            <Link className="form-link" to="/login">Sign in</Link> to verify your account before submitting an appeal.
          </p>
        ) : (
          <form className="ban-appeal-form" onSubmit={submit}>
            <label htmlFor="appeal-reason">Why should your account be reinstated?</label>
            <textarea
              id="appeal-reason"
              required
              minLength={20}
              maxLength={2000}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              disabled={busy || sent}
            />
            <p className="ban-appeal-form__hint">Between 20 and 2000 characters.</p>
            <button className="form-submit-button" type="submit" disabled={busy || sent}>
              {busy ? 'Sending…' : sent ? 'Appeal submitted' : 'Submit appeal'}
            </button>
          </form>
        )}

        <p className="ban-appeal-card__warning">
          Never include your password, verification codes, or other sensitive login information.
        </p>

        <Link className="form-link ban-appeal-card__back" to="/login">Back to login</Link>
      </section>
    </main>
  );
}
