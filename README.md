# 🚲 Tricycle API

A modern, production-ready TypeScript Express.js API for tricycle booking and ride-sharing services, featuring robust authentication, user management, and role-based access control.

[![Node.js](https://img.shields.io/badge/Node.js-v14+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.0+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4.0+-47A248?logo=mongodb&logoColor=white)](https://mongodb.com/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)](https://prisma.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📋 Table of Contents

- [🌟 Features](#-features)
- [🏗️ Tech Stack](#️-tech-stack)
- [🚀 Quick Start](#-quick-start)
- [📁 Project Structure](#-project-structure)
- [🔧 Configuration](#-configuration)
- [📖 API Documentation](#-api-documentation)
- [🛡️ Security](#️-security)
- [🧪 Testing](#-testing)
- [🚀 Deployment](#-deployment)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## 🌟 Features

### 🔐 Authentication & Authorization

- **JWT-based Authentication** - Secure, stateless token authentication
- **Role-Based Access Control (RBAC)** - Fine-grained permission system
- **Multi-Role Support** - Admin, Driver, and Passenger roles
- **Password Security** - bcrypt hashing with configurable salt rounds

### 👥 User Management

- **Complete CRUD Operations** - Create, read, update, and delete users
- **Advanced Search** - Multi-field text search with filtering
- **Soft Delete** - Data preservation with audit trails
- **User Profiles** - Extensible metadata system for user information

### 🛡️ Security & Performance

- **Rate Limiting** - Protection against abuse and DoS attacks
- **CORS Configuration** - Secure cross-origin resource sharing
- **Input Validation** - Request sanitization and validation
- **Structured Logging** - Winston-based logging with file rotation

### 🎯 Developer Experience

- **TypeScript** - Full type safety and excellent IDE support
- **Prisma ORM** - Type-safe database operations
- **Hot Reload** - Development server with automatic restarts
- **Comprehensive Documentation** - Detailed API and system docs

---

## 🏗️ Tech Stack

### Backend Framework

- **[Express.js](https://expressjs.com/)** - Fast, unopinionated web framework
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript development
- **[Node.js](https://nodejs.org/)** - JavaScript runtime environment

### Database & ORM

- **[MongoDB](https://mongodb.com/)** - NoSQL document database
- **[Prisma](https://prisma.io/)** - Modern database toolkit and ORM

### Authentication & Security

- **[jsonwebtoken](https://github.com/auth0/node-jsonwebtoken)** - JWT implementation
- **[bcryptjs](https://github.com/dcodeIO/bcrypt.js/)** - Password hashing library
- **[helmet](https://helmetjs.github.io/)** - Security middleware collection
- **[express-rate-limit](https://github.com/nfriedly/express-rate-limit)** - Rate limiting middleware

### Development Tools

- **[nodemon](https://nodemon.io/)** - Development server with auto-restart
- **[winston](https://github.com/winstonjs/winston)** - Logging library
- **[cors](https://github.com/expressjs/cors)** - CORS middleware

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v14 or higher)
- **MongoDB** (v4.0 or higher)
- **npm** or **yarn**

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/git-tricycle/tricycle-api.git
   cd tricycle-api
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configuration:

   ```env
   NODE_ENV=development
   PORT=5000
   DATABASE_URL="mongodb://localhost:27017/tricycle-db"
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   FRONTEND_URL=http://localhost:3000
   ```

4. **Set up the database**

   ```bash
   # Generate Prisma client
   npm run db:generate

   # Push schema to database
   npm run db:push
   ```

5. **Start the development server**

   ```bash
   npm run dev
   ```

6. **Verify installation**
   ```bash
   curl http://localhost:5000/health
   ```

The API will be available at `http://localhost:5000`

---

## 📁 Project Structure

```
tricycle-api/
├── 📂 src/
│   ├── 📂 lib/           # Database connections and utilities
│   ├── 📂 middleware/    # Express middleware (auth, RBAC, logging)
│   ├── 📂 routes/        # API route definitions
│   ├── 📂 services/      # Business logic layer
│   ├── 📂 types/         # TypeScript type definitions
│   ├── 📂 utils/         # Helper utilities
│   └── 📄 index.ts       # Application entry point
├── 📂 prisma/
│   └── 📂 schema/        # Database schema definitions
├── 📂 docs/              # API documentation
│   ├── 📄 README.md      # Documentation overview
│   ├── 📄 auth.md        # Authentication system docs
│   └── 📄 user.md        # User management docs
├── 📂 logs/              # Application logs
├── 📄 .env.example       # Environment variables template
├── 📄 package.json       # Project dependencies and scripts
├── 📄 tsconfig.json      # TypeScript configuration
└── 📄 README.md          # This file
```

### Key Directories

- **`src/`** - Main source code directory
- **`src/middleware/`** - Authentication, RBAC, logging, and error handling
- **`src/services/`** - Business logic separated from route handlers
- **`src/routes/`** - API endpoint definitions and request handling
- **`prisma/schema/`** - Database models and schema definitions
- **`docs/`** - Comprehensive API documentation

---

## 🔧 Configuration

### Environment Variables

| Variable       | Description                       | Default                 | Required |
| -------------- | --------------------------------- | ----------------------- | -------- |
| `NODE_ENV`     | Application environment           | `development`           | No       |
| `PORT`         | Server port                       | `5000`                  | No       |
| `DATABASE_URL` | MongoDB connection string         | -                       | Yes      |
| `JWT_SECRET`   | JWT signing secret                | -                       | Yes      |
| `FRONTEND_URL` | Frontend application URL for CORS | `http://localhost:3000` | No       |

### Available Scripts

| Script          | Command               | Description                              |
| --------------- | --------------------- | ---------------------------------------- |
| **Development** | `npm run dev`         | Start development server with hot reload |
| **Build**       | `npm run build`       | Compile TypeScript to JavaScript         |
| **Production**  | `npm run start`       | Start production server                  |
| **Database**    | `npm run db:generate` | Generate Prisma client                   |
|                 | `npm run db:push`     | Push schema to database                  |
|                 | `npm run db:studio`   | Open Prisma Studio                       |
|                 | `npm run db:migrate`  | Run database migrations                  |

### Database Configuration

The application uses Prisma with MongoDB. Schema files are located in `prisma/schema/`:

- **`schema.prisma`** - Main Prisma configuration
- **`user.prisma`** - User model and related types

---

## 📖 API Documentation

Comprehensive API documentation is available in the `docs/` folder:

### 📚 Documentation Structure

| File                                   | Description                            | Content                                 |
| -------------------------------------- | -------------------------------------- | --------------------------------------- |
| **[docs/README.md](./docs/README.md)** | Documentation overview and quick start | API summary, navigation, setup guide    |
| **[docs/auth.md](./docs/auth.md)**     | Authentication system                  | JWT auth, login, registration, security |
| **[docs/user.md](./docs/user.md)**     | User management                        | CRUD operations, search, RBAC, examples |

### 🚀 Quick API Overview

**Base URL:** `http://localhost:5000/api`

**Authentication Endpoints:**

- `POST /auth/register` - User registration
- `POST /auth/login` - User login

**User Management Endpoints:**

- `GET /user` - List all users
- `GET /user/search` - Search users with filters
- `GET /user/:id` - Get user by ID
- `POST /user/create/admin` - Create user (Admin only)
- `PATCH /user/:id` - Update user (Admin only)
- `PUT /user/:id` - Delete user (Admin only)

For detailed endpoint documentation with examples, see the [docs folder](./docs/).

---

## 🛡️ Security

### Security Features

- **🔐 JWT Authentication** - Stateless token-based authentication
- **🔒 Password Hashing** - bcrypt with configurable salt rounds
- **🛡️ Role-Based Access Control** - Fine-grained permission system
- **⚡ Rate Limiting** - 100 requests per 15 minutes per IP
- **🔗 CORS Protection** - Configurable cross-origin policies
- **🧹 Input Sanitization** - Request validation and cleaning
- **📝 Audit Logging** - Comprehensive request and error logging

### Security Best Practices

1. **Environment Variables** - Store secrets in environment variables
2. **HTTPS** - Use HTTPS in production environments
3. **Database Security** - Use MongoDB authentication and encryption
4. **Regular Updates** - Keep dependencies updated for security patches
5. **Monitoring** - Monitor logs for suspicious activities

---

## 🧪 Testing

### Health Check

```bash
# Verify the API is running
curl http://localhost:5000/health
```

### Authentication Flow Test

```bash
# Register a new user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"John","lastName":"Doe","email":"john@example.com","password":"password123"}'

# Login with the user
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123","role":"passenger"}'
```

### Development Tools

- **Prisma Studio** - Visual database browser: `npm run db:studio`
- **Logs** - Check application logs in the `logs/` directory
- **API Testing** - Use Postman, Insomnia, or cURL for endpoint testing

---

## 🚀 Deployment

### Production Considerations

1. **Environment Setup**

   ```bash
   NODE_ENV=production
   PORT=80
   DATABASE_URL=your-production-mongodb-url
   JWT_SECRET=your-production-jwt-secret
   ```

2. **Build Application**

   ```bash
   npm run build
   npm run start
   ```

3. **Process Management**

   - Use PM2 or similar for process management
   - Set up automatic restarts and monitoring
   - Configure log rotation

4. **Security Hardening**
   - Use strong JWT secrets
   - Enable MongoDB authentication
   - Set up firewall rules
   - Use HTTPS with SSL certificates

### Recommended Hosting Platforms

- **Heroku** - Easy deployment with MongoDB Atlas
- **DigitalOcean** - VPS with Docker deployment
- **AWS EC2** - Scalable cloud infrastructure
- **Vercel** - Serverless deployment option

---

## 🤝 Contributing

We welcome contributions to the Tricycle API! Here's how you can help:

### Development Setup

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
4. **Test your changes**
5. **Commit and push**
   ```bash
   git commit -m "Add your feature description"
   git push origin feature/your-feature-name
   ```
6. **Create a Pull Request**

### Contribution Guidelines

- Follow the existing code style and conventions
- Add tests for new features
- Update documentation as needed
- Keep commits focused and descriptive
- Ensure all tests pass before submitting PR

### Code Style

- Use TypeScript for all new code
- Follow the existing folder structure
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Follow REST API conventions

---

##  Acknowledgments

- **Express.js** - Web framework foundation
- **Prisma** - Database toolkit and ORM
- **MongoDB** - Database platform
- **TypeScript** - Type-safe development
- **Open Source Community** - For the amazing tools and libraries

---

## 📞 Support

- **Documentation** - Check the [docs folder](./docs/) for detailed guides
- **Issues** - Report bugs and request features via GitHub issues
- **Community** - Join discussions and get help from the community

**Happy coding! 🚀**
