const path = require('path');

/**
 * Validate image file types
 */
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml'
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

/**
 * Validate single image
 */
const validateImage = (file) => {
  const errors = [];

  // Check if file exists
  if (!file) {
    errors.push('No file provided');
    return errors;
  }

  // Check file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    errors.push(`Invalid file type: ${file.mimetype}. Allowed types: JPEG, PNG, GIF, WebP, SVG`);
  }

  // Check file extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    errors.push(`Invalid file extension: ${ext}. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`);
  }

  // Check file size (10MB max)
  const maxSize = 10 * 1024 * 1024; // 10MB in bytes
  if (file.size > maxSize) {
    errors.push(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum size: 10MB`);
  }

  // Check minimum size (1KB to prevent empty files)
  const minSize = 1024; // 1KB
  if (file.size < minSize) {
    errors.push('File too small. Minimum size: 1KB');
  }

  return errors;
};

/**
 * Validate multiple images
 */
const validateImages = (files) => {
  const errors = [];

  if (!files || !Array.isArray(files) || files.length === 0) {
    errors.push('No files provided');
    return errors;
  }

  // Check max number of files (10)
  const maxFiles = 10;
  if (files.length > maxFiles) {
    errors.push(`Too many files. Maximum allowed: ${maxFiles}, received: ${files.length}`);
  }

  // Validate each file
  files.forEach((file, index) => {
    const fileErrors = validateImage(file);
    if (fileErrors.length > 0) {
      errors.push(`File ${index + 1} (${file.originalname}): ${fileErrors.join(', ')}`);
    }
  });

  return errors;
};

/**
 * Middleware to validate image uploads
 */
const validateImageUpload = (req, res, next) => {
  try {
    // Check if files exist
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images provided',
        errors: ['Please upload at least one image']
      });
    }

    // Validate all files
    const errors = validateImages(req.files);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Image validation failed',
        errors: errors
      });
    }

    next();
  } catch (error) {
    console.error('Image validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating images',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Middleware to check image dimensions (optional)
 */
const checkImageDimensions = (minWidth = 100, minHeight = 100, maxWidth = 8000, maxHeight = 8000) => {
  return async (req, res, next) => {
    try {
      const sharp = require('sharp');
      const errors = [];

      if (!req.files || req.files.length === 0) {
        return next();
      }

      // Check dimensions for each image
      for (const file of req.files) {
        try {
          const metadata = await sharp(file.path).metadata();

          if (metadata.width < minWidth || metadata.height < minHeight) {
            errors.push(
              `${file.originalname}: Image too small. Minimum dimensions: ${minWidth}x${minHeight}px, actual: ${metadata.width}x${metadata.height}px`
            );
          }

          if (metadata.width > maxWidth || metadata.height > maxHeight) {
            errors.push(
              `${file.originalname}: Image too large. Maximum dimensions: ${maxWidth}x${maxHeight}px, actual: ${metadata.width}x${metadata.height}px`
            );
          }
        } catch (err) {
          errors.push(`${file.originalname}: Could not read image dimensions`);
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Image dimension validation failed',
          errors: errors
        });
      }

      next();
    } catch (error) {
      console.error('Dimension check error:', error);
      // Don't fail the request if dimension check fails
      next();
    }
  };
};

/**
 * Sanitize filename
 */
const sanitizeFilename = (filename) => {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

/**
 * Get image info
 */
const getImageInfo = (file) => {
  return {
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    sizeFormatted: `${(file.size / 1024).toFixed(2)} KB`,
    extension: path.extname(file.originalname).toLowerCase()
  };
};

/**
 * Check if file is image
 */
const isImageFile = (file) => {
  return file && ALLOWED_IMAGE_TYPES.includes(file.mimetype);
};

/**
 * Format file size
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Validate image aspect ratio
 */
const validateAspectRatio = async (file, minRatio = 0.5, maxRatio = 2.0) => {
  try {
    const sharp = require('sharp');
    const metadata = await sharp(file.path).metadata();
    const ratio = metadata.width / metadata.height;

    if (ratio < minRatio || ratio > maxRatio) {
      return {
        valid: false,
        message: `Invalid aspect ratio: ${ratio.toFixed(2)}. Allowed range: ${minRatio} - ${maxRatio}`,
        actual: ratio
      };
    }

    return {
      valid: true,
      ratio: ratio
    };
  } catch (error) {
    return {
      valid: false,
      message: 'Could not validate aspect ratio',
      error: error.message
    };
  }
};

module.exports = {
  validateImage,
  validateImages,
  validateImageUpload,
  checkImageDimensions,
  sanitizeFilename,
  getImageInfo,
  isImageFile,
  formatFileSize,
  validateAspectRatio,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_EXTENSIONS
};