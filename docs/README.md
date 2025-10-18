# 🚀 Tricycle API Documentation

A comprehensive TypeScript Express.js API with MongoDB, Prisma, JWT authentication, and role-based access control (RBAC) for a tricycle booking system.

---

## � Documentation Overview

This documentation is organized into focused sections for easy navigation:

### � Documentation Sections

| Section | Description | Link |
|---------|-------------|------|
| **🔐 Authentication** | JWT-based auth system, login, registration, security | [auth.md](./auth.md) |
| **👥 User Management** | CRUD operations, search, RBAC, user profiles | [user.md](./user.md) |

---

## 🎯 Quick Overview

### System Architecture
- **Backend:** TypeScript + Express.js
- **Database:** MongoDB with Prisma ORM
- **Authentication:** JWT tokens with 7-day expiration
- **Authorization:** Role-based access control (RBAC)
- **Security:** bcrypt password hashing, rate limiting, CORS

### User Roles & Permissions
| Role | Description | Access Level |
|------|-------------|--------------|
| **`admin`** | System administrator | Full CRUD access to all resources |
| **`driver`** | Tricycle driver | Read-only access to user data |
| **`passenger`** | Regular user | Read-only access to user data |

### API Base URL
```
http://localhost:5000/api
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js (v14+)
- MongoDB database
- npm or yarn

### 2. Environment Setup
Create `.env` file:
```env
NODE_ENV=development
PORT=5000
DATABASE_URL="mongodb://localhost:27017/tricycle-db"
JWT_SECRET=your-super-secret-jwt-key
FRONTEND_URL=http://localhost:3000
```

### 3. Installation
```bash
# Install dependencies
npm install

# Setup database
npm run db:generate
npm run db:push

# Start development server
npm run dev
```

### 4. Test the API
```bash
# Health check
curl http://localhost:5000/health

# Register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"John","lastName":"Doe","email":"john@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123","role":"passenger"}'
```

---

## � API Endpoints Summary

### Authentication Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/auth/register` | Register new user | ❌ No |
| `POST` | `/api/auth/login` | User login | ❌ No |

### User Management Endpoints
| Method | Endpoint | Description | Auth Required | Permission |
|--------|----------|-------------|---------------|------------|
| `GET` | `/api/user` | Get all users | ✅ Yes | Any authenticated user |
| `GET` | `/api/user/search` | Search users | ✅ Yes | Any authenticated user |
| `GET` | `/api/user/:id` | Get user by ID | ✅ Yes | Any authenticated user |
| `POST` | `/api/user/create/admin` | Create user | ✅ Yes | Admin only |
| `PATCH` | `/api/user/:id` | Update user | ✅ Yes | Admin only |
| `PUT` | `/api/user/:id` | Delete user (soft) | ✅ Yes | Admin only |

---

## 🔧 Key Features

### 🔐 Security Features
- **JWT Authentication:** Stateless token-based auth
- **Password Hashing:** bcrypt with 10 salt rounds
- **Role-Based Access Control:** Fine-grained permissions
- **Rate Limiting:** 100 requests per 15 minutes per IP
- **CORS Protection:** Configurable origin allowlist
- **Input Validation:** Request body validation and sanitization

### 🎯 User Management Features
- **Advanced Search:** Text search across multiple fields
- **Filtering:** Filter by role, status, and other criteria
- **Pagination:** Efficient handling of large datasets
- **Soft Delete:** Data preservation with audit trails
- **Metadata Support:** Extensible user profiles
- **Status Management:** Active/inactive/banned user states

### 🛠️ Developer Features
- **TypeScript:** Full type safety and IDE support
- **Prisma ORM:** Type-safe database operations
- **Winston Logging:** Structured logging with file rotation
- **Error Handling:** Consistent error responses
- **API Documentation:** Comprehensive endpoint documentation
- **Development Tools:** Hot reload, debugging support

---

## 📖 Detailed Documentation

For comprehensive information on specific aspects of the API:

### 🔐 [Authentication Documentation](./auth.md)
**Complete guide to the authentication system:**
- User registration and login processes
- JWT token management and security
- Role-based access control implementation
- Password security and validation
- Authentication middleware usage
- Error handling and troubleshooting
- Integration examples with frontend applications

### 👥 [User Management Documentation](./user.md)
**Comprehensive user management system guide:**
- Complete CRUD operations for users
- Advanced search functionality with filtering
- User roles and permission management
- Metadata system for user profiles
- Soft delete implementation
- Pagination and performance optimization
- Frontend integration examples
- API endpoint reference with examples

---

## 🌟 Getting Help

### Development Resources
- **API Testing:** Use tools like Postman, Insomnia, or cURL
- **Database Management:** Prisma Studio (`npm run db:studio`)
- **Logs:** Check `logs/` directory for error logs
- **Health Check:** `GET /health` endpoint for system status

### Common Use Cases
1. **Basic Integration:** Start with [Authentication Guide](./auth.md)
2. **User Management:** See [User Documentation](./user.md)
3. **Search Implementation:** Check search examples in [User Guide](./user.md#search-functionality)
4. **Role Management:** Review RBAC section in both guides

### Troubleshooting
- **Authentication Issues:** See [Auth Troubleshooting](./auth.md#troubleshooting)
- **Permission Errors:** Check [RBAC Documentation](./user.md#role-based-access-control)
- **Search Problems:** Review [Search Guide](./user.md#search-functionality)

---

## 📞 Support & Contributing

For questions, issues, or contributions:
- Review the detailed documentation in [auth.md](./auth.md) and [user.md](./user.md)
- Check the troubleshooting sections in each guide
- Ensure you're following the API conventions and security practices outlined in the documentation

**Happy coding! 🎉**