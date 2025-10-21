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
| **Create User** | `POST /api/user/admin` | Admin role | ✅ | ❌ | ❌ |
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

**Description:** Retrieve all active (non-deleted) users with advanced filtering, pagination, sorting, and dynamic field selection.

**Required Permission:** Authentication only

**Query Parameters:**
| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `page` | number | No | Page number for pagination (default: 1) | `2` |
| `limit` | number | No | Results per page (default: 10) | `25` |
| `sort` | string | No | Field to sort by or JSON object | `"firstName"`, `"createdAt"` |
| `order` | string | No | Sort order: "asc" or "desc" (default: "desc") | `"asc"` |
| `fields` | string | No | Comma-separated fields to return (default: "id") | `"firstName,lastName,email"` |
| `query` | string | No | Text search (specify fields with queryFields) | `"john"` |
| `queryFields` | string | No | Fields to search in (default: firstName,lastName,middleName,email) | `"firstName,email"` |
| `filter_*` | any | No | Dynamic filters using prefix (e.g., filter_role) | `filter_role=driver` |

**Example Requests:**
```http
# Basic request (returns only id field)
GET /api/user

# Get specific fields with pagination
GET /api/user?fields=firstName,lastName,email&page=1&limit=5

# Search with filtering and sorting
GET /api/user?query=john&filter_role=driver&sort=firstName&order=asc

# Complex filtering with nested field selection
GET /api/user?filter_status=active&fields=firstName,lastName,metadata.phone&limit=20

# Multiple filters
GET /api/user?filter_role=passenger&filter_status=active&fields=firstName,lastName,email,createdAt
```

**Response (200):**
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": [
    {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 10,
    "totalPages": 15,
    "hasMore": true
  }
}
```

**Field Selection Examples:**
```http
# Get only basic info
GET /api/user?fields=firstName,lastName,email

# Include nested metadata fields
GET /api/user?fields=firstName,lastName,metadata.phone,metadata.address

# Get all user fields (comprehensive)
GET /api/user?fields=id,firstName,lastName,middleName,email,role,status,avatar,metadata,createdAt,updatedAt
```

---

### Get User by ID
```http
GET /api/user/{userId}
```

**Description:** Retrieve detailed information about a specific user by their unique ID with dynamic field selection.

**Path Parameters:**
- `userId` (string) - MongoDB ObjectId of the user

**Query Parameters:**
| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `fields` | string | No | Comma-separated fields to return (default: "id") | `"firstName,lastName,email,metadata.phone"` |

**Required Permission:** Authentication only

**Example Requests:**
```http
# Get only ID (default)
GET /api/user/507f1f77bcf86cd799439011

# Get specific fields
GET /api/user/507f1f77bcf86cd799439011?fields=firstName,lastName,email

# Get full user profile
GET /api/user/507f1f77bcf86cd799439011?fields=id,firstName,lastName,middleName,email,role,status,avatar,metadata,createdAt,updatedAt

# Get user with specific metadata fields
GET /api/user/507f1f77bcf86cd799439011?fields=firstName,lastName,metadata.phone,metadata.address
```

**Response (200) - Default (ID only):**
```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "id": "507f1f77bcf86cd799439011"
  }
}
```

**Response (200) - With Selected Fields:**
```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "metadata": {
      "phone": "+1234567890"
    }
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

> **📌 Note:** Search functionality has been unified into the `GET /api/user` endpoint. Use the `query` parameter for text search and `filter_*` parameters for advanced filtering. The dedicated search endpoint has been deprecated in favor of this more powerful and flexible approach.

---

### Create User (Admin Only)
```http
POST /api/user/admin
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

## � Advanced Features

### Dynamic Filtering System

The API supports flexible filtering using the `filter_` prefix for any field in the User model. This allows you to filter by any user attribute without hardcoded parameters.

#### Filter Syntax
```
filter_{fieldName}={value}
```

#### Supported Filter Examples:
```http
# Filter by role
GET /api/user?filter_role=driver

# Filter by status
GET /api/user?filter_status=active

# Filter by first name
GET /api/user?filter_firstName=John

# Filter by nested metadata fields
GET /api/user?filter_metadata.age=25

# Multiple filters (AND operation)
GET /api/user?filter_role=driver&filter_status=active&filter_firstName=John
```

### Dynamic Field Selection

Control exactly which fields are returned in the response using the `fields` parameter. This reduces payload size and improves performance.

#### Field Selection Syntax
```
fields=field1,field2,field3
```

#### Field Selection Examples:
```http
# Basic user info
GET /api/user?fields=firstName,lastName,email

# Include role and status
GET /api/user?fields=firstName,lastName,email,role,status

# Nested metadata fields
GET /api/user?fields=firstName,lastName,metadata.phone,metadata.address

# All fields (comprehensive response)
GET /api/user?fields=id,firstName,lastName,middleName,email,role,status,avatar,metadata,createdAt,updatedAt

# Default behavior (only ID)
GET /api/user
```

### Pagination & Sorting

Advanced pagination with sorting capabilities for efficient data retrieval.

#### Pagination Parameters:
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 10)

#### Sorting Parameters:
- `sort` - Field to sort by (default: "createdAt")
- `order` - Sort direction: "asc" or "desc" (default: "desc")

#### Examples:
```http
# Page 2 with 20 results, sorted by firstName ascending
GET /api/user?page=2&limit=20&sort=firstName&order=asc

# Sort by creation date (newest first)
GET /api/user?sort=createdAt&order=desc

# Sort by multiple fields (JSON format)
GET /api/user?sort={"role":"asc","firstName":"asc"}
```

### Text Search

Search across multiple text fields simultaneously using the `query` parameter.

#### Searchable Fields:
- `firstName`
- `lastName` 
- `middleName`
- `email`

#### Search Examples:
```http
# Basic text search
GET /api/user?query=john

# Text search with filtering
GET /api/user?query=smith&filter_role=driver

# Text search with field selection
GET /api/user?query=doe&fields=firstName,lastName,email,role
```

### Combined Advanced Queries

Combine all features for powerful, flexible queries:

```http
# Complex query example
GET /api/user?query=john&filter_role=driver&filter_status=active&fields=firstName,lastName,email,metadata.phone&page=1&limit=5&sort=firstName&order=asc

# Performance-optimized query (minimal fields)
GET /api/user?filter_status=active&fields=id,firstName,lastName&limit=50

# Metadata-based filtering with nested field selection
GET /api/user?filter_metadata.age=30&fields=firstName,lastName,metadata.age,metadata.phone&sort=createdAt&order=desc
```

---

## �💻 Examples

### Complete User Management Workflow

#### 1. Get All Users (Basic - Returns only IDs)
```bash
export TOKEN="your-jwt-token-here"

curl -X GET "http://localhost:5000/api/user" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

#### 2. Get Users with Specific Fields
```bash
# Get basic user information
curl -X GET "http://localhost:5000/api/user?fields=firstName,lastName,email,role" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

#### 3. Search and Filter Users
```bash
# Search for "john" in names/email with driver role
curl -X GET "http://localhost:5000/api/user?query=john&filter_role=driver&fields=firstName,lastName,email" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Filter active passengers with pagination
curl -X GET "http://localhost:5000/api/user?filter_role=passenger&filter_status=active&page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

#### 4. Advanced Query with Sorting
```bash
# Get drivers sorted by name with metadata
curl -X GET "http://localhost:5000/api/user?filter_role=driver&fields=firstName,lastName,email,metadata.phone&sort=firstName&order=asc&limit=20" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

#### 5. Get User Details by ID
```bash
# Get only ID (default)
curl -X GET "http://localhost:5000/api/user/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Get specific user fields
curl -X GET "http://localhost:5000/api/user/507f1f77bcf86cd799439011?fields=firstName,lastName,email,metadata.phone" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

#### 6. Create New User (Admin only)
```bash
curl -X POST "http://localhost:5000/api/user/admin" \
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

#### 7. Update User Information (Admin only)
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

## 🎉 What's New

### Enhanced User API Features (v2.0)

The User API has been significantly enhanced with powerful new features:

#### 🔥 Key Improvements:
- **Dynamic Field Selection**: Control exactly which fields are returned using the `fields` parameter
- **Advanced Filtering**: Use `filter_*` prefix to filter by any user field dynamically
- **Unified Search**: Text search, filtering, pagination, and sorting all in one endpoint
- **Performance Optimization**: Default response returns only `id` field unless specified
- **Enhanced Pagination**: Improved pagination with `page`/`limit` instead of `offset`
- **Flexible Sorting**: Sort by any field with `sort` and `order` parameters
- **Nested Field Support**: Access nested metadata fields with dot notation

#### 🚀 Benefits:
- **Reduced Payload Size**: Only fetch the data you need
- **Better Performance**: Optimized queries and minimal default responses  
- **Flexible Filtering**: Filter by any field without hardcoded parameters
- **Developer Friendly**: Intuitive API design with consistent patterns
- **Backward Compatible**: Existing functionality preserved while adding new features

#### 📚 Migration Guide:
- **Old**: `GET /api/user/search?role=driver` 
- **New**: `GET /api/user?filter_role=driver&fields=firstName,lastName,email`

The enhanced API provides more power and flexibility while maintaining simplicity and performance.

---

For more information, see the [Authentication Documentation](./auth.md) and [Main README](./README.md).