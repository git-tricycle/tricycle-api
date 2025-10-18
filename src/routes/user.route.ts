import express, { Request, Response } from "express";
import userService from "../services/user.service";
import { authenticate } from "../middleware/auth";
import { requireAdmin, requireWritePermission, requireDeletePermission } from "../middleware/rbac";
import { logInfo, logError } from "../middleware/logger";

const router = express.Router();

router.get("/", authenticate, getAllUsers);
router.get("/search", authenticate, searchUsers);
router.post("/create/admin", authenticate, requireAdmin, createUserAdmin);
router.get("/:id", authenticate, getUserById);
router.patch("/:id", authenticate, requireWritePermission, updateUser);
router.put("/:id", authenticate, requireDeletePermission, deleteUser);

// @route   GET /api/user
// @desc    Get all users
// @access  Public
async function getAllUsers(req: Request, res: Response) {
  try {
    const result = await userService.getAllUsers();

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

    const result = await userService.getUserById(id);

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

// @route   GET /api/user/search
// @desc    Search users
// @access  Public
async function searchUsers(req: Request, res: Response) {
  try {
    const { query, role, status, limit, offset } = req.query;

    const searchParams = {
      query: query as string,
      role: role as "driver" | "passenger" | "admin",
      status: status as "active" | "inactive" | "banned",
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    };

    const result = await userService.searchUsers(searchParams);

    if (!result.success) {
      logError("Failed to search users", result.message, req);
      return res.status(500).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Search completed - found ${result.data?.length || 0} users`, req);
    res.json({
      success: true,
      message: result.message,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    logError("Search users error", error, req);
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
