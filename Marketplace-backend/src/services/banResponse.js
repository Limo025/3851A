export function banResponse(extra = {}) {
  return { error: 'Your account has been banned. Submit an appeal for administrator review.', code: 'ACCOUNT_BANNED', ...extra };
}
