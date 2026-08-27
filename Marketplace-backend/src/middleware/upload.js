import Busboy from '@fastify/busboy';
import { MAX_IMAGE_BYTES, MAX_LISTING_IMAGES } from '../constants/listings.js';

const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

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
    if (!uploadError) uploadError = error;
  };

  try {
    parser = new Busboy({
      headers: req.headers,
      limits: {
        files: MAX_LISTING_IMAGES,
        fileSize: MAX_IMAGE_BYTES,
      },
    });
  } catch {
    finish(new UploadError('Malformed multipart upload', 'INVALID_MULTIPART'));
    return;
  }

  parser.on('field', (name, value) => addField(body, name, value));

  parser.on('file', (fieldname, stream, filename, _encoding, mimetype) => {
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
      files.push({
        buffer: Buffer.concat(chunks),
        originalname: filename,
        mimetype,
        size: chunks.reduce((total, chunk) => total + chunk.length, 0),
      });
    });
  });

  parser.on('filesLimit', () => {
    reject(new UploadError(`Too many images; a maximum of ${MAX_LISTING_IMAGES} is allowed`, 'LIMIT_FILE_COUNT'));
  });
  parser.on('partsLimit', () => reject(new UploadError('Malformed multipart upload', 'INVALID_MULTIPART')));
  parser.on('error', () => finish(new UploadError('Malformed multipart upload', 'INVALID_MULTIPART')));
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
    INVALID_MULTIPART: 'Malformed multipart upload',
  };

  if (messages[error?.code]) {
    return res.status(400).json({ error: messages[error.code] });
  }

  return next(error);
}
