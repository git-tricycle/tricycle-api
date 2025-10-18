import { prisma } from "../lib/prisma";
import { UpdateUserData, SearchUserParams, CreateUserData, Role } from "../types";
import { requireAdminPermission, requireWritePermission, requireDeletePermission } from "../middleware/rbac";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const userService = {
  getAllUsers,
  getUserById,
  searchUsers,
  createUserAdmin,
  updateUser,
  deleteUser,
};

export default userService;

async function getAllUsers() {
  try {
    const users = await prisma.user.findMany({
      where: {
        isDeleted: false,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        middleName: true,
        email: true,
        role: true,
        status: true,
        avatar: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      success: true,
      message: "Users retrieved successfully",
      data: users,
    };
  } catch (error) {
    console.error("Get users error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}

async function getUserById(id: string) {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id,
        isDeleted: false,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        middleName: true,
        email: true,
        role: true,
        status: true,
        avatar: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return {
        success: false,
        message: "User not found",
      };
    }

    return {
      success: true,
      message: "User retrieved successfully",
      data: user,
    };
  } catch (error) {
    console.error("Get user error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}

async function searchUsers(params: SearchUserParams) {
  try {
    const { query, role, status, limit = 10, offset = 0 } = params;

    // Build where clause
    const where: any = {
      isDeleted: false,
    };

    // Add text search if query is provided
    if (query) {
      where.OR = [
        {
          firstName: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          lastName: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          middleName: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          email: {
            contains: query,
            mode: "insensitive",
          },
        },
      ];
    }

    // Add role filter if provided
    if (role) {
      where.role = role;
    }

    // Add status filter if provided
    if (status) {
      where.status = status;
    }

    // Get total count for pagination
    const total = await prisma.user.count({ where });

    // Get users with pagination
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        middleName: true,
        email: true,
        role: true,
        status: true,
        avatar: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: offset,
    });

    return {
      success: true,
      message: "Users search completed successfully",
      data: users,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  } catch (error) {
    console.error("Search users error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}

async function createUserAdmin(data: CreateUserData, userRole?: Role) {
  try {
    // RBAC Check - require admin permission
    requireAdminPermission(userRole);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return { success: false, message: "User already exists" };
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    // Create user
    const user = await prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName,
        email: data.email,
        password: hashedPassword,
        role: data.role,
        status: data.status,
        metadata: data.metadata,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        middleName: true,
        email: true,
        metadata: true,
        createdAt: true,
      },
    });

    // Create JWT token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || "", { expiresIn: "7d" });

    return { user, token, success: true, message: "User created successfully" };
  } catch (error) {
    console.error("Register error:", error);
    return { success: false, message: "Server error" };
  }
}

async function updateUser(id: string, data: UpdateUserData, userRole?: Role) {
  try {
    // RBAC Check - require write permission
    requireWritePermission(userRole);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!existingUser) {
      return {
        success: false,
        message: "User not found",
      };
    }

    // Prepare update data
    const updateData = { ...data };

    // Hash password if provided
    if (data.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(data.password, salt);
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        middleName: true,
        email: true,
        role: true,
        status: true,
        avatar: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      success: true,
      message: "User updated successfully",
      data: updatedUser,
    };
  } catch (error) {
    console.error("Update user error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}

async function deleteUser(id: string, userRole?: Role) {
  try {
    // RBAC Check - require delete permission
    requireDeletePermission(userRole);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!existingUser) {
      return {
        success: false,
        message: "User not found",
      };
    }

    // Soft delete user
    await prisma.user.update({
      where: { id },
      data: {
        isDeleted: true,
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      message: "User deleted successfully",
    };
  } catch (error) {
    console.error("Delete user error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}
