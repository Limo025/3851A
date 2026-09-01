export class PasswordResetError extends Error {
  constructor(kind, message) {
    super(message);
    this.name = 'PasswordResetError';
    this.kind = kind;
  }
}

export async function requestPasswordReset(email, { auth, sendEmail }) {
  const normalizedEmail = typeof email === 'string' ? email.trim() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new PasswordResetError('validation', 'Please enter a valid email address.');
  }

  try {
    await sendEmail(auth, normalizedEmail);
  } catch (error) {
    if (error?.code !== 'auth/user-not-found') {
      throw new PasswordResetError('request', 'Unable to send the reset email. Please try again.');
    }
  }

  return 'sent';
}
