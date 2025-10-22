const { pool } = require('../config/database');

// Helper: Get or create the user's active cart
const getOrCreateCart = async (userId) => {
  let [cart] = await pool.execute('SELECT id FROM carts WHERE userId = ?', [userId]);
  if (cart.length === 0) {
    const [result] = await pool.execute('INSERT INTO carts (userId) VALUES (?)', [userId]);
    return result.insertId;
  }
  return cart[0].id;
};

// 🛒 Get cart
const getCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const cartId = await getOrCreateCart(userId);

    const [cartItems] = await pool.execute(
      `SELECT
        ci.id,
        ci.productId,
        ci.quantity,
        ci.selectedAttributes,
        p.name,
        p.price,
        p.salePrice,
        p.stockStatus,
        p.stockQuantity AS maxQuantity,
        pi.imageUrl AS image,
        COALESCE(p.salePrice, p.price) AS effectivePrice
      FROM cart_items ci
      JOIN products p ON ci.productId = p.id
      LEFT JOIN product_images pi ON p.id = pi.productId AND pi.isPrimary = 1
      WHERE ci.cartId = ?
      ORDER BY ci.createdAt DESC`,
      [cartId]
    );

    const formattedItems = cartItems.map(item => ({
      id: item.productId,
      cartItemId: item.id,
      name: item.name,
      price: parseFloat(item.price),
      salePrice: item.salePrice ? parseFloat(item.salePrice) : null,
      quantity: item.quantity,
      image: item.image || '',
      stockStatus: item.stockStatus,
      maxQuantity: item.maxQuantity,
      // selectedAttributes: item.selectedAttributes ? JSON.parse(item.selectedAttributes) : null
    }));

    const totalItems = formattedItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = formattedItems.reduce((sum, item) => {
      const price = item.salePrice || item.price;
      return sum + price * item.quantity;
    }, 0);

    res.json({
      success: true,
      data: {
        items: formattedItems,
        totalItems,
        totalPrice: parseFloat(totalPrice.toFixed(2))
      }
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch cart', error: error.message });
  }
};

// ➕ Add to cart
const addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, quantity = 1, selectedAttributes } = req.body;

    if (!productId) return res.status(400).json({ success: false, message: 'Product ID is required' });
    if (quantity <= 0) return res.status(400).json({ success: false, message: 'Quantity must be greater than 0' });

    // Get product info
    const [productRows] = await pool.execute(
      'SELECT id, stockQuantity, stockStatus FROM products WHERE id = ?',
      [productId]
    );
    if (productRows.length === 0)
      return res.status(404).json({ success: false, message: 'Product not found' });

    const product = productRows[0];
    if (product.stockStatus === 'out_of_stock')
      return res.status(400).json({ success: false, message: 'Product is out of stock' });

    const cartId = await getOrCreateCart(userId);
    const attributesJson = selectedAttributes ? JSON.stringify(selectedAttributes) : null;

    // ✅ Use JSON_CONTAINS for accurate JSON matching
    const [existingRows] = await pool.execute(
      `SELECT id, quantity FROM cart_items
       WHERE cartId = ? AND productId = ?
       AND (
         (selectedAttributes IS NULL AND ? IS NULL)
         OR (JSON_CONTAINS(selectedAttributes, CAST(? AS JSON))
         AND JSON_CONTAINS(CAST(? AS JSON), selectedAttributes))
       )`,
      [cartId, productId, attributesJson, attributesJson, attributesJson]
    );

    if (existingRows.length > 0) {
      const existing = existingRows[0];
      const newQuantity = existing.quantity + quantity;
      const finalQuantity = Math.min(newQuantity, product.stockQuantity);

      await pool.execute(
        'UPDATE cart_items SET quantity = ?, updatedAt = NOW() WHERE id = ?',
        [finalQuantity, existing.id]
      );

      return res.json({
        success: true,
        message: 'Cart quantity increased successfully',
        data: { cartItemId: existing.id, quantity: finalQuantity }
      });
    }

    const insertQuantity = Math.min(quantity, product.stockQuantity);
    const [result] = await pool.execute(
      'INSERT INTO cart_items (cartId, productId, quantity, selectedAttributes) VALUES (?, ?, ?, ?)',
      [cartId, productId, insertQuantity, attributesJson]
    );

    return res.status(201).json({
      success: true,
      message: 'Product added to cart',
      data: { cartItemId: result.insertId, quantity: insertQuantity }
    });

  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add product to cart',
      error: error.message
    });
  }
};


// ✏️ Update cart item
const updateCartItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { quantity } = req.body;
    if (!quantity || quantity < 1) return res.status(400).json({ success: false, message: 'Quantity must be at least 1' });

    const cartId = await getOrCreateCart(userId);
    const [cartItem] = await pool.execute(
      `SELECT ci.id, ci.productId, p.stockQuantity
       FROM cart_items ci
       JOIN products p ON ci.productId = p.id
       WHERE ci.productId = ? AND ci.cartId = ?`,
      [id, cartId]
    );
    console.log('Cart item fetched for update:', cartItem);
    if (cartItem.length === 0) return res.status(404).json({ success: false, message: 'Cart item not found' });

    // const newQuantity = Math.min(quantity, cartItem[0].stockQuantity);
    await pool.execute('UPDATE cart_items SET quantity = ?, updatedAt = NOW() WHERE productId = ?', [quantity, id]);

    const [cartItems] = await pool.execute(
      `SELECT
        ci.id,
        ci.productId,
        ci.quantity,
        ci.selectedAttributes,
        p.name,
        p.price,
        p.salePrice,
        p.stockStatus,
        p.stockQuantity AS maxQuantity,
        pi.imageUrl AS image,
        COALESCE(p.salePrice, p.price) AS effectivePrice
      FROM cart_items ci
      JOIN products p ON ci.productId = p.id
      LEFT JOIN product_images pi ON p.id = pi.productId AND pi.isPrimary = 1
      WHERE ci.cartId = ?
      ORDER BY ci.createdAt DESC`,
      [cartId]
    );

    const formattedItems = cartItems.map(item => ({
      id: item.productId,
      cartItemId: item.id,
      name: item.name,
      price: parseFloat(item.price),
      salePrice: item.salePrice ? parseFloat(item.salePrice) : null,
      quantity: item.quantity,
      image: item.image || '',
      stockStatus: item.stockStatus,
      maxQuantity: item.maxQuantity,
      // selectedAttributes: item.selectedAttributes ? JSON.parse(item.selectedAttributes) : null
    }));

    const totalItems = formattedItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = formattedItems.reduce((sum, item) => {
      const price = item.salePrice || item.price;
      return sum + price * item.quantity;
    }, 0);

    res.json({
      success: true,
      data: {
        items: formattedItems,
        totalItems,
        totalPrice: parseFloat(totalPrice.toFixed(2))
      }
    });
  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({ success: false, message: 'Failed to update cart item', error: error.message });
  }
};

// ❌ Remove item
const removeFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const cartId = await getOrCreateCart(userId);

    const [result] = await pool.execute('DELETE FROM cart_items WHERE ProductId = ? AND cartId = ?', [id, cartId]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Cart item not found' });
    const [cartItems] = await pool.execute(
      `SELECT
        ci.id,
        ci.productId,
        ci.quantity,
        ci.selectedAttributes,
        p.name,
        p.price,
        p.salePrice,
        p.stockStatus,
        p.stockQuantity AS maxQuantity,
        pi.imageUrl AS image,
        COALESCE(p.salePrice, p.price) AS effectivePrice
      FROM cart_items ci
      JOIN products p ON ci.productId = p.id
      LEFT JOIN product_images pi ON p.id = pi.productId AND pi.isPrimary = 1
      WHERE ci.cartId = ?
      ORDER BY ci.createdAt DESC`,
      [cartId]
    );

    const formattedItems = cartItems.map(item => ({
      id: item.productId,
      cartItemId: item.id,
      name: item.name,
      price: parseFloat(item.price),
      salePrice: item.salePrice ? parseFloat(item.salePrice) : null,
      quantity: item.quantity,
      image: item.image || '',
      stockStatus: item.stockStatus,
      maxQuantity: item.maxQuantity,
      // selectedAttributes: item.selectedAttributes ? JSON.parse(item.selectedAttributes) : null
    }));

    const totalItems = formattedItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = formattedItems.reduce((sum, item) => {
      const price = item.salePrice || item.price;
      return sum + price * item.quantity;
    }, 0);

    res.json({
      success: true,
      data: {
        items: formattedItems,
        totalItems,
        totalPrice: parseFloat(totalPrice.toFixed(2))
      }
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove item', error: error.message });
  }
};

// 🧹 Clear entire cart
const clearCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const cartId = await getOrCreateCart(userId);
    await pool.execute('DELETE FROM cart_items WHERE cartId = ?', [cartId]);
    res.json({ success: true, message: 'Cart cleared successfully' });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ success: false, message: 'Failed to clear cart', error: error.message });
  }
};

// 🔄 Sync cart (replace all items)
const syncCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { items } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ success: false, message: 'Items must be an array' });

    const cartId = await getOrCreateCart(userId);
    await pool.execute('DELETE FROM cart_items WHERE cartId = ?', [cartId]);

    for (const item of items) {
      if (!item.id || !item.quantity) continue;
      const [product] = await pool.execute('SELECT stockQuantity FROM products WHERE id = ?', [item.id]);
      if (product.length === 0) continue;

      const quantity = Math.min(item.quantity, product[0].stockQuantity);
      const attributesJson = item.selectedAttributes ? JSON.stringify(item.selectedAttributes) : null;
      await pool.execute(
        'INSERT INTO cart_items (cartId, productId, quantity, selectedAttributes) VALUES (?, ?, ?, ?)',
        [cartId, item.id, quantity, attributesJson]
      );
    }

    const [cartItems] = await pool.execute(
      `SELECT
        ci.id,
        ci.productId,
        ci.quantity,
        ci.selectedAttributes,
        p.name,
        p.price,
        p.salePrice,
        p.stockStatus,
        p.stockQuantity AS maxQuantity,
        pi.imageUrl AS image
      FROM cart_items ci
      JOIN products p ON ci.productId = p.id
      LEFT JOIN product_images pi ON p.id = pi.productId AND pi.isPrimary = 1
      WHERE ci.cartId = ?`,
      [cartId]
    );

    const formattedItems = cartItems.map(item => ({
      id: item.productId,
      cartItemId: item.id,
      name: item.name,
      price: parseFloat(item.price),
      salePrice: item.salePrice ? parseFloat(item.salePrice) : null,
      quantity: item.quantity,
      image: item.image || '',
      stockStatus: item.stockStatus,
      maxQuantity: item.maxQuantity,
      selectedAttributes: item.selectedAttributes ? JSON.parse(item.selectedAttributes) : null
    }));

    res.json({ success: true, message: 'Cart synced successfully', data: { items: formattedItems } });
  } catch (error) {
    console.error('Sync cart error:', error);
    res.status(500).json({ success: false, message: 'Failed to sync cart', error: error.message });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  syncCart
};
