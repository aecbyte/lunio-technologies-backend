# Product Image Upload System - Complete Guide

## Overview

This guide covers the comprehensive image upload system for product management in the e-commerce platform. The system uses Cloudinary for image storage and MySQL for metadata management.

## Features

✅ **Multiple Image Upload** - Upload up to 10 images at once
✅ **Single Image Upload** - Add one image at a time
✅ **Replace or Append** - Choose to replace all images or add to existing ones
✅ **Primary Image** - Set a primary image for product display
✅ **Image Ordering** - Control the display order of images
✅ **Alt Text** - Add accessibility text to images
✅ **Image Validation** - Automatic validation of file type, size, and dimensions
✅ **Cloudinary Integration** - Automatic upload to cloud storage
✅ **Automatic Cleanup** - Temporary files are automatically deleted

## Database Schema

The system uses the existing `product_images` table:

```sql
CREATE TABLE product_images (
  id INT PRIMARY KEY AUTO_INCREMENT,
  productId INT NOT NULL,
  imageUrl VARCHAR(500) NOT NULL,
  publicId VARCHAR(255),           -- Cloudinary public ID
  altText VARCHAR(255),
  sortOrder INT DEFAULT 0,
  isPrimary BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
);
```

## API Endpoints

### 1. Upload Product Images

**POST** `/api/v1/products/:productId/images`

Upload one or multiple images to a product.

**Authentication**: Required (Admin only)

**Content-Type**: `multipart/form-data`

**Parameters**:
- `productId` (path) - ID of the product
- `replaceAll` (form) - `"true"` to replace all existing images, `"false"` to append (default: `"false"`)
- `isPrimary` (form) - `"true"` to set first uploaded image as primary (default: `"false"`)
- `images` (files) - Array of image files (max 10)

**Example Request (cURL)**:
```bash
curl -X POST http://localhost:5000/api/v1/products/1/images \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "images=@image1.jpg" \
  -F "images=@image2.jpg" \
  -F "replaceAll=false" \
  -F "isPrimary=true"
```

**Example Request (JavaScript)**:
```javascript
const formData = new FormData();
formData.append('images', file1);
formData.append('images', file2);
formData.append('replaceAll', 'false');
formData.append('isPrimary', 'true');

const response = await fetch(`http://localhost:5000/api/v1/products/${productId}/images`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const data = await response.json();
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Successfully uploaded 2 image(s)",
  "data": {
    "product": {
      "id": 1,
      "name": "Product Name",
      "images": [
        {
          "id": 1,
          "imageUrl": "https://res.cloudinary.com/.../image1.jpg",
          "publicId": "products/1/abc123",
          "isPrimary": true,
          "sortOrder": 0,
          "altText": "Product Name"
        },
        {
          "id": 2,
          "imageUrl": "https://res.cloudinary.com/.../image2.jpg",
          "publicId": "products/1/def456",
          "isPrimary": false,
          "sortOrder": 1,
          "altText": "Product Name"
        }
      ]
    },
    "uploadedImages": [
      {
        "id": 1,
        "imageUrl": "https://res.cloudinary.com/.../image1.jpg",
        "publicId": "products/1/abc123",
        "isPrimary": true,
        "sortOrder": 0
      },
      {
        "id": 2,
        "imageUrl": "https://res.cloudinary.com/.../image2.jpg",
        "publicId": "products/1/def456",
        "isPrimary": false,
        "sortOrder": 1
      }
    ],
    "totalImages": 2
  }
}
```

**Error Responses**:

- **404 Not Found** - Product doesn't exist
```json
{
  "success": false,
  "message": "Product not found"
}
```

- **400 Bad Request** - No images provided
```json
{
  "success": false,
  "message": "No images provided. Please upload at least one image."
}
```

- **400 Bad Request** - Validation failed
```json
{
  "success": false,
  "message": "Image validation failed",
  "errors": [
    "File 1 (image.txt): Invalid file type: text/plain. Allowed types: JPEG, PNG, GIF, WebP, SVG",
    "File 2 (large.jpg): File too large: 12.50MB. Maximum size: 10MB"
  ]
}
```

---

### 2. Get Product Images

**GET** `/api/v1/products/:productId/images`

Retrieve all images for a product.

**Authentication**: Public

**Example Request**:
```bash
curl http://localhost:5000/api/v1/products/1/images
```

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "productId": 1,
    "productName": "Product Name",
    "images": [
      {
        "id": 1,
        "imageUrl": "https://res.cloudinary.com/.../image1.jpg",
        "publicId": "products/1/abc123",
        "altText": "Product Name",
        "sortOrder": 0,
        "isPrimary": true,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "totalImages": 1
  }
}
```

---

### 3. Delete Product Image

**DELETE** `/api/v1/products/:productId/images/:imageId`

Delete a specific image from a product.

**Authentication**: Required (Admin only)

**Example Request**:
```bash
curl -X DELETE http://localhost:5000/api/v1/products/1/images/5 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Image deleted successfully",
  "data": {
    "deletedImageId": 5
  }
}
```

---

### 4. Delete All Product Images

**DELETE** `/api/v1/products/:productId/images`

Delete all images for a product.

**Authentication**: Required (Admin only)

**Example Request**:
```bash
curl -X DELETE http://localhost:5000/api/v1/products/1/images \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Successfully deleted 3 image(s)",
  "data": {
    "deletedCount": 3
  }
}
```

---

### 5. Set Primary Image

**PUT** `/api/v1/products/:productId/images/:imageId/primary`

Set an image as the primary image for a product.

**Authentication**: Required (Admin only)

**Example Request**:
```bash
curl -X PUT http://localhost:5000/api/v1/products/1/images/3/primary \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Primary image updated successfully",
  "data": {
    "imageId": 3
  }
}
```

---

### 6. Update Image Order

**PUT** `/api/v1/products/:productId/images/order`

Update the display order of images.

**Authentication**: Required (Admin only)

**Request Body**:
```json
{
  "imageOrders": [
    { "imageId": 1, "sortOrder": 2 },
    { "imageId": 2, "sortOrder": 0 },
    { "imageId": 3, "sortOrder": 1 }
  ]
}
```

**Example Request**:
```bash
curl -X PUT http://localhost:5000/api/v1/products/1/images/order \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "imageOrders": [
      {"imageId": 1, "sortOrder": 2},
      {"imageId": 2, "sortOrder": 0},
      {"imageId": 3, "sortOrder": 1}
    ]
  }'
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Image order updated successfully",
  "data": {
    "images": [
      {
        "id": 2,
        "imageUrl": "https://res.cloudinary.com/.../image2.jpg",
        "sortOrder": 0,
        "isPrimary": true
      },
      {
        "id": 3,
        "imageUrl": "https://res.cloudinary.com/.../image3.jpg",
        "sortOrder": 1,
        "isPrimary": false
      },
      {
        "id": 1,
        "imageUrl": "https://res.cloudinary.com/.../image1.jpg",
        "sortOrder": 2,
        "isPrimary": false
      }
    ]
  }
}
```

---

### 7. Update Image Alt Text

**PUT** `/api/v1/products/:productId/images/:imageId/alt-text`

Update the alt text for an image (for accessibility).

**Authentication**: Required (Admin only)

**Request Body**:
```json
{
  "altText": "Front view of blue smartphone"
}
```

**Example Request**:
```bash
curl -X PUT http://localhost:5000/api/v1/products/1/images/3/alt-text \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"altText": "Front view of blue smartphone"}'
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Alt text updated successfully",
  "data": {
    "imageId": 3,
    "altText": "Front view of blue smartphone"
  }
}
```

## Validation Rules

### File Type Validation
Allowed image types:
- `image/jpeg` (.jpg, .jpeg)
- `image/png` (.png)
- `image/gif` (.gif)
- `image/webp` (.webp)
- `image/svg+xml` (.svg)

### File Size Validation
- **Minimum size**: 1KB (prevents empty files)
- **Maximum size**: 10MB per file
- **Maximum files**: 10 files per upload

### Other Validations
- Product must exist before uploading images
- Image ID must belong to the specified product
- Alt text must not be empty when updating

## Image Processing

All uploaded images are automatically:
1. **Uploaded to Cloudinary** in the `products/{productId}` folder
2. **Optimized** with automatic quality adjustment
3. **Resized** to a maximum of 800x600 pixels (maintains aspect ratio)
4. **Converted** to WebP format automatically (if browser supports it)
5. **Stored** with secure HTTPS URLs

## Usage Examples

### Example 1: Upload First Images to a New Product

```javascript
// After creating a product, upload its first images
const productId = 123;
const formData = new FormData();

// Add multiple images
document.getElementById('imageInput').files.forEach(file => {
  formData.append('images', file);
});

// Set first image as primary
formData.append('isPrimary', 'true');

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

const result = await response.json();
console.log(`Uploaded ${result.data.uploadedImages.length} images`);
```

### Example 2: Add More Images to Existing Product

```javascript
// Add additional images without replacing existing ones
const formData = new FormData();
formData.append('images', newFile);
formData.append('replaceAll', 'false'); // Keep existing images

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
```

### Example 3: Replace All Product Images

```javascript
// Replace all existing images with new ones
const formData = new FormData();
newFiles.forEach(file => {
  formData.append('images', file);
});
formData.append('replaceAll', 'true'); // Delete old images
formData.append('isPrimary', 'true'); // Set first as primary

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
```

### Example 4: Reorder Images

```javascript
// Change the display order of images
const newOrder = [
  { imageId: 5, sortOrder: 0 },  // Show image 5 first
  { imageId: 3, sortOrder: 1 },  // Show image 3 second
  { imageId: 7, sortOrder: 2 }   // Show image 7 third
];

const response = await fetch(
  `http://localhost:5000/api/v1/products/${productId}/images/order`,
  {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ imageOrders: newOrder })
  }
);
```

## Error Handling

### Common Errors and Solutions

**Error**: "Only image files are allowed!"
- **Cause**: Uploaded file is not an image
- **Solution**: Only upload JPEG, PNG, GIF, WebP, or SVG files

**Error**: "File too large. Maximum size is 10MB."
- **Cause**: Image file exceeds 10MB
- **Solution**: Compress the image before uploading

**Error**: "Too many files. Maximum is 10 files."
- **Cause**: More than 10 files uploaded at once
- **Solution**: Upload in batches of 10 or fewer

**Error**: "Product not found"
- **Cause**: Product ID doesn't exist
- **Solution**: Verify the product ID is correct

**Error**: "Failed to upload images to cloud storage"
- **Cause**: Cloudinary configuration issue or network error
- **Solution**: Check Cloudinary credentials in .env file

## Best Practices

1. **Always set a primary image** - Use `isPrimary=true` for the first upload
2. **Use descriptive alt text** - Improves SEO and accessibility
3. **Optimize images before upload** - Reduces upload time and storage costs
4. **Use consistent naming** - Helps with organization
5. **Delete unused images** - Saves storage space and costs
6. **Test uploads** - Verify images display correctly after upload
7. **Handle errors gracefully** - Show user-friendly error messages
8. **Use loading states** - Show progress during upload

## Cloudinary Configuration

Ensure these environment variables are set in `.env`:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Security Considerations

1. **Authentication Required** - All upload/delete operations require admin authentication
2. **File Type Validation** - Only image files are accepted
3. **File Size Limits** - Prevents abuse and excessive storage usage
4. **Secure URLs** - All images use HTTPS
5. **Public IDs** - Cloudinary public IDs are stored for deletion
6. **Temporary File Cleanup** - Uploaded files are deleted from server after processing

## Performance Tips

1. **Batch Uploads** - Upload multiple images at once instead of one by one
2. **Lazy Loading** - Load images on demand in the frontend
3. **Responsive Images** - Use Cloudinary transformations for different sizes
4. **CDN Delivery** - Images are automatically delivered via Cloudinary's CDN
5. **Caching** - Enable browser caching for faster subsequent loads

## Troubleshooting

### Images not uploading?
1. Check Cloudinary credentials in .env
2. Verify upload folder permissions (uploads/temp/)
3. Check file size and type
4. Review server logs for errors

### Images not displaying?
1. Check imageUrl in database
2. Verify Cloudinary public ID
3. Test URL in browser
4. Check CORS settings

### Primary image not working?
1. Only one image can be primary per product
2. Use the set primary endpoint to change
3. First uploaded image is primary by default

---

**Version**: 1.0.0
**Last Updated**: January 2024
**Author**: Backend Development Team