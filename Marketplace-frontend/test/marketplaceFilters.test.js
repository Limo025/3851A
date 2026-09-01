import assert from 'node:assert/strict';
import test from 'node:test';
import { clearMarketplaceFilters } from '../src/utils/marketplaceFilters.js';

test('clearing marketplace filters preserves the header search and removes filtering state', () => {
  const current = new URLSearchParams({
    search: 'desk lamp',
    category: 'Furniture and Home',
    condition: 'Good',
    minPrice: '10',
    maxPrice: '200',
    sort: 'price_asc',
    page: '3',
  });

  assert.equal(clearMarketplaceFilters(current).toString(), 'search=desk+lamp');
});
