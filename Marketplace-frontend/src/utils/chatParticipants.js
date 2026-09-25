export function getOtherParticipant(conversation, mode) {
  return mode === 'buyer' ? conversation?.sellerDetails : conversation?.buyerDetails;
}

export function isOtherParticipantBanned(conversation, mode) {
  return getOtherParticipant(conversation, mode)?.isBanned === true;
}

export function isConversationListingSold(conversation) {
  return Boolean(conversation?.listing?.soldAt);
}
