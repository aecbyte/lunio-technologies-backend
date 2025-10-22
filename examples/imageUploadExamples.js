/**
 * Product Image Upload Examples
 *
 * This file contains practical examples of using the product image upload API
 */

// ============================================
// Example 1: Upload Multiple Images (Node.js)
// ============================================

const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

async function uploadProductImages() {
  const productId = 1;
  const token = 'your-jwt-token';

  const formData = new FormData();

  // Add multiple image files
  formData.append('images', fs.createReadStream('./product-image-1.jpg'));
  formData.append('images', fs.createReadStream('./product-image-2.jpg'));
  formData.append('images', fs.createReadStream('./product-image-3.jpg'));

  // Set options
  formData.append('replaceAll', 'false'); // Keep existing images
  formData.append('isPrimary', 'true');   // Set first as primary

  try {
    const response = await axios.post(
      `http://localhost:5000/api/v1/products/${productId}/images`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          ...formData.getHeaders()
        }
      }
    );

    console.log('✅ Upload successful!');
    console.log(`Uploaded ${response.data.data.uploadedImages.length} images`);
    console.log('Image URLs:', response.data.data.uploadedImages.map(img => img.imageUrl));

    return response.data;
  } catch (error) {
    console.error('❌ Upload failed:', error.response?.data || error.message);
    throw error;
  }
}

// ============================================
// Example 2: Upload Single Image (Browser)
// ============================================

async function uploadSingleImageBrowser() {
  const productId = 123;
  const token = localStorage.getItem('token');
  const fileInput = document.getElementById('imageInput');
  const file = fileInput.files[0];

  if (!file) {
    alert('Please select an image');
    return;
  }

  const formData = new FormData();
  formData.append('images', file);
  formData.append('isPrimary', 'true');

  try {
    const response = await fetch(
      `http://localhost:5000/api/v1/products/${productId}/images`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      }
    );

    const data = await response.json();

    if (data.success) {
      console.log('✅ Image uploaded successfully!');
      console.log('Image URL:', data.data.uploadedImages[0].imageUrl);
    } else {
      console.error('❌ Upload failed:', data.message);
    }

    return data;
  } catch (error) {
    console.error('❌ Network error:', error);
    throw error;
  }
}

// ============================================
// Example 3: Replace All Product Images
// ============================================

async function replaceAllProductImages(productId, newImageFiles, token) {
  const formData = new FormData();

  // Add all new images
  newImageFiles.forEach(file => {
    formData.append('images', file);
  });

  // Replace all existing images
  formData.append('replaceAll', 'true');
  formData.append('isPrimary', 'true');

  try {
    const response = await fetch(
      `http://localhost:5000/api/v1/products/${productId}/images`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      }
    );

    const data = await response.json();

    if (data.success) {
      console.log(`✅ Replaced all images with ${data.data.uploadedImages.length} new images`);
      return data.data.product;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('❌ Failed to replace images:', error.message);
    throw error;
  }
}

// ============================================
// Example 4: Get Product Images
// ============================================

async function getProductImages(productId) {
  try {
    const response = await fetch(
      `http://localhost:5000/api/v1/products/${productId}/images`
    );

    const data = await response.json();

    if (data.success) {
      console.log(`📸 Product has ${data.data.totalImages} images`);

      // Find primary image
      const primaryImage = data.data.images.find(img => img.isPrimary);
      console.log('Primary image:', primaryImage?.imageUrl);

      // List all images
      data.data.images.forEach((img, index) => {
        console.log(`Image ${index + 1}:`, img.imageUrl);
      });

      return data.data;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('❌ Failed to get images:', error.message);
    throw error;
  }
}

// ============================================
// Example 5: Delete Specific Image
// ============================================

async function deleteProductImage(productId, imageId, token) {
  try {
    const response = await fetch(
      `http://localhost:5000/api/v1/products/${productId}/images/${imageId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const data = await response.json();

    if (data.success) {
      console.log('✅ Image deleted successfully');
      return true;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('❌ Failed to delete image:', error.message);
    throw error;
  }
}

// ============================================
// Example 6: Set Primary Image
// ============================================

async function setPrimaryImage(productId, imageId, token) {
  try {
    const response = await fetch(
      `http://localhost:5000/api/v1/products/${productId}/images/${imageId}/primary`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const data = await response.json();

    if (data.success) {
      console.log('✅ Primary image updated');
      return true;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('❌ Failed to set primary image:', error.message);
    throw error;
  }
}

// ============================================
// Example 7: Reorder Images
// ============================================

async function reorderProductImages(productId, newOrder, token) {
  // newOrder should be array of {imageId, sortOrder}
  // Example: [{imageId: 5, sortOrder: 0}, {imageId: 3, sortOrder: 1}]

  try {
    const response = await fetch(
      `http://localhost:5000/api/v1/products/${productId}/images/order`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageOrders: newOrder
        })
      }
    );

    const data = await response.json();

    if (data.success) {
      console.log('✅ Image order updated');
      console.log('New order:', data.data.images);
      return data.data.images;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('❌ Failed to reorder images:', error.message);
    throw error;
  }
}

// ============================================
// Example 8: Update Image Alt Text
// ============================================

async function updateImageAltText(productId, imageId, altText, token) {
  try {
    const response = await fetch(
      `http://localhost:5000/api/v1/products/${productId}/images/${imageId}/alt-text`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ altText })
      }
    );

    const data = await response.json();

    if (data.success) {
      console.log('✅ Alt text updated');
      return true;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('❌ Failed to update alt text:', error.message);
    throw error;
  }
}

// ============================================
// Example 9: Complete Product Creation with Images
// ============================================

async function createProductWithImages(productData, imageFiles, token) {
  try {
    // Step 1: Create the product
    const productResponse = await fetch('http://localhost:5000/api/v1/products', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(productData)
    });

    const productResult = await productResponse.json();

    if (!productResult.success) {
      throw new Error('Failed to create product');
    }

    const productId = productResult.data.id;
    console.log(`✅ Product created with ID: ${productId}`);

    // Step 2: Upload images
    const formData = new FormData();
    imageFiles.forEach(file => {
      formData.append('images', file);
    });
    formData.append('isPrimary', 'true');

    const imageResponse = await fetch(
      `http://localhost:5000/api/v1/products/${productId}/images`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      }
    );

    const imageResult = await imageResponse.json();

    if (!imageResult.success) {
      throw new Error('Failed to upload images');
    }

    console.log(`✅ Uploaded ${imageResult.data.uploadedImages.length} images`);

    return {
      product: imageResult.data.product,
      images: imageResult.data.uploadedImages
    };

  } catch (error) {
    console.error('❌ Failed to create product with images:', error.message);
    throw error;
  }
}

// ============================================
// Example 10: React Component with Upload
// ============================================

const ProductImageUpload = ({ productId, onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [error, setError] = useState(null);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);

    // Validate file count
    if (files.length > 10) {
      setError('Maximum 10 files allowed');
      return;
    }

    // Validate file types and sizes
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        setError(`${file.name} is not an image`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError(`${file.name} is too large (max 10MB)`);
        return false;
      }
      return true;
    });

    setSelectedFiles(validFiles);
    setError(null);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one image');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('images', file);
      });
      formData.append('isPrimary', 'true');

      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:5000/api/v1/products/${productId}/images`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        }
      );

      const data = await response.json();

      if (data.success) {
        onUploadSuccess(data.data);
        setSelectedFiles([]);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="image-upload">
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileSelect}
        disabled={uploading}
      />

      {selectedFiles.length > 0 && (
        <div>
          <p>{selectedFiles.length} file(s) selected</p>
          <button onClick={handleUpload} disabled={uploading}>
            {uploading ? 'Uploading...' : 'Upload Images'}
          </button>
        </div>
      )}

      {error && <div className="error">{error}</div>}
      
    </div>
  );
};

// ============================================
// Example 11: Batch Operations
// ============================================

async function batchUpdateProductImages(products, token) {
  const results = [];

  for (const product of products) {
    try {
      // Upload images for each product
      const result = await uploadProductImages(
        product.id,
        product.imageFiles,
        token
      );

      results.push({
        productId: product.id,
        success: true,
        imageCount: result.data.uploadedImages.length
      });

      console.log(`✅ Product ${product.id}: ${result.data.uploadedImages.length} images uploaded`);

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      results.push({
        productId: product.id,
        success: false,
        error: error.message
      });

      console.error(`❌ Product ${product.id} failed:`, error.message);
    }
  }

  return results;
}

// ============================================
// Export Examples
// ============================================

module.exports = {
  uploadProductImages,
  uploadSingleImageBrowser,
  replaceAllProductImages,
  getProductImages,
  deleteProductImage,
  setPrimaryImage,
  reorderProductImages,
  updateImageAltText,
  createProductWithImages,
  batchUpdateProductImages
};