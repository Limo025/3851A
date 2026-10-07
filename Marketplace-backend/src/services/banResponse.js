export function banResponse(extra = {}) {
  const appealEmail = process.env.ADMIN_APPEAL_EMAIL || 'tann03519@gmail.com';
  return { error: `Your account has been banned. Contact ${appealEmail} to appeal.`, code: 'ACCOUNT_BANNED', appealEmail, ...extra };
}
