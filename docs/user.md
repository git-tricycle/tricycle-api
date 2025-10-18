# 👥 User Management System Documentation

Comprehensive guide to the user management system with CRUD operations, search functionality, and role-based permissions.

---

## 📋 Table of Contents

- [Overview](#overview)
- [User Data Structure](#user-data-structure)
- [Role-Based Access Control](#role-based-access-control)
- [API Endpoints](#api-endpoints)
- [Search Functionality](#search-functionality)
- [Permission System](#permission-system)
- [Error Handling](#error-handling)
- [Examples](#examples)

---

## 🎯 Overview

The User Management System provides comprehensive CRUD operations for managing users in the Tricycle API. It includes advanced search capabilities, role-based permissions, soft delete functionality, and detailed user profiles with metadata support.

### Key Features:
- Complete CRUD operations (Create, Read, Update, Delete)
- Advanced search with pagination
- Role-based access control
- Soft delete (users are never permanently removed)
- Metadata support for additional user information
- Comprehensive logging and audit trails

---

## 👤 User Data Structure

### Complete User Model
```typescript
interface User {
  id: string;           // Auto-generated MongoDB ObjectId
  firstName: string;    // Required - User's first name
  lastName: string;     // Required - User's last name
  middleName?: string;  // Optional - User's middle name
  email: string;        // Required, unique - User's email address
  password: string;     // Required - Hashed password (bcrypt)
  role: Role;          // Required - User role (admin | driver | passenger)
  status: Status;      // Required - User status (active | inactive | banned)
  avatar?: string;     // Optional - Profile picture URL
  metadata?: {         // Optional - Additional user information
    address?: string;    // Physical address
    phone?: string;      // Phone number
    age?: number;        // User's age
    gender?: Gender;     // Gender (male | female | other)
  };
  isDeleted: boolean;  // Soft delete flag - defaults to false
  createdAt: Date;     // Auto-generated creation timestamp
  updatedAt: Date;     // Auto-updated modification timestamp
}
```

### User Roles
| Role | Description | Default Permissions |
|------|-------------|-------------------|
| **`admin`** | System administrator | All permissions |
| **`driver`** | Tricycle driver | Read users only |
| **`passenger`** | Regular user | Read users only |

### User Status
| Status | Description | Login Access |
|--------|-------------|--------------|
| **`active`** | Normal active account | ✅ Yes |
| **`inactive`** | Temporarily disabled | ❌ No |
| **`banned`** | Permanently blocked | ❌ No |

---

## 🛡️ Role-Based Access Control

### Permission Matrix

| Action | Endpoint | Required Permission | Admin | Driver | Passenger |
|--------|----------|-------------------|-------|---------|-----------|
| **View All Users** | `GET /api/user` | Authentication | ✅ | ✅ | ✅ |
| **View User by ID** | `GET /api/user/{id}` | Authentication | ✅ | ✅ | ✅ |
| **Search Users** | `GET /api/user/search` | Authentication | ✅ | ✅ | ✅ |
| **Create User** | `POST /api/user/create/admin` | Admin role | ✅ | ❌ | ❌ |
| **Update User** | `PATCH /api/user/{id}` | Write permission | ✅ | ❌ | ❌ |
| **Delete User** | `PUT /api/user/{id}` | Delete permission | ✅ | ❌ | ❌ |

### Permission Definitions
```typescript
type Permission = "read:users" | "write:users" | "delete:users" | "admin:all";

const ROLE_PERMISSIONS = {
  admin: ["read:users", "write:users", "delete:users", "admin:all"],
  driver: ["read:users"],
  passenger: ["read:users"],
};
```

---

## 🚀 API Endpoints

> **⚠️ Authentication Required:** All endpoints require JWT token in Authorization header:
> ```
> Authorization: Bearer <your-jwt-token>
> ```

### Get All Users
```http
GET /api/user
```

**Description:** Retrieve all active (non-deleted) users in the system, ordered by creation date (newest first).

**Required Permission:** Authentication only

**Response (200):**
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "firstName": "John",
      "lastName": "Doe",
      "middleName": "Michael",
      "email": "john.doe@example.com",
      "role": "passenger",
      "status": "active",
      "avatar": "https://example.com/avatar.jpg",
      "metadata": {
        "address": "123 Main St, City",
        "phone": "+1234567890",
        "age": 30,
        "gender": "male"
      },
      "createdAt": "2025-10-18T10:00:00.000Z",
      "updatedAt": "2025-10-18T10:00:00.000Z"
    }
  ]
}
```

---

### Get User by ID
```http
GET /api/user/{userId}
```

**Description:** Retrieve detailed information about a specific user by their unique ID.

**Path Parameters:**
- `userId` (string) - MongoDB ObjectId of the user

**Required Permission:** Authentication only

**Response (200):**
```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "firstName": "John",
    "lastName": "Doe",
    "middleName": "Michael",
    "email": "john.doe@example.com",
    "role": "passenger",
    "status": "active",
    "avatar": "https://example.com/avatar.jpg",
    "metadata": {
      "address": "123 Main St, City",
      "phone": "+1234567890",
      "age": 30,
      "gender": "male"
    },
    "createdAt": "2025-10-18T10:00:00.000Z",
    "updatedAt": "2025-10-18T10:00:00.000Z"
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "User not found"
}
```

---

### Search Users
```http
GET /api/user/search
```

**Description:** Advanced search functionality with filtering and pagination support.

**Query Parameters:**
| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `query` | string | No | Search text (firstName, lastName, middleName, email) | `"john"` |
| `role` | string | No | Filter by user role | `"driver"`, `"passenger"`, `"admin"` |
| `status` | string | No | Filter by user status | `"active"`, `"inactive"`, `"banned"` |
| `limit` | number | No | Results per page (default: 10, max: 100) | `20` |
| `offset` | number | No | Skip records for pagination (default: 0) | `10` |

**Example Requests:**
```http
# Basic text search
GET /api/user/search?query=john

# Filter by role
GET /api/user/search?role=driver

# Combined search with pagination
GET /api/user/search?query=smith&role=passenger&status=active&limit=5&offset=0

# Status filter only
GET /api/user/search?status=banned
```

**Response (200):**
```json
{
  "success": true,
  "message": "Users search completed successfully",
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "firstName": "John",
      "lastName": "Smith",
      "middleName": null,
      "email": "john.smith@example.com",
      "role": "passenger",
      "status": "active",
      "avatar": null,
      "metadata": {
        "phone": "+1555000123"
      },
      "createdAt": "2025-10-18T09:30:00.000Z",
      "updatedAt": "2025-10-18T09:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

---

### Create User (Admin Only)
```http
POST /api/user/create/admin
```

**Description:** Create a new user account. Only administrators can create users through this endpoint.

**Required Permission:** Admin role

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "middleName": "Marie",
  "email": "jane.smith@example.com",
  "password": "securePassword123",
  "role": "driver",
  "status": "active",
  "metadata": {
    "address": "456 Oak Street, Springfield",
    "phone": "+1987654321",
    "age": 35,
    "gender": "female"
  }
}
```

**Field Validation:**
- `firstName`: Required, string, min 1 character
- `lastName`: Required, string, min 1 character
- `middleName`: Optional, string
- `email`: Required, valid email format, must be unique
- `password`: Required, string, min 6 characters
- `role`: Optional, defaults to "passenger"
- `status`: Optional, defaults to "active"
- `metadata`: Optional object with user details

**Success Response (201):**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "507f1f77bcf86cd799439012",
    "firstName": "Jane",
    "lastName": "Smith",
    "middleName": "Marie",
    "email": "jane.smith@example.com",
    "metadata": {
      "address": "456 Oak Street, Springfield",
      "phone": "+1987654321",
      "age": 35,
      "gender": "female"
    },
    "createdAt": "2025-10-18T11:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "User already exists"
}
```

**Error Response (403):**
```json
{
  "success": false,
  "message": "Insufficient permissions"
}
```

---

### Update User
```http
PATCH /api/user/{userId}
```

**Description:** Update an existing user's information. Supports partial updates.

**Path Parameters:**
- `userId` (string) - MongoDB ObjectId of the user to update

**Required Permission:** Write permission (Admin only)

**Request Body (all fields optional):**
```json
{
  "firstName": "Jane",
  "lastName": "Johnson",
  "middleName": "Marie",
  "email": "jane.johnson@example.com",
  "role": "admin",
  "status": "inactive",
  "avatar": "https://example.com/new-avatar.jpg",
  "password": "newSecurePassword456",
  "metadata": {
    "address": "789 Pine Street, Riverside",
    "phone": "+1555000789",
    "age": 36,
    "gender": "female"
  }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "id": "507f1f77bcf86cd799439012",
    "firstName": "Jane",
    "lastName": "Johnson",
    "middleName": "Marie",
    "email": "jane.johnson@example.com",
    "role": "admin",
    "status": "inactive",
    "avatar": "https://example.com/new-avatar.jpg",
    "metadata": {
      "address": "789 Pine Street, Riverside",
      "phone": "+1555000789",
      "age": 36,
      "gender": "female"
    },
    "createdAt": "2025-10-18T11:00:00.000Z",
    "updatedAt": "2025-10-18T12:00:00.000Z"
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "User not found"
}
```

---

### Delete User (Soft Delete)
```http
PUT /api/user/{userId}
```

**Description:** Soft delete a user account. User data is preserved but marked as deleted.

**Path Parameters:**
- `userId` (string) - MongoDB ObjectId of the user to delete

**Required Permission:** Delete permission (Admin only)

**Success Response (200):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "User not found"
}
```

**Note:** Soft deleted users:
- Cannot login or authenticate
- Are excluded from all user listings and searches
- Data is preserved for audit and recovery purposes
- Can be restored by setting `isDeleted: false` directly in database

---

## 🔍 Search Functionality

### Text Search Capabilities
The search functionality performs case-insensitive partial matching across multiple fields:

- **`firstName`** - User's first name
- **`lastName`** - User's last name  
- **`middleName`** - User's middle name (if provided)
- **`email`** - User's email address

### Search Logic
```typescript
// Example: searching for "john" will match:
// - firstName: "John", "Johnny", "Johnson"  
// - lastName: "Johnson", "Johns"
// - email: "john.doe@example.com", "johndoe@email.com"
```

### Filtering Options
1. **Role Filter:** Exact match on user role
2. **Status Filter:** Exact match on user status
3. **Text Search:** Partial match across name and email fields
4. **Combined Filters:** All filters can be used together

### Pagination
- **Default limit:** 10 users per page
- **Maximum limit:** 100 users per page
- **Offset-based pagination:** Use offset parameter for page navigation
- **Total count:** Always returned for pagination UI
- **hasMore flag:** Indicates if more results are available

### Search Examples
```bash
# Find all drivers
curl "http://localhost:5000/api/user/search?role=driver" \
  -H "Authorization: Bearer $TOKEN"

# Search for users named "john"
curl "http://localhost:5000/api/user/search?query=john" \
  -H "Authorization: Bearer $TOKEN"

# Find banned users (admin use case)
curl "http://localhost:5000/api/user/search?status=banned" \
  -H "Authorization: Bearer $TOKEN"

# Complex search: active drivers named "smith"
curl "http://localhost:5000/api/user/search?query=smith&role=driver&status=active" \
  -H "Authorization: Bearer $TOKEN"

# Paginated search: second page with 20 results
curl "http://localhost:5000/api/user/search?limit=20&offset=20" \
  -H "Authorization: Bearer $TOKEN"
```

---

## ⚠️ Error Handling

### Common Error Responses

#### Authentication Required (401)
```json
{
  "success": false,
  "message": "No token, authorization denied"
}
```

#### Insufficient Permissions (403)
```json
{
  "success": false,
  "message": "Insufficient permissions"
}
```

#### User Not Found (404)
```json
{
  "success": false,
  "message": "User not found"
}
```

#### User Already Exists (400)
```json
{
  "success": false,
  "message": "User already exists"
}
```

#### Server Error (500)
```json
{
  "success": false,
  "message": "Server error"
}
```

### HTTP Status Code Reference
- **200** - Success (GET, PATCH operations)
- **201** - Created (POST operations)
- **400** - Bad Request (validation errors, duplicate data)
- **401** - Unauthorized (missing or invalid authentication)
- **403** - Forbidden (insufficient permissions)
- **404** - Not Found (user doesn't exist)
- **500** - Internal Server Error (system errors)

---

## 💻 Examples

### Complete User Management Workflow

#### 1. Get All Users (Any authenticated user)
```bash
export TOKEN="your-jwt-token-here"

curl -X GET "http://localhost:5000/api/user" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

#### 2. Search for Specific Users
```bash
# Search for drivers
curl -X GET "http://localhost:5000/api/user/search?role=driver&limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

#### 3. Get User Details
```bash
curl -X GET "http://localhost:5000/api/user/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

#### 4. Create New User (Admin only)
```bash
curl -X POST "http://localhost:5000/api/user/create/admin" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Alice",
    "lastName": "Cooper",
    "email": "alice.cooper@example.com",
    "password": "securePass123",
    "role": "driver",
    "metadata": {
      "phone": "+1555987654",
      "address": "321 Elm Street",
      "age": 29
    }
  }'
```

#### 5. Update User Information (Admin only)
```bash
curl -X PATCH "http://localhost:5000/api/user/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "inactive",
    "metadata": {
      "phone": "+1555111222"
    }
  }'
```

#### 6. Delete User (Admin only)
```bash
curl -X PUT "http://localhost:5000/api/user/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

### Frontend Integration Examples

#### React/JavaScript Example
```javascript
const API_BASE = 'http://localhost:5000/api';

class UserService {
  constructor(token) {
    this.token = token;
    this.headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  // Get all users
  async getAllUsers() {
    const response = await fetch(`${API_BASE}/user`, {
      headers: this.headers,
    });
    return response.json();
  }

  // Search users with filters
  async searchUsers({ query, role, status, limit = 10, offset = 0 }) {
    const params = new URLSearchParams({
      ...(query && { query }),
      ...(role && { role }),
      ...(status && { status }),
      limit: limit.toString(),
      offset: offset.toString(),
    });

    const response = await fetch(`${API_BASE}/user/search?${params}`, {
      headers: this.headers,
    });
    return response.json();
  }

  // Get user by ID
  async getUserById(userId) {
    const response = await fetch(`${API_BASE}/user/${userId}`, {
      headers: this.headers,
    });
    return response.json();
  }

  // Create new user (admin only)
  async createUser(userData) {
    const response = await fetch(`${API_BASE}/user/create/admin`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(userData),
    });
    return response.json();
  }

  // Update user (admin only)
  async updateUser(userId, updates) {
    const response = await fetch(`${API_BASE}/user/${userId}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(updates),
    });
    return response.json();
  }

  // Delete user (admin only)
  async deleteUser(userId) {
    const response = await fetch(`${API_BASE}/user/${userId}`, {
      method: 'PUT',
      headers: this.headers,
    });
    return response.json();
  }
}

// Usage example
const userService = new UserService(localStorage.getItem('authToken'));

// Search for active drivers
const searchDrivers = async () => {
  try {
    const result = await userService.searchUsers({
      role: 'driver',
      status: 'active',
      limit: 20
    });
    
    if (result.success) {
      console.log('Found drivers:', result.data);
      console.log('Pagination info:', result.pagination);
    }
  } catch (error) {
    console.error('Search failed:', error);
  }
};
```

#### React Component Example
```jsx
import React, { useState, useEffect } from 'react';

const UserManagement = ({ userService }) => {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({});

  const searchUsers = async () => {
    setLoading(true);
    try {
      const result = await userService.searchUsers({
        query: searchQuery,
        role: roleFilter || undefined,
        limit: 10,
        offset: 0
      });

      if (result.success) {
        setUsers(result.data);
        setPagination(result.pagination);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    searchUsers();
  }, [searchQuery, roleFilter]);

  return (
    <div className="user-management">
      <div className="search-controls">
        <input
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="driver">Driver</option>
          <option value="passenger">Passenger</option>
        </select>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="user-list">
          {users.map(user => (
            <div key={user.id} className="user-card">
              <h3>{user.firstName} {user.lastName}</h3>
              <p>Email: {user.email}</p>
              <p>Role: {user.role}</p>
              <p>Status: {user.status}</p>
            </div>
          ))}
        </div>
      )}

      <div className="pagination-info">
        Showing {users.length} of {pagination.total} users
        {pagination.hasMore && <span> - More results available</span>}
      </div>
    </div>
  );
};
```

---

## 🔧 Advanced Features

### Soft Delete Implementation
- Users are never permanently deleted from the database
- `isDeleted` flag is set to `true` instead of removing records
- Deleted users are excluded from all queries automatically
- Audit trail is preserved for compliance and recovery

### Metadata System
The metadata field allows storing additional user information:
```json
{
  "metadata": {
    "address": "Full street address",
    "phone": "Contact phone number",
    "age": 25,
    "gender": "male | female | other"
  }
}
```

### Audit Logging
All user operations are logged with:
- User ID performing the action
- Timestamp of the operation
- IP address and user agent
- Success/failure status
- Error details (if applicable)

### Performance Considerations
- Database indexes on frequently queried fields (email, role, status)
- Pagination prevents large result sets
- Efficient MongoDB queries with proper field selection
- Caching strategies for frequently accessed user data

---

## 📞 Troubleshooting

### Common Issues and Solutions

#### Search Not Finding Users
- Check if users are soft deleted (`isDeleted: true`)
- Verify search query spelling and case sensitivity
- Ensure proper authentication token is provided

#### Permission Denied Errors
- Verify user role has required permissions
- Check if user account is active
- Ensure JWT token is valid and not expired

#### Performance Issues with Large User Base
- Implement pagination with reasonable limits
- Use specific search criteria to narrow results
- Consider adding database indexes for frequently searched fields

#### User Creation Failures
- Check for unique email constraint violations
- Verify all required fields are provided
- Ensure password meets security requirements

---

For more information, see the [Authentication Documentation](./auth.md) and [Main README](./README.md).