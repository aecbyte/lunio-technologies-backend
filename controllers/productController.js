const { pool } = require('../config/database');
const { uploadMultipleImages, deleteImage } = require('../config/cloudinary');
const fs = require('fs').promises;

// Get all products with pagination and filters
const getProducts = async (req, res) => {
  try {
    // --- Parse & sanitize query params ---
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limitRaw = parseInt(req.query.limit, 10) || 10;
    const limit = Number.isFinite(limitRaw) ? Math.max(limitRaw, 1) : 10;
    const offsetRaw = (page - 1) * limit;
    const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;

    const search = (req.query.search || '').trim();
    const category = (req.query.category || '').trim();
    const status = (req.query.status || '').trim();
    const featuredRaw = req.query.featured;
    const productType = (req.query.productType || '').trim();
    const brand = (req.query.brand || '').trim();
    const minPriceRaw = req.query.minPrice;
    const maxPriceRaw = req.query.maxPrice;
    const sortByRaw = (req.query.sortBy || 'createdAt').trim();
    const sortOrderRaw = (req.query.sortOrder || 'DESC').trim();

    // --- Validate sorting (prevent injection) ---
    const validSortColumns = new Set(['createdAt', 'price', 'name', 'stockQuantity']);
    const validSortBy = validSortColumns.has(sortByRaw) ? sortByRaw : 'createdAt';
    const validSortOrder = (sortOrderRaw.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';

    // --- Build where conditions & params ---
    const whereParts = [];
    const params = [];

    if (search) {
      whereParts.push('(p.name LIKE ? OR p.sku LIKE ? OR p.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (category) {
      whereParts.push('p.categoryId = ?');
      params.push(category);
    }

    if (status) {
      whereParts.push('p.status = ?');
      params.push(status);
    }

    if (typeof featuredRaw !== 'undefined' && featuredRaw !== null && featuredRaw !== '') {
      const featured = (featuredRaw === 'true' || featuredRaw === '1' || featuredRaw === 1) ? 1 : 0;
      whereParts.push('p.featured = ?');
      params.push(featured);
    }

    if (productType) {
      whereParts.push('p.productType = ?');
      params.push(productType);
    }

    if (brand) {
      whereParts.push('p.brand = ?');
      params.push(brand);
    }

    const minPrice = (typeof minPriceRaw !== 'undefined' && minPriceRaw !== null && minPriceRaw !== '')
      ? parseFloat(minPriceRaw)
      : undefined;
    const maxPrice = (typeof maxPriceRaw !== 'undefined' && maxPriceRaw !== null && maxPriceRaw !== '')
      ? parseFloat(maxPriceRaw)
      : undefined;

    if (typeof minPrice !== 'undefined' && Number.isFinite(minPrice)) {
      whereParts.push('p.price >= ?');
      params.push(minPrice);
    }

    if (typeof maxPrice !== 'undefined' && Number.isFinite(maxPrice)) {
      whereParts.push('p.price <= ?');
      params.push(maxPrice);
    }

    const whereClause = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

    // --- COUNT query (use shallow copy of params) ---
    const countSql = `SELECT COUNT(*) as total FROM products p ${whereClause}`;
    const countParams = [...params];
    const [countRows] = await pool.execute(countSql, countParams);
    const total = Array.isArray(countRows) && countRows.length ? Number(countRows[0].total) : 0;

    // --- Main products query ---
    const baseSelect = `
      SELECT
        p.*,
        c.name AS categoryName,
        pi.imageUrl AS primaryImage
      FROM products p
      LEFT JOIN categories c ON p.categoryId = c.id
      LEFT JOIN product_images pi ON p.id = pi.productId AND pi.isPrimary = 1
      ${whereClause}
      ORDER BY p.${validSortBy} ${validSortOrder}
    `;

    // Prepare params for prepared-statement style
    const productParams = [...params, limit, offset];

    // Clean productParams: remove undefined/null and ensure numeric types for limit/offset
    const cleanedProductParams = productParams.map((v, idx) => {
      // last two params must be numbers
      if (idx >= productParams.length - 2) {
        // ensure integers for LIMIT/OFFSET
        return Number.isFinite(Number(v)) ? Number(v) : (idx === productParams.length - 2 ? limit : offset);
      }
      return v;
    }).filter(v => !(typeof v === 'undefined' || v === null));

    const productSqlWithPlaceholders = `${baseSelect} LIMIT ? OFFSET ?`;

    // Debug log before execute: show SQL and each param with type

    let products;
    try {
      const [rows] = await pool.execute(productSqlWithPlaceholders, cleanedProductParams);
      products = rows;
    } catch (mainErr) {
      // If prepared-statement with ? for LIMIT/OFFSET fails in this environment, fall back to inlined numeric LIMIT/OFFSET
      console.error('[getProducts] Prepared statement failed, error:', mainErr && mainErr.message);
      console.warn('[getProducts] Falling back to inlined LIMIT/OFFSET (sanitized integers)');

      // Safe inline — we only inject integers (no user content)
      const safeLimit = Number.isFinite(Number(limit)) ? Number(limit) : 10;
      const safeOffset = Number.isFinite(Number(offset)) ? Number(offset) : 0;
      const productSqlInline = `${baseSelect} LIMIT ${safeLimit} OFFSET ${safeOffset}`;

      // Still use params for WHERE clause only
      const whereOnlyParams = [...params].filter(v => !(typeof v === 'undefined' || v === null));

      const [rowsRetry] = await pool.execute(productSqlInline, whereOnlyParams);
      products = rowsRetry;
    }

    // --- If no products, respond with pagination ---
    if (!products || products.length === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      });
    }

    // --- Fetch images for all returned products in one query ---
    const productIds = products.map(p => p.id);
    if (productIds.length > 0) {
      const placeholders = productIds.map(() => '?').join(',');
      const [allImages] = await pool.execute(
        `SELECT * FROM product_images WHERE productId IN (${placeholders}) ORDER BY productId, sortOrder, id`,
        productIds
      );

      const imagesByProduct = allImages.reduce((acc, img) => {
        (acc[img.productId] = acc[img.productId] || []).push(img);
        return acc;
      }, {});

      const productsWithImages = products.map(prod => ({
        ...prod,
        images: imagesByProduct[prod.id] || []
      }));

      return res.json({
        success: true,
        data: productsWithImages,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      });
    }

    // fallback (shouldn't happen)
    return res.json({
      success: true,
      data: products,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).json({ success: false, message: 'Server error while fetching products' });
  }
};


// Get single product
const getProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Get main product details
    const [products] = await pool.execute(
      `SELECT
        p.*,
        c.name as categoryName
      FROM products p
      LEFT JOIN categories c ON p.categoryId = c.id
      WHERE p.id = ?`,
      [id]
    );

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const product = products[0];

    // Get product images
    const [images] = await pool.execute(
      'SELECT * FROM product_images WHERE productId = ? ORDER BY sortOrder, id',
      [id]
    );
    product.images = images;

    // ✅ Get product attributes (the definitions: Size, Color, etc.)
    const [attributes] = await pool.execute(
      'SELECT * FROM product_attributes WHERE productId = ?',
      [id]
    );

    // Parse the values field from JSON string to array
    product.attributes = attributes.map(attr => ({
      id: attr.id,
      name: attr.name,
      values: JSON.parse(attr.value || '[]'), // Parse JSON array
      displayOrder: attr.displayOrder
    }));

    // ✅ Get product variants (if product has variants)
    if (product.hasVariants) {
      const [variants] = await pool.execute(
        `SELECT * FROM product_variants 
         WHERE productId = ? 
         ORDER BY id`,
        [id]
      );

      // For each variant, get its specific attribute values
      for (let i = 0; i < variants.length; i++) {
        const variant = variants[i];

        const [variantAttrs] = await pool.execute(
          `SELECT attributeName as name, attributeValue as value 
           FROM variant_attributes 
           WHERE variantId = ?`,
          [variant.id]
        );

        variant.attributes = variantAttrs;
      }

      product.variants = variants;
    } else {
      product.variants = [];
    }

    // ✅ Parse JSON fields if they exist
    try {
      if (product.description && typeof product.description === 'string') {
        product.description = JSON.parse(product.description);
      }
    } catch (e) {
      // Keep as string if parsing fails
    }

    try {
      if (product.dimensions && typeof product.dimensions === 'string') {
        product.dimensions = JSON.parse(product.dimensions);
      }
    } catch (e) {
      // Keep as string if parsing fails
    }

    res.json({
      success: true,
      data: product
    });

  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching product'
    });
  }
};

// Create product
const createProduct = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const {
      name,
      slug,
      sku,
      description,
      shortDescription,
      categoryId,
      brand,
      price,
      salePrice,
      stockQuantity,
      stockStatus,
      weight,
      dimensions,
      status,
      featured,
      visibility,
      metaTitle,
      metaDescription
    } = req.body;

    // Parse JSON fields
    const attributes = req.body.attributes ? JSON.parse(req.body.attributes) : [];
    const variants = req.body.variants ? JSON.parse(req.body.variants) : [];

    // Check if SKU already exists
    const [existingSku] = await connection.execute(
      'SELECT id FROM products WHERE sku = ?',
      [sku]
    );

    if (existingSku.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Product with this SKU already exists'
      });
    }

    // Insert product
    const hasVariants = variants.length > 0;
    const [result] = await connection.execute(
      `INSERT INTO products (
    name, slug, sku, description, shortDescription, categoryId, brand,
    price, salePrice, stockQuantity, stockStatus, weight, dimensions,
    status, featured, visibility, metaTitle, metaDescription, hasVariants
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        slug,
        sku,
        description,
        shortDescription,
        categoryId,
        brand,
        price,
        salePrice,
        stockQuantity,
        stockStatus,
        // Fix: Handle empty weight.value properly
        (weight && weight.value && weight.value !== '') ? weight.value : null,
        dimensions,
        status,
        featured ? 1 : 0,
        visibility,
        metaTitle,
        metaDescription,
        hasVariants
      ]
    );

    const productId = result.insertId;

    // Handle image uploads
    if (req.files && req.files.length > 0) {
      try {
        const uploadedImages = await uploadMultipleImages(req.files, 'products');

        for (let i = 0; i < uploadedImages.length; i++) {
          const image = uploadedImages[i];
          await connection.execute(
            'INSERT INTO product_images (productId, imageUrl, publicId, isPrimary, sortOrder) VALUES (?, ?, ?, ?, ?)',
            [productId, image.url, image.public_id, i === 0 ? 1 : 0, i]
          );
        }

        // Clean up temporary files
        for (const file of req.files) {
          try {
            await fs.unlink(file.path);
          } catch (unlinkError) {
            console.error('Error deleting temp file:', unlinkError);
          }
        }
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        // Continue without failing the product creation
      }
    }

    // ✅ Handle product attributes (definitions)
    if (attributes && Array.isArray(attributes) && attributes.length > 0) {
      for (let i = 0; i < attributes.length; i++) {
        const attr = attributes[i];
        if (attr.name && attr.values && Array.isArray(attr.values)) {
          await connection.execute(
            `INSERT INTO product_attributes (productId, name, values, displayOrder) 
             VALUES (?, ?, ?, ?)`,
            [productId, attr.name, JSON.stringify(attr.values), i]
          );
        }
      }
    }

    // ✅ Handle variants
    if (variants && Array.isArray(variants) && variants.length > 0) {
      for (const variant of variants) {
        if (!variant.enabled) continue; // Skip disabled variants

        // Check if variant SKU already exists
        const [existingVariantSku] = await connection.execute(
          'SELECT id FROM product_variants WHERE sku = ?',
          [variant.sku]
        );

        if (existingVariantSku.length > 0) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: `Variant SKU ${variant.sku} already exists`
          });
        }

        // Insert variant
        const [variantResult] = await connection.execute(
          `INSERT INTO product_variants 
           (productId, sku, price, salePrice, stockQuantity, enabled) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            productId,
            variant.sku,
            variant.price || price,
            variant.salePrice || salePrice,
            variant.stock || 0,
            variant.enabled ? 1 : 0
          ]
        );

        const variantId = variantResult.insertId;

        // Insert variant attributes
        if (variant.attributes && Array.isArray(variant.attributes)) {
          for (const attr of variant.attributes) {
            await connection.execute(
              `INSERT INTO variant_attributes 
               (variantId, attributeName, attributeValue) 
               VALUES (?, ?, ?)`,
              [variantId, attr.name, attr.value]
            );
          }
        }
      }
    }

    await connection.commit();

    // Get the created product with all details
    const [newProduct] = await connection.execute(
      `SELECT 
        p.*,
        c.name as categoryName
      FROM products p
      LEFT JOIN categories c ON p.categoryId = c.id
      WHERE p.id = ?`,
      [productId]
    );

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: newProduct[0]
    });

  } catch (error) {
    await connection.rollback();
    console.error('Create product error:', error);

    // Clean up uploaded files on error
    if (req.files) {
      for (const file of req.files) {
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          console.error('Error deleting temp file:', unlinkError);
        }
      }
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating product'
    });
  } finally {
    connection.release();
  }
};

// Update product
const updateProduct = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const updateFields = req.body;

    // Check if product exists and get current data
    const [existingProduct] = await connection.execute(
      'SELECT * FROM products WHERE id = ?',
      [id]
    );

    if (existingProduct.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Build dynamic UPDATE query for only provided fields
    const allowedFields = [
      'name', 'sku', 'description', 'shortDescription', 'categoryId',
      'brand', 'price', 'salePrice', 'stockQuantity', 'stockStatus',
      'weight', 'dimensions', 'status', 'featured', 'visibility',
      'metaTitle', 'metaDescription'
    ];

    const updates = [];
    const values = [];

    // Only include fields that are actually provided
    for (const field of allowedFields) {
      if (updateFields[field] !== undefined) {
        updates.push(`${field} = ?`);

        // Special handling for featured boolean
        if (field === 'featured') {
          values.push(updateFields[field] === true || updateFields[field] === 'true' || updateFields[field] === 1 ? 1 : 0);
        } else if (field === 'weight') {
          let weightValue = null;

          if (typeof updateFields[field] === 'object') {
            const rawValue = updateFields[field]?.value;
            weightValue =
              rawValue !== undefined && rawValue !== '' && !isNaN(rawValue)
                ? parseFloat(rawValue)
                : null;
          } else if (
            updateFields[field] !== undefined &&
            updateFields[field] !== '' &&
            !isNaN(updateFields[field])
          ) {
            weightValue = parseFloat(updateFields[field]);
          }

          values.push(weightValue);
        } else {
          values.push(updateFields[field]);
        }
      }
    }

    // Handle slug generation if name is being updated
    if (updateFields.name) {
      const slug = updateFields.name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      // Check slug uniqueness
      const [existingSlug] = await connection.execute(
        'SELECT id FROM products WHERE slug = ? AND id != ?',
        [slug, id]
      );

      if (existingSlug.length > 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'Product with similar name already exists'
        });
      }

      updates.push('slug = ?');
      values.push(slug);
    }

    // Check SKU uniqueness if being updated
    if (updateFields.sku) {
      const [existingSku] = await connection.execute(
        'SELECT id FROM products WHERE sku = ? AND id != ?',
        [updateFields.sku, id]
      );

      if (existingSku.length > 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'Product with this SKU already exists'
        });
      }
    }

    // Always update timestamp
    updates.push('updatedAt = CURRENT_TIMESTAMP');
    values.push(id);

    // Execute update only if there are fields to update
    if (updates.length > 1) { // > 1 because updatedAt is always included
      const query = `UPDATE products SET ${updates.join(', ')} WHERE id = ?`;
      await connection.execute(query, values);
    }

    // Handle image removal (only if removeImages is provided)
    if (updateFields.removeImages) {
      // Parse if it's a JSON string
      let imagesToRemove = updateFields.removeImages;
      if (typeof imagesToRemove === 'string') {
        try {
          imagesToRemove = JSON.parse(imagesToRemove);
        } catch (e) {
          imagesToRemove = [];
        }
      }

      if (Array.isArray(imagesToRemove)) {
        for (const imageId of imagesToRemove) {
          const [imageToDelete] = await connection.execute(
            'SELECT publicId FROM product_images WHERE id = ? AND productId = ?',
            [imageId, id]
          );

          if (imageToDelete.length > 0 && imageToDelete[0].publicId) {
            try {
              await deleteImage(imageToDelete[0].publicId);
            } catch (deleteError) {
              console.error('Error deleting image from Cloudinary:', deleteError);
            }
          }

          await connection.execute(
            'DELETE FROM product_images WHERE id = ? AND productId = ?',
            [imageId, id]
          );
        }
      }
    }

    // Handle new image uploads (only if files are provided)
    if (req.files && req.files.length > 0) {
      const uploadedImages = await uploadMultipleImages(req.files, 'products');

      const [currentImages] = await connection.execute(
        'SELECT COUNT(*) as count FROM product_images WHERE productId = ?',
        [id]
      );

      const startOrder = currentImages[0].count;

      for (let i = 0; i < uploadedImages.length; i++) {
        const image = uploadedImages[i];
        await connection.execute(
          'INSERT INTO product_images (productId, imageUrl, publicId, isPrimary, sortOrder) VALUES (?, ?, ?, ?, ?)',
          [id, image.url, image.public_id, startOrder === 0 && i === 0 ? 1 : 0, startOrder + i]
        );
      }

      for (const file of req.files) {
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          console.error('Error deleting temp file:', unlinkError);
        }
      }
    }

    // Update attributes (only if attributes are provided)
    if (updateFields.attributes && Array.isArray(updateFields.attributes)) {
      await connection.execute(
        'DELETE FROM product_attributes WHERE productId = ?',
        [id]
      );

      for (const attr of updateFields.attributes) {
        if (attr.name && attr.value) {
          await connection.execute(
            'INSERT INTO product_attributes (productId, name, value) VALUES (?, ?, ?)',
            [id, attr.name, attr.value]
          );
        }
      }
    }

    await connection.commit();

    // Get updated product
    const [updatedProduct] = await connection.execute(
      `SELECT 
        p.*,
        c.name as categoryName
      FROM products p
      LEFT JOIN categories c ON p.categoryId = c.id
      WHERE p.id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct[0]
    });

  } catch (error) {
    await connection.rollback();
    console.error('Update product error:', error);

    if (req.files) {
      for (const file of req.files) {
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          console.error('Error deleting temp file:', unlinkError);
        }
      }
    }

    res.status(500).json({
      success: false,
      message: 'Server error while updating product'
    });
  } finally {
    connection.release();
  }
};

// Delete product
const deleteProduct = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;

    // Check if product exists
    const [existingProduct] = await connection.execute(
      'SELECT * FROM products WHERE id = ?',
      [id]
    );

    if (existingProduct.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Get product images to delete from Cloudinary
    const [images] = await connection.execute(
      'SELECT publicId FROM product_images WHERE productId = ?',
      [id]
    );

    // Delete images from Cloudinary
    for (const image of images) {
      if (image.publicId) {
        try {
          await deleteImage(image.publicId);
        } catch (deleteError) {
          console.error('Error deleting image from Cloudinary:', deleteError);
        }
      }
    }

    // Delete product (cascade will handle related records)
    await connection.execute('DELETE FROM products WHERE id = ?', [id]);

    await connection.commit();

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error) {
    await connection.rollback();
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting product'
    });
  } finally {
    connection.release();
  }
};

// Get categories
const getCategories = async (req, res) => {
  try {
    const [categories] = await pool.execute(
      'SELECT * FROM categories WHERE status = "active" ORDER BY name'
    );

    res.json({
      success: true,
      data: categories
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching categories'
    });
  }
};

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories
};