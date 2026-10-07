let appealToken = null;
let banReason = '';
export function setAppealToken(token, reason = '') { appealToken = token; banReason = reason; }
export function getAppealToken() { return appealToken; }
export function getBanReason() { return banReason; }
export function notifyBan(token, reason = '') {
  setAppealToken(token, reason);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('marketplace:banned'));
}
