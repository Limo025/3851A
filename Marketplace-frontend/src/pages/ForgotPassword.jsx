import { useState } from 'react';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { Link } from 'react-router-dom';
import { PasswordResetError, requestPasswordReset } from '../auth/passwordReset.js';

const successMessage = 'If an account exists for this email, a password reset link has been sent.';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError('');
    setSent(false);

    try {
      await requestPasswordReset(email, {
        auth: getAuth(),
        sendEmail: sendPasswordResetEmail,
      });
      setSent(true);
    } catch (requestError) {
      setError(
        requestError instanceof PasswordResetError
          ? requestError.message
          : 'Unable to send the reset email. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main id="contentBackground" className="password-reset-page">
      <section className="password-reset-card" aria-labelledby="password-reset-title">
        <p className="password-reset-card__eyebrow">Account recovery</p>
        <h1 id="password-reset-title">Reset your password</h1>
        <p className="password-reset-card__intro">
          Enter the email used for your Marketplace account. Firebase will email you a secure reset link.
        </p>

        {sent ? <p className="password-reset-card__success" role="status">{successMessage}</p> : null}
        {error ? <p className="password-reset-card__error" role="alert">{error}</p> : null}

        <form className="password-reset-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="reset-email">Email address</label>
          <input
            id="reset-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="student@example.com"
            disabled={submitting}
            required
          />
          <button type="submit" disabled={submitting}>
            {submitting ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <Link className="password-reset-card__back" to="/login">Back to login</Link>
      </section>
    </main>
  );
}
