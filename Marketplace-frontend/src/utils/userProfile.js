export function getSellerProfileRequest(id, page) {
  return `/api/users/${id}?page=${page}`;
}
