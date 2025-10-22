# Product Image Upload - Quick Reference Card

## 📋 API Endpoints

### Upload Images
```bash
POST /api/v1/products/:productId/images
Headers: Authorization: Bearer <token>
Content-Type: multipart/form-data
Body:
  - images (files, max 10)
  - replaceAll (optional, "true"/"false")
  - isPrimary (optional, "true"/"false")
```

### Get Images
```bash
GET /api/v1/products/:productId/images
No authentication required
```

### Delete Image
```bash
DELETE /api/v1/products/:productId/images/:imageId
Headers: Authorization: Bearer <token>
```

### Set Primary
```bash
PUT /api/v1/products/:productId/images/:imageId/primary
Headers: Authorization: Bearer <token>
```

### Update Order
```bash
PUT /api/v1/products/:productId/images/order
Headers: Authorization: Bearer <token>
Content-Type: application/json
Body: { "imageOrders": [{"imageId": 1, "sortOrder": 0}] }
```

### Update Alt Text
```bash
PUT /api/v1/products/:productId/images/:imageId/alt-text
Headers: Authorization: Bearer <token>
Content-Type: application/json
Body: { "altText": "Description" }
```

## 💻 Code Examples

### JavaScript (Browser)
```javascript
const formData = new FormData();
formData.append('images', file);
formData.append('isPrimary', 'true');

const response = await fetch(
  `http://localhost:5000/api/v1/products/${productId}/images`,
  {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  }
);
```

### cURL
```bash
curl -X POST http://localhost:5000/api/v1/products/1/images \
  -H "Authorization: Bearer TOKEN" \
  -F "images=@image1.jpg" \
  -F "images=@image2.jpg" \
  -F "isPrimary=true"
```

## ✅ Validation Rules

| Rule | Limit | Error |
|------|-------|-------|
| File types | JPEG, PNG, GIF, WebP, SVG | Invalid file type |
| Min size | 1KB | File too small |
| Max size | 10MB | File too large |
| Max count | 10 files | Too many files |

## 🔒 Authentication

All upload/delete operations require:
- JWT token in Authorization header
- Admin role

Public operations:
- GET images (no auth required)

## 📝 Response Format

### Success
```json
{
  "success": true,
  "message": "Successfully uploaded 2 image(s)",
  "data": {
    "uploadedImages": [...],
    "totalImages": 2
  }
}
```

### Error
```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Detail 1", "Detail 2"]
}
```

## 🎯 Common Operations

### Upload first images
```javascript
formData.append('isPrimary', 'true');
```

### Add more images
```javascript
formData.append('replaceAll', 'false');
```

### Replace all images
```javascript
formData.append('replaceAll', 'true');
```

### Get primary image
```javascript
const images = await getProductImages(productId);
const primary = images.find(img => img.isPrimary);
```

## 🐛 Troubleshooting

| Problem | Check |
|---------|-------|
| Upload fails | Auth token, file type, file size |
| Image not showing | Cloudinary config, URL format |
| Validation error | File type, size, count |
| Auth error | Token expired, not admin |

## 📚 Documentation

- Full guide: `IMAGE_UPLOAD_GUIDE.md`
- Examples: `examples/imageUploadExamples.js`
- Summary: `IMAGE_UPLOAD_SUMMARY.md`

## 🔗 Files

```
controllers/productImageController.js    - 7 functions
middleware/imageValidation.js           - Validation
routes/productImages.js                 - 8 endpoints
```

---

**Version**: 1.0.0 | **Status**: Production Ready ✅