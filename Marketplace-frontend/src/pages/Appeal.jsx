import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client.js';
import { getAppealToken, getBanReason } from '../auth/banNotice.js';

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
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await apiFetch('/api/appeals', { method: 'POST', headers: { Authorization: `Bearer ${getAppealToken()}` }, body: { reason } });
      setMessage(result.message); setSent(true);
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  return <main className="w-full bg-white text-black">
    <div className="max-w-xl mx-auto p-6">
    <h1>Your account has been banned</h1>
    <h2>Reason for your ban</h2>
    <p>{getBanReason() || 'No specific reason was provided. Contact the administrator for more information.'}</p>
    <p>Submit the form below for administrator review, or contact <a href="mailto:tann03519@gmail.com">tann03519@gmail.com</a>.</p>
    {message && <p role="status">{message}</p>}
    {!getAppealToken() ? <p><Link to="/login">Sign in</Link> to verify your account before submitting an appeal.</p> : <form onSubmit={submit}>
      <label htmlFor="appeal-reason">Why should your account be reinstated?</label>
      <textarea id="appeal-reason" className="border w-full p-3" required minLength={20} maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} disabled={sent} />
      <button disabled={busy || sent}>{busy ? 'Sending…' : 'Send appeal'}</button>
    </form>}
    </div>
  </main>;
}
