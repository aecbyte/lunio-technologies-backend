# Product Images Database Schema

## Overview

The product image system uses the existing `product_images` table in the database. **No migration is needed** as the table already exists and has all required columns.

## Table Schema

### `product_images` Table

```sql
CREATE TABLE IF NOT EXISTS product_images (
  id INT PRIMARY KEY AUTO_INCREMENT,
  productId INT NOT NULL,
  imageUrl VARCHAR(500) NOT NULL,
  publicId VARCHAR(255),
  altText VARCHAR(255),
  sortOrder INT DEFAULT 0,
  isPrimary BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
);
```

### Column Descriptions

| Column | Type | Description | Required | Default |
|--------|------|-------------|----------|---------|
| `id` | INT | Primary key, auto-increment | Yes | AUTO |
| `productId` | INT | Foreign key to products table | Yes | - |
| `imageUrl` | VARCHAR(500) | Cloudinary secure URL | Yes | - |
| `publicId` | VARCHAR(255) | Cloudinary public ID for deletion | No | NULL |
| `altText` | VARCHAR(255) | Alternative text for accessibility | No | NULL |
| `sortOrder` | INT | Display order of images | No | 0 |
| `isPrimary` | BOOLEAN | Whether this is the main image | No | FALSE |
| `createdAt` | TIMESTAMP | Creation timestamp | No | NOW() |

### Indexes

```sql
-- Foreign key index (automatically created)
INDEX idx_productId (productId)

-- Primary image lookup optimization (recommended)
CREATE INDEX idx_product_primary ON product_images(productId, isPrimary);

-- Sort order optimization (recommended)
CREATE INDEX idx_product_sort ON product_images(productId, sortOrder);
```

### Constraints

1. **Foreign Key Constraint**
   - `productId` references `products(id)`
   - `ON DELETE CASCADE` - Images are deleted when product is deleted

2. **Business Logic Constraints** (Enforced in application)
   - Only one image per product can have `isPrimary = TRUE`
   - Max 10 images per product (enforced in API)
   - Image URLs must be valid HTTPS URLs
   - `publicId` should match Cloudinary format

## Relationships

```
products (1) ────── (N) product_images

One product can have multiple images
Each image belongs to one product
```

## Data Flow

### Upload Process

```
1. Image file uploaded to server
2. File validated (type, size, etc.)
3. File uploaded to Cloudinary
4. Cloudinary returns:
   - secure_url → stored in imageUrl
   - public_id → stored in publicId
5. Record inserted into product_images table
6. Temporary file deleted from server
```

### Delete Process

```
1. Get image record from database
2. Extract publicId
3. Delete from Cloudinary using publicId
4. Delete record from database
5. If primary image deleted:
   - Next image (by sortOrder) becomes primary
```

## Example Records

```sql
-- Product 1 with 3 images
INSERT INTO product_images VALUES
(1, 1, 'https://res.cloudinary.com/demo/image/upload/v1/products/1/img1.jpg', 'products/1/img1', 'Front view', 0, TRUE, NOW()),
(2, 1, 'https://res.cloudinary.com/demo/image/upload/v1/products/1/img2.jpg', 'products/1/img2', 'Side view', 1, FALSE, NOW()),
(3, 1, 'https://res.cloudinary.com/demo/image/upload/v1/products/1/img3.jpg', 'products/1/img3', 'Back view', 2, FALSE, NOW());
```

## Queries Used by System

### Get All Images for Product
```sql
SELECT *
FROM product_images
WHERE productId = ?
ORDER BY isPrimary DESC, sortOrder ASC;
```

### Get Primary Image
```sql
SELECT *
FROM product_images
WHERE productId = ? AND isPrimary = TRUE
LIMIT 1;
```

### Insert New Image
```sql
INSERT INTO product_images
(productId, imageUrl, publicId, altText, sortOrder, isPrimary)
VALUES (?, ?, ?, ?, ?, ?);
```

### Set Primary Image
```sql
-- Unset current primary
UPDATE product_images
SET isPrimary = FALSE
WHERE productId = ?;

-- Set new primary
UPDATE product_images
SET isPrimary = TRUE
WHERE id = ?;
```

### Update Sort Order
```sql
UPDATE product_images
SET sortOrder = ?
WHERE id = ? AND productId = ?;
```

### Delete Image
```sql
DELETE FROM product_images
WHERE id = ? AND productId = ?;
```

### Delete All Product Images
```sql
DELETE FROM product_images
WHERE productId = ?;
```

## Performance Considerations

### Recommended Indexes

```sql
-- For primary image lookup
CREATE INDEX idx_product_primary
ON product_images(productId, isPrimary);

-- For sorted image retrieval
CREATE INDEX idx_product_sort
ON product_images(productId, sortOrder);

-- For Cloudinary ID lookup
CREATE INDEX idx_public_id
ON product_images(publicId);
```

### Query Optimization

1. **Use indexed columns in WHERE clause**
   - Always filter by `productId` first
   - Use `isPrimary` for primary image lookups

2. **Limit result sets**
   - Most queries need all images per product
   - Use `LIMIT` when fetching single image

3. **Batch operations**
   - Delete multiple images in single transaction
   - Update sort orders in batch

## Data Validation

### Application-Level Validation

1. **imageUrl**
   - Must start with `https://`
   - Must be valid Cloudinary URL format
   - Max length: 500 characters

2. **publicId**
   - Should match pattern: `folder/subfolder/filename`
   - Used for Cloudinary deletion
   - Max length: 255 characters

3. **altText**
   - Optional but recommended
   - Max length: 255 characters
   - Should describe the image content

4. **sortOrder**
   - Non-negative integer
   - Unique per product (recommended)
   - Sequential (0, 1, 2, ...)

5. **isPrimary**
   - Only one TRUE per product
   - Automatically managed by application

## Migration Notes

### Existing Table

The `product_images` table already exists in your database with all required columns. **No migration is needed.**

### If Starting Fresh

If you need to create the table (e.g., new database):

```sql
CREATE TABLE IF NOT EXISTS product_images (
  id INT PRIMARY KEY AUTO_INCREMENT,
  productId INT NOT NULL,
  imageUrl VARCHAR(500) NOT NULL,
  publicId VARCHAR(255),
  altText VARCHAR(255),
  sortOrder INT DEFAULT 0,
  isPrimary BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_productId (productId),
  INDEX idx_product_primary (productId, isPrimary),
  INDEX idx_product_sort (productId, sortOrder)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Adding Indexes (Optional)

If the recommended indexes don't exist:

```sql
-- Check existing indexes
SHOW INDEXES FROM product_images;

-- Add if missing
CREATE INDEX idx_product_primary ON product_images(productId, isPrimary);
CREATE INDEX idx_product_sort ON product_images(productId, sortOrder);
CREATE INDEX idx_public_id ON product_images(publicId);
```

## Data Integrity Rules

### Enforced by Database
- Foreign key constraint (productId)
- Primary key uniqueness (id)
- NOT NULL constraints (productId, imageUrl)
- CASCADE delete on product deletion

### Enforced by Application
- Only one primary image per product
- Max 10 images per product
- Valid Cloudinary URLs
- Sequential sort orders
- Proper publicId format

## Backup Recommendations

### Before Bulk Operations

```sql
-- Backup all images for a product
CREATE TABLE product_images_backup AS
SELECT * FROM product_images WHERE productId = ?;
```

### Full Table Backup

```sql
-- Backup entire table
CREATE TABLE product_images_backup AS
SELECT * FROM product_images;

-- Or use mysqldump
mysqldump -u user -p database product_images > product_images_backup.sql
```

## Troubleshooting

### Common Issues

1. **Orphaned Images**
   ```sql
   -- Find images without products
   SELECT pi.*
   FROM product_images pi
   LEFT JOIN products p ON pi.productId = p.id
   WHERE p.id IS NULL;
   ```

2. **Multiple Primary Images**
   ```sql
   -- Find products with multiple primary images
   SELECT productId, COUNT(*) as primary_count
   FROM product_images
   WHERE isPrimary = TRUE
   GROUP BY productId
   HAVING COUNT(*) > 1;
   ```

3. **Images Without publicId**
   ```sql
   -- Find images missing Cloudinary ID
   SELECT *
   FROM product_images
   WHERE publicId IS NULL OR publicId = '';
   ```

4. **Duplicate Sort Orders**
   ```sql
   -- Find duplicate sort orders per product
   SELECT productId, sortOrder, COUNT(*) as count
   FROM product_images
   GROUP BY productId, sortOrder
   HAVING COUNT(*) > 1;
   ```

## Statistics Queries

### Image Count per Product

```sql
SELECT
  p.id as product_id,
  p.name as product_name,
  COUNT(pi.id) as image_count
FROM products p
LEFT JOIN product_images pi ON p.id = pi.productId
GROUP BY p.id, p.name
ORDER BY image_count DESC;
```

### Products Without Images

```sql
SELECT p.*
FROM products p
LEFT JOIN product_images pi ON p.id = pi.productId
WHERE pi.id IS NULL;
```

### Average Images per Product

```sql
SELECT AVG(image_count) as avg_images
FROM (
  SELECT productId, COUNT(*) as image_count
  FROM product_images
  GROUP BY productId
) as counts;
```

---

**Schema Status**: ✅ Already Exists
**Migration Required**: ❌ No
**Indexes Recommended**: ✅ Yes (see above)
**Version**: 1.0.0