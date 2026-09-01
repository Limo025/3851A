function positiveInteger(value) {
  return Number.isFinite(value) && Number.isInteger(value) && value > 0 ? value : 1;
}

export function clampPage(page, pages) {
  return Math.min(positiveInteger(page), positiveInteger(pages));
}
