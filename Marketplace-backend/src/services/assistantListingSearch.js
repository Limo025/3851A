import Listing from '../models/Listing.js';
import { LISTING_CONDITIONS } from '../constants/listings.js';
import { escapeRegex } from '../validation/listings.js';

const RESULT_PROJECTION = Object.freeze({
  title: 1,
  price: 1,
  category: 1,
  condition: 1,
  'images.url': 1,
  seller: 0,
});

function searchMatch(query) {
  const regex = new RegExp(escapeRegex(query.slice(0, 100)), 'i');
  return {
    $or: [
      { title: { $regex: regex } },
      { description: { $regex: regex } },
    ],
  };
}

function mapSummary({ totals = [], conditions = [] }) {
  const byCondition = Object.fromEntries(LISTING_CONDITIONS.map((condition) => [condition, 0]));
  const [totalsRow] = totals;

  for (const { _id, count } of conditions) {
    if (LISTING_CONDITIONS.includes(_id)) byCondition[_id] = count;
  }

  return {
    total: totalsRow?.total ?? 0,
    minPrice: totalsRow?.minPrice ?? null,
    maxPrice: totalsRow?.maxPrice ?? null,
    byCondition,
  };
}

export function createAssistantListingSearch({ ListingModel = Listing } = {}) {
  return {
    async summarize(query) {
      const [result = { totals: [], conditions: [] }] = await ListingModel.aggregate([
        { $match: searchMatch(query) },
        {
          $facet: {
            totals: [{
              $group: {
                _id: null,
                total: { $sum: 1 },
                minPrice: { $min: '$price' },
                maxPrice: { $max: '$price' },
              },
            }],
            conditions: [{ $group: { _id: '$condition', count: { $sum: 1 } } }],
          },
        },
      ]);

      return mapSummary(result);
    },

    async findMatches({ query, maxPrice, conditions, limit = 5 }) {
      const filter = {
        $and: [
          searchMatch(query),
          { price: { $lte: maxPrice } },
          { condition: { $in: conditions } },
        ],
      };
      const rows = await ListingModel
        .find(filter, RESULT_PROJECTION)
        .sort({ price: 1 })
        .limit(Math.min(limit, 5))
        .lean();

      return rows.map(({ _id, title, price, category, condition, images }) => ({
        id: String(_id),
        title,
        price,
        category,
        condition,
        imageUrl: images?.[0]?.url || null,
      }));
    },
  };
}
