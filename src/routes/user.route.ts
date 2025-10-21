import express, { Request, Response } from "express";
import userService from "../services/user.service";
import { authenticate } from "../middleware/auth";
import { requireAdmin, requireWritePermission, requireDeletePermission } from "../middleware/rbac";
import { logInfo, logError } from "../middleware/logger";

const router = express.Router();

router.get("/", authenticate, getAllUsers);
router.post("/admin", authenticate, requireAdmin, createUserAdmin);
router.get("/:id", authenticate, getUserById);
router.patch("/:id", authenticate, requireWritePermission, updateUser);
router.put("/:id", authenticate, requireDeletePermission, deleteUser);

// @route   GET /api/user
// @desc    Get all users
// @access  Public
async function getAllUsers(req: Request, res: Response) {
  try {
    const { page, limit, sort, order, fields, query } = req.query;

    // Validate query parameters
    if (page && (isNaN(Number(page)) || Number(page) < 1)) {
      logError("Invalid page parameter", `Page: ${page}`, req);
      return res.status(400).json({
        success: false,
        message: "Invalid page parameter",
      });
    }

    if (limit && (isNaN(Number(limit)) || Number(limit) < 1)) {
      logError("Invalid limit parameter", `Limit: ${limit}`, req);
      return res.status(400).json({
        success: false,
        message: "Invalid limit parameter",
      });
    }

    if (order && !["asc", "desc"].includes(order as string)) {
      logError("Invalid order parameter", `Order: ${order}`, req);
      return res.status(400).json({
        success: false,
        message: "Order must be 'asc' or 'desc'",
      });
    }

    if (fields && typeof fields !== "string") {
      logError("Invalid fields parameter", `Fields: ${fields}`, req);
      return res.status(400).json({
        success: false,
        message: "Fields must be a string",
      });
    }

    // Build dynamic filters from query parameters (format: filter_fieldName)
    const filters: Record<string, any> = {};

    Object.keys(req.query).forEach((key) => {
      if (key.startsWith("filter_")) {
        const fieldName = key.replace("filter_", "");
        const value = req.query[key];
        if (value && typeof value === "string") {
          filters[fieldName] = value;
        }
      }
    });

    const params = {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sort: sort as string,
      order: order as "asc" | "desc",
      fields: fields as string,
      query: query as string,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
    };

    const result = await userService.getAllUsers(params);

    if (!result.success) {
      logError("Failed to fetch users", result.message, req);
      return res.status(500).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully retrieved ${result.data?.length || 0} users`, req);
    res.json({
      success: true,
      message: result.message,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    logError("Get users error", error, req);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

// @route   GET /api/user/:id
// @desc    Get user by ID
// @access  Public
async function getUserById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { fields } = req.query;

    if (!id) {
      logError("Missing user ID parameter", "ID is required", req);
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    if (fields && typeof fields !== "string") {
      logError("Invalid fields parameter", `Fields: ${fields}`, req);
      return res.status(400).json({
        success: false,
        message: "Fields must be a string",
      });
    }

    const result = await userService.getUserById(id, fields as string);

    if (!result.success) {
      logError(`User not found with ID: ${id}`, result.message, req);
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully retrieved user: ${id}`, req);
    res.json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    logError("Get user error", error, req);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

// @route   POST /api/user/admin
// @desc    Create user (Admin only)
// @access  Private (Admin)
async function createUserAdmin(req: Request, res: Response) {
  try {
    const result = await userService.createUserAdmin(req.body, req.user?.role);

    if (!result.success) {
      logError("Failed to create user", result.message, req);
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully created user: ${req.body.email}`, req);
    res.status(201).json({
      success: true,
      message: result.message,
      data: result.user,
      token: result.token,
    });
  } catch (error) {
    logError("Create user error", error, req);
    if (error instanceof Error && error.message === "Insufficient permissions") {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

// @route   PATCH /api/user/:id
// @desc    Update user
// @access  Private
async function updateUser(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await userService.updateUser(id, req.body, req.user?.role);

    if (!result.success) {
      logError(`Failed to update user: ${id}`, result.message, req);
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully updated user: ${id}`, req);
    res.json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    logError("Update user error", error, req);
    if (error instanceof Error && error.message === "Insufficient permissions") {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

// @route   PUT /api/user/:id
// @desc    Soft Delete user
// @access  Private
async function deleteUser(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await userService.deleteUser(id, req.user?.role);

    if (!result.success) {
      logError(`Failed to delete user: ${id}`, result.message, req);
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully deleted user: ${id}`, req);
    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    logError("Delete user error", error, req);
    if (error instanceof Error && error.message === "Insufficient permissions") {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

export default router;
