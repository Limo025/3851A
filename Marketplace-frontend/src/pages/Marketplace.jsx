import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiFetch } from '../api/client.js';
import ListingFilters from '../components/ListingFilters.jsx';
import ListingGrid from '../components/ListingGrid.jsx';
import '../css/listings.css';

function readFilters(searchParams) {
  return {
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    condition: searchParams.get('condition') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    sort: searchParams.get('sort') || 'newest',
  };
}

function pageFrom(searchParams) {
  const page = Number(searchParams.get('page'));
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export default function Marketplace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [response, setResponse] = useState({ listings: [], page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const queryString = searchParams.toString();
  const filters = readFilters(searchParams);
  const requestedPage = pageFrom(searchParams);
  const currentPage = response.page || requestedPage;
  const pages = response.pages || 1;

  useEffect(() => {
    const controller = new AbortController();

    async function fetchListings() {
      setLoading(true);
      setError('');

      try {
        const data = await apiFetch(`/api/listings${queryString ? `?${queryString}` : ''}`, {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setResponse(data);
        }
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError instanceof Error ? requestError.message : 'Unable to load listings. Please try again.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchListings();
    return () => controller.abort();
  }, [queryString]);

  function updateParameters(updates, resetPage = false) {
    const nextParams = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value) nextParams.set(key, value);
      else nextParams.delete(key);
    });
    if (resetPage) nextParams.set('page', '1');

    setSearchParams(nextParams);
  }

  function handleSearch(search) {
    updateParameters({ search }, true);
  }

  function handleFilterChange(name, value) {
    updateParameters({ [name]: value }, true);
  }

  function goToPage(page) {
    updateParameters({ page: String(page) });
  }

  return (
    <main className="marketplace-page">
      <div className="marketplace-page__content">
        <header className="marketplace-page__header">
          <h1>Marketplace</h1>
          <p>Browse items listed by the university community.</p>
        </header>

        <ListingFilters filters={filters} onSearch={handleSearch} onFilterChange={handleFilterChange} />

        <p className="marketplace-page__count" aria-live="polite">
          {loading ? 'Loading results…' : `${response.total} listing${response.total === 1 ? '' : 's'} found`}
        </p>

        <ListingGrid
          listings={response.listings}
          loading={loading}
          error={error}
          emptyMessage="No listings match these filters. Try changing your search."
        />

        {!loading && !error && response.listings.length > 0 ? (
          <nav className="listing-pagination" aria-label="Listing pages">
            <button type="button" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}>Previous</button>
            <span>Page {currentPage} of {pages}</span>
            <button type="button" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= pages}>Next</button>
          </nav>
        ) : null}
      </div>
    </main>
  );
}
