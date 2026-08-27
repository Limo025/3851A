import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client.js';
import ListingForm from '../components/ListingForm.jsx';
import { buildListingFormData } from '../utils/listingForm.js';
import '../css/listings.css';

export default function CreateListing() {
  const navigate = useNavigate();

  async function createListing({ values, newFiles }) {
    const body = buildListingFormData(values, newFiles);
    const listing = await apiFetch('/api/listings', { method: 'POST', body, auth: true });
    navigate(`/listings/${listing._id}`, { state: { message: 'Listing created successfully' } });
  }

  return (
    <main className="marketplace-page">
      <div className="marketplace-page__content listing-form-page">
        <header className="marketplace-page__header">
          <h1>Create a listing</h1>
          <p>Share an item with the university community.</p>
        </header>
        <ListingForm submitLabel="Create listing" onSubmit={createListing} />
      </div>
    </main>
  );
}
