const { pool } = require('../config/database');
const { uploadImage, uploadMultipleImages, deleteImage } = require('../config/cloudinary');
const fs = require('fs').promises;
const path = require('path');

/**
 * Upload single or multiple images for a product
 * Supports both creating new images and appending to existing ones
 */
const uploadProductImages = async (req, res) => {
  let uploadedFiles = [];

  try {
    const { productId } = req.params;
    const { replaceAll = 'false', isPrimary = 'false' } = req.body;

    // Validate product exists
    const [products] = await pool.execute(
      'SELECT id, name FROM products WHERE id = ?',
      [productId]
    );

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images provided. Please upload at least one image.'
      });
    }

    uploadedFiles = req.files;

    // If replaceAll is true, delete existing images
    if (replaceAll === 'true') {
      const [existingImages] = await pool.execute(
        'SELECT publicId FROM product_images WHERE productId = ?',
        [productId]
      );

      // Delete from Cloudinary
      for (const img of existingImages) {
        try {
          await deleteImage(img.publicId);
        } catch (error) {
          console.error(`Failed to delete image ${img.publicId}:`, error.message);
        }
      }

      // Delete from database
      await pool.execute(
        'DELETE FROM product_images WHERE productId = ?',
        [productId]
      );
    }

    // Upload images to Cloudinary
    const uploadResults = await uploadMultipleImages(
      uploadedFiles,
      `products/${productId}`
    );

    // Get current max sort order
    const [maxSortResult] = await pool.execute(
      'SELECT COALESCE(MAX(sortOrder), -1) as maxSort FROM product_images WHERE productId = ?',
      [productId]
    );

    let currentSortOrder = maxSortResult[0].maxSort + 1;

    // Check if product already has a primary image
    const [existingPrimary] = await pool.execute(
      'SELECT id FROM product_images WHERE productId = ? AND isPrimary = 1',
      [productId]
    );

    const hasPrimaryImage = existingPrimary.length > 0;
    const shouldSetPrimary = isPrimary === 'true' || !hasPrimaryImage;

    // Insert images into database
    const imageInsertPromises = uploadResults.map(async (result, index) => {
      const isFirstImage = index === 0;
      const setAsPrimary = shouldSetPrimary && isFirstImage ? 1 : 0;

      // If setting new primary, unset existing primary
      if (setAsPrimary === 1 && hasPrimaryImage) {
        await pool.execute(
          'UPDATE product_images SET isPrimary = 0 WHERE productId = ?',
          [productId]
        );
      }

      const [insertResult] = await pool.execute(
        `INSERT INTO product_images
         (productId, imageUrl, publicId, altText, sortOrder, isPrimary)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          productId,
          result.url,
          result.public_id,
          products[0].name,
          currentSortOrder + index,
          setAsPrimary
        ]
      );

      return {
        id: insertResult.insertId,
        imageUrl: result.url,
        publicId: result.public_id,
        isPrimary: setAsPrimary === 1,
        sortOrder: currentSortOrder + index
      };
    });

    const insertedImages = await Promise.all(imageInsertPromises);

    // Clean up temporary files
    await cleanupTempFiles(uploadedFiles);

    // Get updated product with all images
    const [updatedProduct] = await pool.execute(
      `SELECT p.*,
       (SELECT JSON_ARRAYAGG(
         JSON_OBJECT(
           'id', pi.id,
           'imageUrl', pi.imageUrl,
           'publicId', pi.publicId,
           'isPrimary', pi.isPrimary,
           'sortOrder', pi.sortOrder,
           'altText', pi.altText
         )
       ) FROM product_images pi WHERE pi.productId = p.id ORDER BY pi.sortOrder) as images
       FROM products p WHERE p.id = ?`,
      [productId]
    );

    // Parse images JSON
    if (updatedProduct[0].images) {
      updatedProduct[0].images = JSON.parse(updatedProduct[0].images);
    }

    res.status(200).json({
      success: true,
      message: `Successfully uploaded ${insertedImages.length} image(s)`,
      data: {
        product: updatedProduct[0],
        uploadedImages: insertedImages,
        totalImages: updatedProduct[0].images?.length || 0
      }
    });

  } catch (error) {
    console.error('Upload product images error:', error);

    // Clean up temporary files on error
    if (uploadedFiles.length > 0) {
      await cleanupTempFiles(uploadedFiles);
    }

    // Handle specific errors
    if (error.message.includes('Image upload failed')) {
      return res.status(500).json({
        success: false,
        message: 'Failed to upload images to cloud storage',
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to upload product images',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get all images for a specific product
 */
const getProductImages = async (req, res) => {
  try {
    const { productId } = req.params;

    // Verify product exists
    const [products] = await pool.execute(
      'SELECT id, name FROM products WHERE id = ?',
      [productId]
    );

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Get all images for the product
    const [images] = await pool.execute(
      `SELECT
        id,
        imageUrl,
        publicId,
        altText,
        sortOrder,
        isPrimary,
        createdAt
       FROM product_images
       WHERE productId = ?
       ORDER BY isPrimary DESC, sortOrder ASC`,
      [productId]
    );

    res.status(200).json({
      success: true,
      data: {
        productId: parseInt(productId),
        productName: products[0].name,
        images: images,
        totalImages: images.length
      }
    });

  } catch (error) {
    console.error('Get product images error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve product images',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Delete a specific product image
 */
const deleteProductImage = async (req, res) => {
  try {
    const { productId, imageId } = req.params;

    // Get image details
    const [images] = await pool.execute(
      'SELECT * FROM product_images WHERE id = ? AND productId = ?',
      [imageId, productId]
    );

    if (images.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    const image = images[0];

    // Delete from Cloudinary
    try {
      await deleteImage(image.publicId);
    } catch (cloudinaryError) {
      console.error('Cloudinary deletion error:', cloudinaryError);
      // Continue with database deletion even if Cloudinary fails
    }

    // Delete from database
    await pool.execute(
      'DELETE FROM product_images WHERE id = ?',
      [imageId]
    );

    // If deleted image was primary, set another image as primary
    if (image.isPrimary) {
      const [remainingImages] = await pool.execute(
        'SELECT id FROM product_images WHERE productId = ? ORDER BY sortOrder ASC LIMIT 1',
        [productId]
      );

      if (remainingImages.length > 0) {
        await pool.execute(
          'UPDATE product_images SET isPrimary = 1 WHERE id = ?',
          [remainingImages[0].id]
        );
      }
    }

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
      data: {
        deletedImageId: parseInt(imageId)
      }
    });

  } catch (error) {
    console.error('Delete product image error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product image',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Set an image as primary
 */
const setPrimaryImage = async (req, res) => {
  try {
    const { productId, imageId } = req.params;

    // Verify image exists and belongs to product
    const [images] = await pool.execute(
      'SELECT id FROM product_images WHERE id = ? AND productId = ?',
      [imageId, productId]
    );

    if (images.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Image not found for this product'
      });
    }

    // Unset current primary image
    await pool.execute(
      'UPDATE product_images SET isPrimary = 0 WHERE productId = ?',
      [productId]
    );

    // Set new primary image
    await pool.execute(
      'UPDATE product_images SET isPrimary = 1 WHERE id = ?',
      [imageId]
    );

    res.status(200).json({
      success: true,
      message: 'Primary image updated successfully',
      data: {
        imageId: parseInt(imageId)
      }
    });

  } catch (error) {
    console.error('Set primary image error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set primary image',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Update image sort order
 */
const updateImageOrder = async (req, res) => {
  try {
    const { productId } = req.params;
    const { imageOrders } = req.body;

    // Validate input
    if (!Array.isArray(imageOrders) || imageOrders.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'imageOrders must be a non-empty array of {imageId, sortOrder}'
      });
    }

    // Verify product exists
    const [products] = await pool.execute(
      'SELECT id FROM products WHERE id = ?',
      [productId]
    );

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Update sort orders
    const updatePromises = imageOrders.map(({ imageId, sortOrder }) =>
      pool.execute(
        'UPDATE product_images SET sortOrder = ? WHERE id = ? AND productId = ?',
        [sortOrder, imageId, productId]
      )
    );

    await Promise.all(updatePromises);

    // Get updated images
    const [updatedImages] = await pool.execute(
      'SELECT id, imageUrl, sortOrder, isPrimary FROM product_images WHERE productId = ? ORDER BY sortOrder',
      [productId]
    );

    res.status(200).json({
      success: true,
      message: 'Image order updated successfully',
      data: {
        images: updatedImages
      }
    });

  } catch (error) {
    console.error('Update image order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update image order',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Update image alt text
 */
const updateImageAltText = async (req, res) => {
  try {
    const { productId, imageId } = req.params;
    const { altText } = req.body;

    if (!altText || altText.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Alt text is required'
      });
    }

    // Verify image exists
    const [images] = await pool.execute(
      'SELECT id FROM product_images WHERE id = ? AND productId = ?',
      [imageId, productId]
    );

    if (images.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    // Update alt text
    await pool.execute(
      'UPDATE product_images SET altText = ? WHERE id = ?',
      [altText.trim(), imageId]
    );

    res.status(200).json({
      success: true,
      message: 'Alt text updated successfully',
      data: {
        imageId: parseInt(imageId),
        altText: altText.trim()
      }
    });

  } catch (error) {
    console.error('Update alt text error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update alt text',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Delete all images for a product
 */
const deleteAllProductImages = async (req, res) => {
  try {
    const { productId } = req.params;

    // Verify product exists
    const [products] = await pool.execute(
      'SELECT id FROM products WHERE id = ?',
      [productId]
    );

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Get all images
    const [images] = await pool.execute(
      'SELECT publicId FROM product_images WHERE productId = ?',
      [productId]
    );

    if (images.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No images found for this product'
      });
    }

    // Delete from Cloudinary
    const deletionPromises = images.map(img =>
      deleteImage(img.publicId).catch(err => {
        console.error(`Failed to delete ${img.publicId}:`, err.message);
        return null;
      })
    );

    await Promise.all(deletionPromises);

    // Delete from database
    await pool.execute(
      'DELETE FROM product_images WHERE productId = ?',
      [productId]
    );

    res.status(200).json({
      success: true,
      message: `Successfully deleted ${images.length} image(s)`,
      data: {
        deletedCount: images.length
      }
    });

  } catch (error) {
    console.error('Delete all images error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product images',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Helper function to clean up temporary files
 */
const cleanupTempFiles = async (files) => {
  if (!Array.isArray(files)) return;

  const deletePromises = files.map(async (file) => {
    try {
      await fs.unlink(file.path);
    } catch (error) {
      console.error(`Failed to delete temp file ${file.path}:`, error.message);
    }
  });

  await Promise.all(deletePromises);
};

module.exports = {
  uploadProductImages,
  getProductImages,
  deleteProductImage,
  setPrimaryImage,
  updateImageOrder,
  updateImageAltText,
  deleteAllProductImages
};