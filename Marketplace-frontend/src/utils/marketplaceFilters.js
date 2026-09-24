export function clearMarketplaceFilters(searchParams) {
  const nextParams = new URLSearchParams(searchParams);

  for (const name of ['category', 'condition', 'minPrice', 'maxPrice', 'sort', 'page']) {
    nextParams.delete(name);
  }

  return nextParams;
}

export function buildMarketplaceApiQuery(searchParams) {
  const apiParams = new URLSearchParams(searchParams);
  apiParams.set('availableOnly', 'true');
  return apiParams.toString();
}
