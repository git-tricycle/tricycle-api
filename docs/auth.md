# 🔐 Authentication System Documentation

Complete guide to the JWT-based authentication system with role-based access control.

---

## 📋 Table of Contents

- [Overview](#overview)
- [User Roles & Status](#user-roles--status)
- [Authentication Flow](#authentication-flow)
- [API Endpoints](#api-endpoints)
- [JWT Token Management](#jwt-token-management)
- [Security Features](#security-features)
- [Error Handling](#error-handling)
- [Examples](#examples)

---

## 🎯 Overview

The Tricycle API uses JWT (JSON Web Tokens) for stateless authentication with a comprehensive role-based access control system. The authentication system supports user registration, login, and role-based permissions.

### Key Features:
- JWT-based stateless authentication
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Token expiration management
- User status validation
- Soft delete support

---

## 👤 User Roles & Status

### User Roles
| Role | Description | Permissions |
|------|-------------|-------------|
| **`admin`** | System administrator | Full access to all resources |
| **`driver`** | Tricycle driver | Limited access for driver operations |
| **`passenger`** | Regular user | Basic user access |

### User Status
| Status | Description | Access |
|--------|-------------|---------|
| **`active`** | Normal user account | Can login and access system |
| **`inactive`** | Temporarily disabled | Login blocked |
| **`banned`** | Permanently blocked | No system access |

---

## 🔄 Authentication Flow

### Registration Process
1. User submits registration data
2. System validates email uniqueness
3. Password is hashed with bcrypt (10 salt rounds)
4. User record is created in database
5. JWT token is generated and returned
6. User can immediately access protected endpoints

### Login Process
1. User submits email, password, and role
2. System validates user exists and is active
3. Password is compared with hashed version
4. Role is validated against user's assigned role
5. JWT token is generated with 7-day expiration
6. Token is returned for subsequent requests

### Token Validation
1. Client includes token in Authorization header
2. Middleware extracts and validates JWT
3. User is fetched from database
4. User status and deletion status checked
5. User object is attached to request
6. Request proceeds to route handler

---

## 🚀 API Endpoints

### Register New User
```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "middleName": "Michael",
  "email": "john.doe@example.com",
  "password": "securePassword123",
  "metadata": {
    "address": "123 Main St, City",
    "phone": "+1234567890",
    "age": 30,
    "gender": "male"
  }
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "firstName": "John",
      "lastName": "Doe",
      "middleName": "Michael",
      "email": "john.doe@example.com",
      "metadata": {
        "address": "123 Main St, City",
        "phone": "+1234567890",
        "age": 30,
        "gender": "male"
      },
      "createdAt": "2025-10-18T10:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "User already exists"
}
```

---

### User Login
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "securePassword123",
  "role": "passenger"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "firstName": "John",
      "lastName": "Doe",
      "middleName": "Michael"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**
```json
// Invalid credentials
{
  "success": false,
  "message": "Invalid credentials"
}

// Role mismatch
{
  "success": false,
  "message": "Access denied: Invalid role for this login"
}
```

---

## 🎫 JWT Token Management

### Token Structure
```typescript
interface JWTPayload {
  userId: string;
  iat: number;        // Issued at
  exp: number;        // Expires at
}
```

### Token Usage
Include the JWT token in the Authorization header for all protected endpoints:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Expiration
- **Default expiration:** 7 days
- **Automatic validation:** Every request validates token expiration
- **Renewal:** Users must login again after expiration

---

## 🔒 Security Features

### Password Security
- **Hashing Algorithm:** bcrypt with 10 salt rounds
- **Storage:** Only hashed passwords stored in database
- **Validation:** Plain text passwords compared with hashed versions
- **Response:** Passwords never included in API responses

### JWT Security
- **Secret Key:** Configurable via `JWT_SECRET` environment variable
- **Algorithm:** HMAC SHA256 (HS256)
- **Expiration:** Configurable, defaults to 7 days
- **Validation:** Signature and expiration checked on every request

### User Validation
- **Active Status:** Only active users can login
- **Soft Delete:** Deleted users cannot authenticate
- **Role Matching:** Login requires correct role specification
- **Database Check:** User existence verified on each request

---

## ⚠️ Error Handling

### Authentication Errors

#### Missing Token
```json
{
  "success": false,
  "message": "No token, authorization denied"
}
```
**HTTP Status:** 401

#### Invalid Token
```json
{
  "success": false,
  "message": "Token is not valid"
}
```
**HTTP Status:** 401

#### User Not Found/Inactive
```json
{
  "success": false,
  "message": "Token is not valid"
}
```
**HTTP Status:** 401

#### Registration Errors
```json
{
  "success": false,
  "message": "User already exists"
}
```
**HTTP Status:** 400

#### Login Errors
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```
**HTTP Status:** 400

---

## 💻 Examples

### Complete Registration Example
```bash
# Register a new user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Alice",
    "lastName": "Johnson",
    "email": "alice.johnson@example.com",
    "password": "mySecurePassword123",
    "metadata": {
      "phone": "+1555123456",
      "address": "789 Pine Street, Springfield",
      "age": 28,
      "gender": "female"
    }
  }'
```

### Login Example
```bash
# Login as passenger
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice.johnson@example.com",
    "password": "mySecurePassword123",
    "role": "passenger"
  }'
```

### Using JWT Token
```bash
# Use the token from login response
export JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Access protected endpoint
curl -X GET http://localhost:5000/api/user \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### JavaScript/Frontend Example
```javascript
// Registration
const registerUser = async (userData) => {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });
  
  const data = await response.json();
  
  if (data.success) {
    // Store token in localStorage or secure storage
    localStorage.setItem('authToken', data.data.token);
    return data.data.user;
  } else {
    throw new Error(data.message);
  }
};

// Login
const loginUser = async (email, password, role) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, role }),
  });
  
  const data = await response.json();
  
  if (data.success) {
    localStorage.setItem('authToken', data.data.token);
    return data.data.user;
  } else {
    throw new Error(data.message);
  }
};

// Make authenticated requests
const makeAuthenticatedRequest = async (url, options = {}) => {
  const token = localStorage.getItem('authToken');
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  return response.json();
};
```

---

## 🔧 Advanced Configuration

### Environment Variables
```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Database
DATABASE_URL=mongodb://localhost:27017/tricycle-db

# CORS
FRONTEND_URL=http://localhost:3000
```

### Middleware Integration
The authentication system integrates with the RBAC middleware:

```typescript
// Route protection examples
router.get('/protected', authenticate, handler);                    // Requires authentication
router.post('/admin-only', authenticate, requireAdmin, handler);    // Requires admin role
router.patch('/users/:id', authenticate, requireWritePermission, handler); // Requires write permission
```

---

## 🛠️ Implementation Details

### Service Layer (`auth.service.ts`)
- Handles business logic for registration and login
- Manages password hashing and validation
- Generates JWT tokens
- Performs database operations

### Middleware Layer (`auth.ts`)
- Validates JWT tokens on protected routes
- Extracts user information from tokens
- Attaches user object to request
- Handles authentication errors

### Integration with RBAC
- Works seamlessly with role-based access control
- User role attached to request object
- Permission checking handled by RBAC middleware
- Supports hierarchical permission systems

---

## 📞 Troubleshooting

### Common Issues

#### "Token is not valid" Error
- Check if token has expired (7-day limit)
- Verify JWT_SECRET matches between token generation and validation
- Ensure user account is still active and not deleted

#### "No token, authorization denied" Error
- Include `Authorization: Bearer <token>` header
- Check token format and spelling
- Ensure token is being sent correctly from frontend

#### "Invalid credentials" Error
- Verify email and password are correct
- Check if user account exists
- Ensure user status is "active"

#### Role-related Login Issues
- Verify the role specified in login matches user's assigned role
- Check if user has the correct role in database
- Ensure role validation logic is working correctly

---

For more information, see the [User Management Documentation](./user.md) and [Main README](./README.md).