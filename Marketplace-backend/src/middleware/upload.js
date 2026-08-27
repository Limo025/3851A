import Busboy from '@fastify/busboy';
import { MAX_IMAGE_BYTES, MAX_LISTING_IMAGES } from '../constants/listings.js';

const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function hasMatchingImageSignature(buffer, mimetype) {
  if (mimetype === 'image/jpeg') {
    return buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  }

  if (mimetype === 'image/png') {
    return buffer.length >= 8
      && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]));
  }

  return mimetype === 'image/webp'
    && buffer.length >= 12
    && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
    && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
}

class UploadError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'UploadError';
    this.code = code;
  }
}

function addField(body, name, value) {
  if (body[name] === undefined) {
    body[name] = value;
  } else if (Array.isArray(body[name])) {
    body[name].push(value);
  } else {
    body[name] = [body[name], value];
  }
}

export function listingImagesUpload(req, res, next) {
  let parser;
  let complete = false;
  let uploadError;
  const files = [];
  const body = {};

  const finish = (error) => {
    if (complete) return;
    complete = true;
    next(error);
  };

  const reject = (error) => {
    if (!uploadError || error.code === 'LIMIT_PART_COUNT') uploadError = error;
  };

  try {
    parser = new Busboy({
      headers: req.headers,
      limits: {
        files: MAX_LISTING_IMAGES,
        fileSize: MAX_IMAGE_BYTES,
        fields: 10,
        fieldSize: 16 * 1024,
        parts: 15,
      },
    });
  } catch {
    finish(new UploadError('Malformed multipart upload', 'INVALID_MULTIPART'));
    return;
  }

  parser.on('field', (name, value, fieldnameTruncated, valueTruncated) => {
    if (fieldnameTruncated || valueTruncated) {
      reject(new UploadError('Form field exceeds the allowed size', 'LIMIT_FIELD_SIZE'));
      return;
    }
    addField(body, name, value);
  });

  parser.on('file', (fieldname, stream, filename, _encoding, mimetype) => {
    if (uploadError) {
      stream.resume();
      return;
    }

    if (fieldname !== 'images') {
      stream.resume();
      reject(new UploadError('Images must be uploaded using the images field', 'LIMIT_UNEXPECTED_FILE'));
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.has(mimetype)) {
      stream.resume();
      reject(new UploadError('Only JPEG, PNG, and WebP image types are allowed', 'INVALID_IMAGE_TYPE'));
      return;
    }

    const chunks = [];
    let isTruncated = false;
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('limit', () => {
      isTruncated = true;
      reject(new UploadError(`Image file size must not exceed ${MAX_IMAGE_BYTES} bytes`, 'LIMIT_FILE_SIZE'));
    });
    stream.on('error', () => reject(new UploadError('Malformed multipart upload', 'INVALID_MULTIPART')));
    stream.on('end', () => {
      if (isTruncated || stream.truncated) return;
      const buffer = Buffer.concat(chunks);
      if (!hasMatchingImageSignature(buffer, mimetype)) {
        reject(new UploadError('Image content does not match its declared type', 'INVALID_IMAGE_CONTENT'));
        return;
      }
      files.push({
        buffer,
        originalname: filename,
        mimetype,
        size: buffer.length,
      });
    });
  });

  parser.on('filesLimit', () => {
    reject(new UploadError(`Too many images; a maximum of ${MAX_LISTING_IMAGES} is allowed`, 'LIMIT_FILE_COUNT'));
  });
  parser.on('fieldsLimit', () => reject(new UploadError('Too many form fields; a maximum of 10 is allowed', 'LIMIT_FIELD_COUNT')));
  parser.on('partsLimit', () => reject(new UploadError('Too many multipart parts; a maximum of 15 is allowed', 'LIMIT_PART_COUNT')));
  parser.on('error', () => {
    req.resume();
    finish(new UploadError('Malformed multipart upload', 'INVALID_MULTIPART'));
  });
  parser.on('finish', () => {
    req.body = body;
    req.files = files;
    finish(uploadError);
  });

  req.on('aborted', () => finish(new UploadError('Malformed multipart upload', 'INVALID_MULTIPART')));
  req.pipe(parser);
}

export function handleUploadError(error, req, res, next) {
  const messages = {
    LIMIT_FILE_SIZE: `Image file size must not exceed ${MAX_IMAGE_BYTES} bytes`,
    LIMIT_FILE_COUNT: `Too many images; a maximum of ${MAX_LISTING_IMAGES} is allowed`,
    LIMIT_UNEXPECTED_FILE: 'Images must be uploaded using the images field',
    INVALID_IMAGE_TYPE: 'Only JPEG, PNG, and WebP image types are allowed',
    INVALID_IMAGE_CONTENT: 'Image content does not match its declared type',
    LIMIT_FIELD_COUNT: 'Too many form fields; a maximum of 10 is allowed',
    LIMIT_FIELD_SIZE: 'Form field exceeds the allowed size',
    LIMIT_PART_COUNT: 'Too many multipart parts; a maximum of 15 is allowed',
    INVALID_MULTIPART: 'Malformed multipart upload',
  };

  if (messages[error?.code]) {
    return res.status(400).json({ error: messages[error.code] });
  }

  return next(error);
}
