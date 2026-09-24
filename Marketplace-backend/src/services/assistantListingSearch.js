import Listing from '../models/Listing.js';
import { LISTING_CONDITIONS } from '../constants/listings.js';
import { escapeRegex } from '../validation/listings.js';

const RESULT_PROJECTION = Object.freeze({
  _id: 1,
  title: 1,
  price: 1,
  category: 1,
  condition: 1,
  'images.url': 1,
});

function searchMatch(query) {
  const regex = new RegExp(escapeRegex(query.slice(0, 100)), 'i');
  return {
    soldAt: null,
    $or: [
      { title: { $regex: regex } },
      { description: { $regex: regex } },
    ],
  };
}

function finalMatch(query, maxPrice, conditions) {
  return {
    $and: [
      searchMatch(query),
      { price: { $lte: maxPrice } },
      { condition: { $in: conditions } },
    ],
  };
}

function relevancePipeline(query, maxPrice, conditions, limit) {
  const escapedQuery = escapeRegex(query.slice(0, 100));
  return [
    { $match: finalMatch(query, maxPrice, conditions) },
    {
      $addFields: {
        _assistantTitleMatch: {
          $regexMatch: {
            input: { $ifNull: ['$title', ''] },
            regex: escapedQuery,
            options: 'i',
          },
        },
      },
    },
    { $sort: { _assistantTitleMatch: -1, price: 1, _id: 1 } },
    { $limit: limit },
    { $project: RESULT_PROJECTION },
  ];
}

function relevanceScore(listing, query) {
  const regex = new RegExp(escapeRegex(query.slice(0, 100)), 'i');
  return regex.test(typeof listing.title === 'string' ? listing.title : '') ? 1 : 0;
}

function sortMatches(rows, query) {
  return [...rows].sort((left, right) => (
    relevanceScore(right, query) - relevanceScore(left, query)
    || left.price - right.price
    || String(left._id).localeCompare(String(right._id))
  ));
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

function safeLimit(limit) {
  return Number.isInteger(limit) && limit > 0 ? Math.min(limit, 5) : 5;
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
      const boundedLimit = safeLimit(limit);
      const rows = typeof ListingModel.aggregate === 'function'
        ? await ListingModel.aggregate(relevancePipeline(query, maxPrice, conditions, boundedLimit))
        : sortMatches(
          await ListingModel.find(finalMatch(query, maxPrice, conditions), RESULT_PROJECTION).lean(),
          query,
        ).slice(0, boundedLimit);

      return rows.slice(0, boundedLimit).map(({ _id, title, price, category, condition, images }) => ({
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
