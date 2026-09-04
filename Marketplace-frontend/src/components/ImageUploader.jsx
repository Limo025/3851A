import { useEffect, useRef, useState } from 'react';
import {
  ACCEPTED_IMAGE_TYPES,
  createImagePreviews,
  revokeImagePreviews,
  validateImageSelection,
} from '../utils/listingForm.js';

function NewImagePreview({ file, index, onRemove }) {
  const imageRef = useRef(null);

  useEffect(() => {
    const previews = createImagePreviews([file]);
    if (imageRef.current) {
      imageRef.current.src = previews[0].url;
    }

    return () => revokeImagePreviews(previews);
  }, [file]);

  return (
    <li className="image-uploader__item">
      <img ref={imageRef} alt={`New listing preview ${index + 1}`} />
      <button type="button" onClick={onRemove} aria-label={`Remove new image ${index + 1}`}>Remove</button>
    </li>
  );
}

export default function ImageUploader({ retainedImages, newFiles, onRetainedChange, onFilesChange, error }) {
  const [selectionError, setSelectionError] = useState('');
  const images = Array.isArray(retainedImages) ? retainedImages : [];
  const files = Array.isArray(newFiles) ? newFiles : [];
  const visibleError = selectionError || error;

  function handleSelection(event) {
    const result = validateImageSelection({
      retainedCount: images.length,
      newFiles: files,
      selectedFiles: event.target.files,
    });
    setSelectionError(result.error);
    if (!result.error) {
      onFilesChange(result.files);
    }
    event.target.value = '';
  }

  function removeRetainedImage(index) {
    setSelectionError('');
    onRetainedChange(images.filter((_, imageIndex) => imageIndex !== index));
  }

  function removeNewImage(index) {
    setSelectionError('');
    onFilesChange(files.filter((_, fileIndex) => fileIndex !== index));
  }

  return (
    <fieldset className="image-uploader" aria-describedby={visibleError ? 'listing-images-error' : 'listing-images-help'}>
      <legend>Images</legend>
      <p id="listing-images-help">Add 1–5 JPEG, PNG, or WebP images. Each image must be 5 MB or smaller.</p>
      <label className="image-uploader__picker" htmlFor="listing-images">Choose images</label>
      <input
        id="listing-images"
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        multiple
        onChange={handleSelection}
      />
      {visibleError ? <p id="listing-images-error" className="listing-form__error" role="alert">{visibleError}</p> : null}

      {images.length + files.length > 0 ? (
        <ul className="image-uploader__previews" aria-label="Selected listing images">
          {images.map((image, index) => (
            <li className="image-uploader__item" key={image.publicId || image.url}>
              <img src={image.url} alt={`Retained listing image ${index + 1}`} />
              <button type="button" onClick={() => removeRetainedImage(index)} aria-label={`Remove retained image ${index + 1}`}>Remove</button>
            </li>
          ))}
          {files.map((file, index) => (
            <NewImagePreview
              key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
              file={file}
              index={index}
              onRemove={() => removeNewImage(index)}
            />
          ))}
        </ul>
      ) : null}
    </fieldset>
  );
}
