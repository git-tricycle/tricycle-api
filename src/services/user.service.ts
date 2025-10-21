import { prisma } from "../lib/prisma";
import { UpdateUserData, CreateUserData, Role } from "../types";
import { requireAdminPermission, requireWritePermission, requireDeletePermission } from "../middleware/rbac";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const userService = {
  getAllUsers,
  getUserById,
  createUserAdmin,
  updateUser,
  deleteUser,
};

export default userService;

async function getAllUsers(params?: {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  fields?: string;
  query?: string;
  filters?: Record<string, any>;
}) {
  try {
    const { page = 1, limit = 10, sort, order = "desc", fields, query, filters } = params || {};

    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: Prisma.UserWhereInput = {
      isDeleted: false,
      ...(query
        ? {
            OR: [
              { firstName: { contains: query, mode: "insensitive" } },
              { lastName: { contains: query, mode: "insensitive" } },
              { middleName: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
      // Apply dynamic filters
      ...(filters || {}),
    };

    const findManyQuery: Prisma.UserFindManyArgs = {
      where: whereClause,
      skip,
      take: limit,
      orderBy: sort
        ? typeof sort === "string" && !sort.startsWith("{")
          ? { [sort]: order }
          : JSON.parse(sort)
        : { createdAt: order as Prisma.SortOrder },
    };

    // Handle field selection - default to only "id" if no fields specified
    const fieldSelections = fields
      ? fields.split(",").reduce(
          (acc, field) => {
            const parts = field.trim().split(".");
            if (parts.length > 1) {
              const [parent, ...children] = parts;
              acc[parent] = acc[parent] || { select: {} };

              let current = acc[parent].select;
              for (let i = 0; i < children.length - 1; i++) {
                current[children[i]] = current[children[i]] || { select: {} };
                current = current[children[i]].select;
              }
              current[children[children.length - 1]] = true;
            } else {
              acc[parts[0]] = true;
            }
            return acc;
          },
          { id: true } as Record<string, any>
        )
      : { id: true };

    findManyQuery.select = fieldSelections;

    const [users, total] = await Promise.all([
      prisma.user.findMany(findManyQuery),
      prisma.user.count({ where: whereClause }),
    ]);

    return {
      success: true,
      message: "Users retrieved successfully",
      data: users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total,
      },
    };
  } catch (error) {
    console.error("Get users error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}

async function getUserById(id: string, fields?: string) {
  try {
    const query: Prisma.UserFindUniqueArgs = {
      where: {
        id,
        isDeleted: false,
      },
    };

    // Handle field selection - default to only "id" if no fields specified
    const fieldSelections = fields
      ? fields.split(",").reduce(
          (acc, field) => {
            const parts = field.trim().split(".");
            if (parts.length > 1) {
              const [parent, ...children] = parts;
              acc[parent] = acc[parent] || { select: {} };

              let current = acc[parent].select;
              for (let i = 0; i < children.length - 1; i++) {
                current[children[i]] = current[children[i]] || { select: {} };
                current = current[children[i]].select;
              }
              current[children[children.length - 1]] = true;
            } else {
              acc[parts[0]] = true;
            }
            return acc;
          },
          { id: true } as Record<string, any>
        )
      : { id: true };

    query.select = fieldSelections;

    const user = await prisma.user.findUnique(query);

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
