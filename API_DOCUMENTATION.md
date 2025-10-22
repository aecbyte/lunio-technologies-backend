# Lunio Technologies API Documentation

## Base URL
```
http://localhost:5000/api/v1
```

## Authentication
All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## Table of Contents
1. [Authentication](#authentication-endpoints)
2. [User Management](#user-management)
3. [Products](#products)
4. [Orders](#orders)
5. [Reviews](#reviews)
6. [KYC Verification](#kyc-verification)
7. [Blogs](#blogs)
8. [Dashboard](#dashboard)

---

## Authentication Endpoints

### 1. Customer Registration
**POST** `/auth/customer/register`

Register a new customer account.

**Request Body:**
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "phone": "+1234567890"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": 1,
      "fullName": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "role": "customer",
      "status": "active",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Validation:**
- `fullName`: Required, min 2 characters
- `email`: Required, valid email format, unique
- `password`: Required, min 6 characters
- `phone`: Optional

---

### 2. Customer Login
**POST** `/auth/customer/login`

Login as a customer.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "fullName": "John Doe",
      "email": "john@example.com",
      "role": "customer",
      "status": "active"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**
- `401`: Invalid credentials
- `401`: Account is not active

---

### 3. Admin Login
**POST** `/auth/admin/login`

Login as an admin.

**Request Body:**
```json
{
  "email": "admin@kyc.com",
  "password": "admin123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "fullName": "Admin User",
      "email": "admin@kyc.com",
      "role": "admin",
      "status": "active"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 4. Get Current User
**GET** `/auth/me`

Get the authenticated user's profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "fullName": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "username": "johndoe",
      "role": "customer",
      "status": "active",
      "avatar": "https://cloudinary.com/...",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

---

### 5. Logout
**POST** `/auth/logout`

Logout the current user (token should be removed client-side).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

## User Management

### 1. Get User Profile
**GET** `/users/profile`

Get the current user's complete profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "fullName": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "username": "johndoe",
      "role": "customer",
      "status": "active",
      "avatar": null,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

---

### 2. Update User Profile
**PUT** `/users/profile`

Update the current user's profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "fullName": "John Smith",
  "phone": "+1234567899"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": 1,
      "fullName": "John Smith",
      "email": "john@example.com",
      "phone": "+1234567899",
      "role": "customer",
      "status": "active"
    }
  }
}
```

---

### 3. Change Password
**PUT** `/users/password`

Change the current user's password.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "currentPassword": "OldPass123",
  "newPassword": "NewPass456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Error Responses:**
- `400`: Current password is incorrect
- `400`: New password must be at least 6 characters

---

## Products

### 1. Get All Products
**GET** `/products`

Get a list of all products with optional filtering and pagination.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 12)
- `category` (string): Filter by category slug
- `brand` (string): Filter by brand
- `minPrice` (number): Minimum price
- `maxPrice` (number): Maximum price
- `search` (string): Search in name and description
- `sort` (string): Sort order (price_asc, price_desc, newest, oldest)
- `featured` (boolean): Filter featured products

**Example:**
```
GET /products?page=1&limit=12&category=laptops&sort=price_asc
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": 1,
        "name": "Dell XPS 15",
        "slug": "dell-xps-15",
        "sku": "DELL-XPS15-2024",
        "description": "High-performance laptop...",
        "price": 1499.99,
        "salePrice": 1299.99,
        "stockQuantity": 50,
        "stockStatus": "in_stock",
        "brand": "Dell",
        "category": {
          "id": 1,
          "name": "Laptops",
          "slug": "laptops"
        },
        "images": [
          {
            "id": 1,
            "imageUrl": "https://cloudinary.com/...",
            "isPrimary": true
          }
        ],
        "rating": 4.5,
        "reviewCount": 120,
        "featured": true
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 60,
      "itemsPerPage": 12
    }
  }
}
```

---

### 2. Get Product by ID
**GET** `/products/:id`

Get detailed information about a specific product.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "product": {
      "id": 1,
      "name": "Dell XPS 15",
      "slug": "dell-xps-15",
      "sku": "DELL-XPS15-2024",
      "description": "Full detailed description...",
      "shortDescription": "High-performance laptop",
      "price": 1499.99,
      "salePrice": 1299.99,
      "stockQuantity": 50,
      "stockStatus": "in_stock",
      "brand": "Dell",
      "weight": 2.5,
      "dimensions": "14 x 10 x 0.7 inches",
      "category": {
        "id": 1,
        "name": "Laptops",
        "slug": "laptops"
      },
      "images": [
        {
          "id": 1,
          "imageUrl": "https://cloudinary.com/...",
          "altText": "Dell XPS 15 front view",
          "isPrimary": true,
          "sortOrder": 0
        }
      ],
      "attributes": [
        {
          "name": "Processor",
          "value": "Intel Core i7"
        },
        {
          "name": "RAM",
          "value": "16GB"
        }
      ],
      "rating": 4.5,
      "reviewCount": 120,
      "featured": true,
      "relatedProducts": []
    }
  }
}
```

---

### 3. Get Product by Slug
**GET** `/products/slug/:slug`

Get a product by its URL-friendly slug.

**Example:**
```
GET /products/slug/dell-xps-15
```

**Response:** Same as Get Product by ID

---

## Orders

### 1. Create Order
**POST** `/orders`

Create a new order.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "items": [
    {
      "productId": 1,
      "quantity": 2,
      "price": 1299.99
    }
  ],
  "shippingAddress": {
    "fullName": "John Doe",
    "addressLine1": "123 Main St",
    "addressLine2": "Apt 4B",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "country": "USA",
    "phone": "+1234567890"
  },
  "paymentMethod": "credit_card",
  "notes": "Please handle with care"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "order": {
      "id": 1,
      "orderNumber": "ORD-2024-0001",
      "userId": 1,
      "status": "pending",
      "subtotal": 2599.98,
      "tax": 259.99,
      "shipping": 10.00,
      "total": 2869.97,
      "paymentMethod": "credit_card",
      "paymentStatus": "pending",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

---

### 2. Get User Orders
**GET** `/orders`

Get all orders for the authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `status` (string): Filter by status

**Response (200):**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": 1,
        "orderNumber": "ORD-2024-0001",
        "status": "delivered",
        "total": 2869.97,
        "itemCount": 2,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "deliveredAt": "2024-01-05T00:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 1,
      "itemsPerPage": 10
    }
  }
}
```

---

### 3. Get Order by ID
**GET** `/orders/:id`

Get detailed information about a specific order.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "order": {
      "id": 1,
      "orderNumber": "ORD-2024-0001",
      "userId": 1,
      "status": "delivered",
      "subtotal": 2599.98,
      "tax": 259.99,
      "shipping": 10.00,
      "total": 2869.97,
      "paymentMethod": "credit_card",
      "paymentStatus": "paid",
      "shippingAddress": {
        "fullName": "John Doe",
        "addressLine1": "123 Main St",
        "city": "New York",
        "state": "NY",
        "postalCode": "10001",
        "country": "USA",
        "phone": "+1234567890"
      },
      "items": [
        {
          "id": 1,
          "productId": 1,
          "productName": "Dell XPS 15",
          "quantity": 2,
          "price": 1299.99,
          "subtotal": 2599.98
        }
      ],
      "trackingNumber": "TRK123456789",
      "notes": "Please handle with care",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "deliveredAt": "2024-01-05T00:00:00.000Z"
    }
  }
}
```

---

### 4. Cancel Order
**PUT** `/orders/:id/cancel`

Cancel an order (only if status is pending or processing).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Order cancelled successfully",
  "data": {
    "order": {
      "id": 1,
      "status": "cancelled"
    }
  }
}
```

---

## Reviews

### 1. Get Product Reviews
**GET** `/reviews/product/:productId`

Get all reviews for a specific product.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `rating` (number): Filter by rating (1-5)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "id": 1,
        "userId": 1,
        "userName": "John Doe",
        "userAvatar": "https://cloudinary.com/...",
        "rating": 5,
        "title": "Excellent product!",
        "comment": "Really satisfied with this purchase...",
        "verified": true,
        "helpful": 25,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalItems": 30,
      "itemsPerPage": 10
    },
    "summary": {
      "averageRating": 4.5,
      "totalReviews": 30,
      "ratingDistribution": {
        "5": 18,
        "4": 8,
        "3": 2,
        "2": 1,
        "1": 1
      }
    }
  }
}
```

---

### 2. Create Review
**POST** `/reviews`

Create a review for a product.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "productId": 1,
  "rating": 5,
  "title": "Excellent product!",
  "comment": "Really satisfied with this purchase. Highly recommended!",
  "orderId": 1
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Review created successfully",
  "data": {
    "review": {
      "id": 1,
      "userId": 1,
      "productId": 1,
      "orderId": 1,
      "rating": 5,
      "title": "Excellent product!",
      "comment": "Really satisfied with this purchase...",
      "verified": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

**Validation:**
- `productId`: Required, must exist
- `rating`: Required, must be 1-5
- `title`: Optional, max 200 characters
- `comment`: Required, min 10 characters
- User must have purchased the product

---

### 3. Update Review
**PUT** `/reviews/:id`

Update an existing review.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "rating": 4,
  "title": "Good product",
  "comment": "Updated review text..."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Review updated successfully",
  "data": {
    "review": {
      "id": 1,
      "rating": 4,
      "title": "Good product",
      "comment": "Updated review text...",
      "updatedAt": "2024-01-02T00:00:00.000Z"
    }
  }
}
```

---

### 4. Delete Review
**DELETE** `/reviews/:id`

Delete a review (only your own review).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Review deleted successfully"
}
```

---

## KYC Verification

### 1. Submit KYC
**POST** `/kyc/submit`

Submit KYC verification documents.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `documentType` (string): passport, drivers_license, national_id, other
- `fullName` (string): Full name on document
- `documentNumber` (string): Document number
- `frontImage` (file): Front image of document
- `backImage` (file): Back image of document
- `selfieImage` (file): Selfie photo

**Response (201):**
```json
{
  "success": true,
  "message": "KYC submitted successfully",
  "data": {
    "id": 1,
    "userId": 1,
    "documentType": "passport",
    "status": "pending",
    "submittedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 2. Get KYC Status
**GET** `/kyc/status`

Get the current user's KYC verification status.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "approved",
    "documentType": "passport",
    "submittedAt": "2024-01-01T00:00:00.000Z",
    "reviewedAt": "2024-01-02T00:00:00.000Z",
    "rejectionReason": null
  }
}
```

**Status Values:**
- `pending`: Under review
- `approved`: Verified
- `rejected`: Verification failed
- `not_submitted`: No KYC submitted

---

## Blogs

### 1. Get All Blogs
**GET** `/blogs`

Get a list of all blog posts.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 12)
- `category` (string): Filter by category
- `tag` (string): Filter by tag
- `search` (string): Search in title and content

**Response (200):**
```json
{
  "success": true,
  "data": {
    "blogs": [
      {
        "id": 1,
        "title": "Getting Started with React",
        "slug": "getting-started-with-react",
        "excerpt": "Learn the basics of React...",
        "featuredImage": "https://cloudinary.com/...",
        "author": {
          "id": 1,
          "name": "Admin User"
        },
        "category": "Technology",
        "tags": ["React", "JavaScript", "Web Development"],
        "readTime": 5,
        "views": 1500,
        "publishedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 50,
      "itemsPerPage": 12
    }
  }
}
```

---

### 2. Get Blog by ID/Slug
**GET** `/blogs/:id`

Get a specific blog post by ID or slug.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "blog": {
      "id": 1,
      "title": "Getting Started with React",
      "slug": "getting-started-with-react",
      "content": "Full blog content in HTML/Markdown...",
      "excerpt": "Learn the basics of React...",
      "featuredImage": "https://cloudinary.com/...",
      "author": {
        "id": 1,
        "name": "Admin User",
        "avatar": "https://cloudinary.com/..."
      },
      "category": "Technology",
      "tags": ["React", "JavaScript", "Web Development"],
      "readTime": 5,
      "views": 1500,
      "publishedAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "relatedPosts": []
    }
  }
}
```

---

## Dashboard (Admin Only)

### 1. Get Dashboard Stats
**GET** `/dashboard/stats`

Get overall dashboard statistics.

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalRevenue": 125000.50,
    "totalOrders": 450,
    "totalCustomers": 320,
    "totalProducts": 180,
    "pendingOrders": 25,
    "lowStockProducts": 12,
    "pendingKYC": 8,
    "recentOrders": [],
    "topSellingProducts": [],
    "revenueChart": []
  }
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description"
}
```

### Common HTTP Status Codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error)
- `401`: Unauthorized (invalid/missing token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `409`: Conflict (duplicate resource)
- `500`: Internal Server Error

---

## Rate Limiting

API endpoints are rate-limited to:
- **100 requests per 15 minutes** per IP address

When rate limit is exceeded:
```json
{
  "success": false,
  "message": "Too many requests from this IP, please try again later."
}
```

---

## File Upload Guidelines

### Accepted Formats:
- Images: JPEG, PNG, GIF, WebP
- Documents: PDF
- Maximum file size: 10MB

### Image URLs:
All images are hosted on Cloudinary and return full HTTPS URLs.

---

## Best Practices

1. **Always include the Authorization header** for protected routes
2. **Handle token expiration** - tokens expire after 7 days
3. **Store tokens securely** - use httpOnly cookies or secure storage
4. **Implement proper error handling** on the client side
5. **Use pagination** for list endpoints to optimize performance
6. **Validate input** on both client and server side
7. **Use HTTPS** in production environments

---

## Support

For API support or questions:
- Email: support@lunio.tech
- Documentation: http://localhost:5000/api/v1

---

*Last Updated: January 2024*
*API Version: 1.0*