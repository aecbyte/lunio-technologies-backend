# Lunio Technologies Backend Setup Guide

## Overview
This is a complete Node.js/Express backend system for Lunio Technologies e-commerce platform with both admin and customer functionality.

## Architecture

### Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **File Upload**: Multer + Cloudinary
- **Security**: Helmet, CORS, Rate Limiting
- **Validation**: Express Validator

### Project Structure
```
server/
├── config/
│   ├── database.js          # MySQL connection pool
│   └── cloudinary.js         # Cloudinary configuration
├── controllers/
│   ├── authController.js     # Authentication logic
│   ├── userController.js     # User management
│   ├── productController.js  # Product operations
│   ├── orderController.js    # Order management
│   ├── reviewController.js   # Review system
│   ├── kycController.js      # KYC verification
│   ├── blogController.js     # Blog posts
│   └── dashboardController.js # Admin dashboard
├── middleware/
│   ├── auth.js              # JWT authentication
│   ├── upload.js            # File upload handler
│   └── validation.js        # Input validation
├── routes/
│   ├── auth.js              # Auth routes
│   ├── users.js             # User routes
│   ├── products.js          # Product routes
│   ├── orders.js            # Order routes
│   ├── reviews.js           # Review routes
│   ├── kyc.js               # KYC routes
│   ├── blogs.js             # Blog routes
│   └── dashboard.js         # Dashboard routes
├── scripts/
│   └── setupDatabase.js     # Database setup script
├── .env.example             # Environment variables template
├── server.js                # Main server file
└── package.json             # Dependencies

```

## Installation

### Prerequisites
- Node.js (v16 or higher)
- MySQL (v8 or higher)
- npm or yarn
- Cloudinary account (for image hosting)

### Step 1: Clone and Install Dependencies

```bash
cd server
npm install
```

### Step 2: Environment Configuration

Create a `.env` file in the server directory:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=lunio_ecommerce

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d

# Cloudinary Configuration (Get from https://cloudinary.com/)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# CORS Configuration
FRONTEND_URL=http://localhost:5173

# Admin Default Credentials
ADMIN_EMAIL=admin@lunio.tech
ADMIN_PASSWORD=admin123456
```

### Step 3: Database Setup

#### Option 1: Automatic Setup (Recommended)

Run the database setup script:

```bash
npm run setup-db
```

This will:
- Create the database
- Create all required tables
- Set up relationships
- Create default admin user
- Add sample data

#### Option 2: Manual Setup

1. Create MySQL database:
```sql
CREATE DATABASE lunio_ecommerce;
USE lunio_ecommerce;
```

2. Run the SQL script from `scripts/setupDatabase.js`

### Step 4: Start the Server

#### Development Mode
```bash
npm run dev
```

#### Production Mode
```bash
npm start
```

Server will start on: `http://localhost:5000`

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  fullName VARCHAR(255) NOT NULL,
  username VARCHAR(100) UNIQUE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role ENUM('admin', 'customer') DEFAULT 'customer',
  status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
  avatar VARCHAR(500),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Products Table
```sql
CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  sku VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  shortDescription VARCHAR(500),
  categoryId INT,
  brand VARCHAR(100),
  price DECIMAL(10,2) NOT NULL,
  salePrice DECIMAL(10,2),
  stockQuantity INT DEFAULT 0,
  stockStatus ENUM('in_stock', 'out_of_stock', 'on_backorder') DEFAULT 'in_stock',
  weight DECIMAL(8,2),
  dimensions VARCHAR(100),
  status ENUM('active', 'inactive', 'draft') DEFAULT 'draft',
  featured BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (categoryId) REFERENCES categories(id)
);
```

### Orders Table
```sql
CREATE TABLE orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  orderNumber VARCHAR(50) UNIQUE NOT NULL,
  userId INT NOT NULL,
  status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded') DEFAULT 'pending',
  subtotal DECIMAL(10,2) NOT NULL,
  tax DECIMAL(10,2) DEFAULT 0,
  shipping DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  paymentMethod VARCHAR(50),
  paymentStatus ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
  shippingAddress JSON,
  trackingNumber VARCHAR(100),
  notes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deliveredAt TIMESTAMP NULL,
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

### Reviews Table
```sql
CREATE TABLE reviews (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  productId INT NOT NULL,
  orderId INT,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(200),
  comment TEXT,
  verified BOOLEAN DEFAULT FALSE,
  helpful INT DEFAULT 0,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (productId) REFERENCES products(id),
  FOREIGN KEY (orderId) REFERENCES orders(id)
);
```

### KYC Verification Table
```sql
CREATE TABLE kyc_verifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  documentType VARCHAR(50) NOT NULL,
  documentNumber VARCHAR(100) NOT NULL,
  fullName VARCHAR(255) NOT NULL,
  frontImage VARCHAR(500) NOT NULL,
  backImage VARCHAR(500) NOT NULL,
  selfieImage VARCHAR(500) NOT NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  rejectionReason TEXT,
  submittedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewedAt TIMESTAMP NULL,
  reviewedBy INT,
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (reviewedBy) REFERENCES users(id)
);
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/customer/register` - Register new customer
- `POST /api/v1/auth/customer/login` - Customer login
- `POST /api/v1/auth/admin/login` - Admin login
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/logout` - Logout

### User Management
- `GET /api/v1/users/profile` - Get user profile
- `PUT /api/v1/users/profile` - Update profile
- `PUT /api/v1/users/password` - Change password
- `POST /api/v1/users/avatar` - Upload avatar

### Products
- `GET /api/v1/products` - Get all products (with filters)
- `GET /api/v1/products/:id` - Get product by ID
- `GET /api/v1/products/slug/:slug` - Get product by slug
- `POST /api/v1/products` - Create product (Admin)
- `PUT /api/v1/products/:id` - Update product (Admin)
- `DELETE /api/v1/products/:id` - Delete product (Admin)

### Orders
- `POST /api/v1/orders` - Create order
- `GET /api/v1/orders` - Get user orders
- `GET /api/v1/orders/:id` - Get order details
- `PUT /api/v1/orders/:id/cancel` - Cancel order
- `PUT /api/v1/orders/:id/status` - Update order status (Admin)

### Reviews
- `GET /api/v1/reviews/product/:productId` - Get product reviews
- `POST /api/v1/reviews` - Create review
- `PUT /api/v1/reviews/:id` - Update review
- `DELETE /api/v1/reviews/:id` - Delete review

### KYC
- `POST /api/v1/kyc/submit` - Submit KYC documents
- `GET /api/v1/kyc/status` - Get KYC status
- `GET /api/v1/kyc/pending` - Get pending KYCs (Admin)
- `PUT /api/v1/kyc/:id/approve` - Approve KYC (Admin)
- `PUT /api/v1/kyc/:id/reject` - Reject KYC (Admin)

### Blogs
- `GET /api/v1/blogs` - Get all blogs
- `GET /api/v1/blogs/:id` - Get blog by ID
- `POST /api/v1/blogs` - Create blog (Admin)
- `PUT /api/v1/blogs/:id` - Update blog (Admin)
- `DELETE /api/v1/blogs/:id` - Delete blog (Admin)

### Dashboard (Admin Only)
- `GET /api/v1/dashboard/stats` - Get dashboard statistics
- `GET /api/v1/dashboard/revenue` - Get revenue data
- `GET /api/v1/dashboard/orders` - Get recent orders
- `GET /api/v1/dashboard/customers` - Get customer analytics

## Authentication Flow

### Registration
1. User submits registration form
2. Server validates input
3. Password is hashed with bcrypt
4. User is created in database
5. JWT token is generated
6. Token and user data returned

### Login
1. User submits credentials
2. Server finds user by email
3. Password is compared with hash
4. If valid, JWT token generated
5. Token and user data returned

### Protected Routes
1. Client sends token in Authorization header
2. Server verifies token
3. User data attached to request
4. Route handler processes request

## Security Features

### 1. Password Security
- Passwords hashed with bcryptjs (12 salt rounds)
- Passwords never stored in plain text
- Passwords never returned in API responses

### 2. JWT Authentication
- Tokens signed with secret key
- 7-day expiration
- Token validation on protected routes
- Automatic token refresh handling

### 3. Rate Limiting
- 100 requests per 15 minutes per IP
- Prevents brute force attacks
- Applies to all API routes

### 4. Input Validation
- Express Validator for all inputs
- SQL injection prevention
- XSS attack prevention
- Required field checking
- Data type validation

### 5. CORS
- Configured allowed origins
- Credential support
- Preflight handling

### 6. Helmet
- Security headers set automatically
- XSS protection
- Content security policy
- MIME type sniffing prevention

## File Upload

### Configuration
- Maximum file size: 10MB
- Supported formats: JPEG, PNG, GIF, PDF
- Storage: Cloudinary CDN
- Automatic image optimization

### Process
1. Client sends multipart/form-data
2. Multer processes upload
3. File uploaded to Cloudinary
4. URL saved in database
5. URL returned to client

## Error Handling

### Global Error Handler
```javascript
app.use((error, req, res, next) => {
  // Handle different error types
  // Return consistent error format
  res.status(error.status || 500).json({
    success: false,
    message: error.message,
    errors: error.errors // validation errors
  });
});
```

### Error Types
- Validation errors (400)
- Authentication errors (401)
- Authorization errors (403)
- Not found errors (404)
- Conflict errors (409)
- Server errors (500)

## Testing

### Manual Testing
Use tools like:
- Postman
- Insomnia
- cURL
- Thunder Client (VS Code)

### Example Request (cURL)
```bash
# Register
curl -X POST http://localhost:5000/api/v1/auth/customer/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"John Doe","email":"john@example.com","password":"test123","phone":"+1234567890"}'

# Login
curl -X POST http://localhost:5000/api/v1/auth/customer/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"test123"}'

# Get Profile (with token)
curl -X GET http://localhost:5000/api/v1/users/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Production Deployment

### Environment Variables
Update for production:
```env
NODE_ENV=production
PORT=5000
DB_HOST=your-production-db-host
JWT_SECRET=very-long-random-secure-string
FRONTEND_URL=https://yourdomain.com
```

### Best Practices
1. Use environment variables for all sensitive data
2. Enable HTTPS
3. Use production database
4. Enable logging
5. Set up monitoring
6. Regular backups
7. Update dependencies regularly
8. Implement proper error tracking (Sentry, etc.)

### Deployment Platforms
- **AWS EC2** - Full control
- **Heroku** - Easy deployment
- **DigitalOcean** - VPS hosting
- **Vercel/Netlify** - Serverless functions
- **Railway** - Modern platform
- **Render** - Free tier available

## Troubleshooting

### Common Issues

#### Database Connection Failed
```
Error: connect ECONNREFUSED
```
**Solution**:
- Check MySQL is running: `mysql.server status`
- Verify credentials in .env
- Check database exists
- Verify host/port

#### JWT Token Error
```
Error: JsonWebTokenError: invalid token
```
**Solution**:
- Check token is sent in Authorization header
- Verify token format: "Bearer <token>"
- Check JWT_SECRET matches
- Verify token hasn't expired

#### File Upload Error
```
Error: Cloudinary configuration not found
```
**Solution**:
- Verify Cloudinary credentials in .env
- Check account is active
- Verify API keys are correct
- Test connection

#### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5000
```
**Solution**:
- Kill process using port: `lsof -ti:5000 | xargs kill -9`
- Use different port in .env
- Check no other server running

## Monitoring

### Health Check
```bash
curl http://localhost:5000/health
```

Response:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "development"
}
```

### Logs
- Development: Console output with colors
- Production: File logging recommended
- Use Morgan for HTTP request logging

## Support

### Documentation
- API Documentation: `/server/API_DOCUMENTATION.md`
- Setup Guide: This file
- Code comments: Throughout codebase

### Contact
- Email: support@lunio.tech
- GitHub: [Repository URL]
- Documentation: http://localhost:5000/api/v1

---

**Version**: 1.0.0
**Last Updated**: January 2024
**License**: MIT