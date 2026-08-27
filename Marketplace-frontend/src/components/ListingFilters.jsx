const categories = [
  'Books and Textbooks',
  'Electronics',
  'Furniture and Home',
  'Clothing and Accessories',
  'Sports and Recreation',
  'Other',
];

const conditions = ['New', 'Like New', 'Good', 'Fair'];

const sortOptions = [
  ['newest', 'Newest first'],
  ['oldest', 'Oldest first'],
  ['price_asc', 'Price: low to high'],
  ['price_desc', 'Price: high to low'],
];

export default function ListingFilters({ filters, onSearch, onFilterChange }) {
  function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    onSearch(formData.get('search')?.trim() || '');
  }

  return (
    <form className="listing-filters" onSubmit={handleSubmit} aria-label="Search and filter listings">
      <div className="listing-filters__search">
        <label htmlFor="listing-search">Search listings</label>
        <div className="listing-filters__search-row">
          <input
            key={filters.search}
            id="listing-search"
            name="search"
            type="search"
            defaultValue={filters.search}
            maxLength="100"
            placeholder="Search by title"
          />
          <button type="submit">Search</button>
        </div>
      </div>

      <label>
        Category
        <select value={filters.category} onChange={(event) => onFilterChange('category', event.target.value)}>
          <option value="">All categories</option>
          {categories.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
      </label>

      <label>
        Condition
        <select value={filters.condition} onChange={(event) => onFilterChange('condition', event.target.value)}>
          <option value="">All conditions</option>
          {conditions.map((condition) => <option key={condition} value={condition}>{condition}</option>)}
        </select>
      </label>

      <label>
        Minimum price
        <input type="number" min="0" step="0.01" value={filters.minPrice} onChange={(event) => onFilterChange('minPrice', event.target.value)} />
      </label>

      <label>
        Maximum price
        <input type="number" min="0" step="0.01" value={filters.maxPrice} onChange={(event) => onFilterChange('maxPrice', event.target.value)} />
      </label>

      <label>
        Sort by
        <select value={filters.sort} onChange={(event) => onFilterChange('sort', event.target.value)}>
          {sortOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
    </form>
  );
}
