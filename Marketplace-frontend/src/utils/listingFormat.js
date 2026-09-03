const currencyFormatter = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
});

function numericListingValue(value) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    return Number(value);
  }

  return NaN;
}

export function formatListingPrice(value) {
  const amount = numericListingValue(value);
  return Number.isFinite(amount) && amount > 0
    ? currencyFormatter.format(amount)
    : 'Price unavailable';
}

export function formatListingDate(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return 'Date unavailable';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
}
