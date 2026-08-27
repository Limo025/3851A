import { useRef, useState } from 'react';
import ImageUploader from './ImageUploader.jsx';
import {
  LISTING_CATEGORIES,
  LISTING_CONDITIONS,
  runSingleSubmission,
  validateListingValues,
} from '../utils/listingForm.js';

const emptyValues = {
  title: '',
  description: '',
  price: '',
  category: '',
  condition: '',
};

export default function ListingForm({ initialValues = emptyValues, retainedImages = [], submitLabel = 'Save listing', onSubmit }) {
  const [values, setValues] = useState({ ...emptyValues, ...initialValues });
  const [currentRetainedImages, setCurrentRetainedImages] = useState(retainedImages);
  const [newFiles, setNewFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submitLock = useRef(false);

  function updateField(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setSubmitError('');
  }

  function updateRetainedImages(images) {
    setCurrentRetainedImages(images);
    setErrors((current) => ({ ...current, images: undefined }));
  }

  function updateNewFiles(files) {
    setNewFiles(files);
    setErrors((current) => ({ ...current, images: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitLock.current) return;

    const nextErrors = validateListingValues(values, currentRetainedImages.length + newFiles.length);
    setErrors(nextErrors);
    setSubmitError('');
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await runSingleSubmission(
        submitLock,
        () => onSubmit({ values, retainedImages: currentRetainedImages, newFiles }),
      );
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to save this listing. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="listing-form" onSubmit={handleSubmit} noValidate>
      {submitError ? <p className="listing-form__submit-error" role="alert">{submitError}</p> : null}

      <label htmlFor="listing-title">Title</label>
      <input
        id="listing-title"
        name="title"
        type="text"
        value={values.title}
        onChange={updateField}
        required
        minLength="3"
        maxLength="120"
        aria-invalid={Boolean(errors.title)}
        aria-describedby={errors.title ? 'listing-title-error' : undefined}
      />
      {errors.title ? <p id="listing-title-error" className="listing-form__error">{errors.title}</p> : null}

      <label htmlFor="listing-description">Description</label>
      <textarea
        id="listing-description"
        name="description"
        value={values.description}
        onChange={updateField}
        required
        minLength="10"
        maxLength="5000"
        rows="7"
        aria-invalid={Boolean(errors.description)}
        aria-describedby={errors.description ? 'listing-description-error' : undefined}
      />
      {errors.description ? <p id="listing-description-error" className="listing-form__error">{errors.description}</p> : null}

      <label htmlFor="listing-price">Price (AUD)</label>
      <input
        id="listing-price"
        name="price"
        type="number"
        value={values.price}
        onChange={updateField}
        required
        min="0.01"
        step="0.01"
        inputMode="decimal"
        aria-invalid={Boolean(errors.price)}
        aria-describedby={errors.price ? 'listing-price-error' : undefined}
      />
      {errors.price ? <p id="listing-price-error" className="listing-form__error">{errors.price}</p> : null}

      <label htmlFor="listing-category">Category</label>
      <select
        id="listing-category"
        name="category"
        value={values.category}
        onChange={updateField}
        required
        aria-invalid={Boolean(errors.category)}
        aria-describedby={errors.category ? 'listing-category-error' : undefined}
      >
        <option value="">Select a category</option>
        {LISTING_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
      </select>
      {errors.category ? <p id="listing-category-error" className="listing-form__error">{errors.category}</p> : null}

      <label htmlFor="listing-condition">Condition</label>
      <select
        id="listing-condition"
        name="condition"
        value={values.condition}
        onChange={updateField}
        required
        aria-invalid={Boolean(errors.condition)}
        aria-describedby={errors.condition ? 'listing-condition-error' : undefined}
      >
        <option value="">Select a condition</option>
        {LISTING_CONDITIONS.map((condition) => <option key={condition} value={condition}>{condition}</option>)}
      </select>
      {errors.condition ? <p id="listing-condition-error" className="listing-form__error">{errors.condition}</p> : null}

      <ImageUploader
        retainedImages={currentRetainedImages}
        newFiles={newFiles}
        onRetainedChange={updateRetainedImages}
        onFilesChange={updateNewFiles}
        error={errors.images}
      />

      <button className="listing-form__submit" type="submit" disabled={submitting}>
        {submitting ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}
