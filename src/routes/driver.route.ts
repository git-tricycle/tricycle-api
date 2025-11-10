import express, { Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import { logError, logInfo } from "../middleware/logger";
import { requireDeletePermission, requireWritePermission } from "../middleware/rbac";
import driverService from "../services/driver.service";

const router = express.Router();

router.get("/", authenticate, getAllDrivers);
router.post("/", createDriver);
router.get("/:id", authenticate, getDriverById);
router.patch("/:id", authenticate, requireWritePermission, updateDriver);
router.put("/:id", authenticate, requireDeletePermission, deleteDriver);

// @route   GET /api/driver
// @desc    Get all drivers
// @access  Public
async function getAllDrivers(req: Request, res: Response) {
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

    const params = {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sort: sort as string,
      order: order as "asc" | "desc",
      fields: fields as string,
      query: query as string,
      reqQuery: req.query,
    };

    const result = await driverService.getAllDrivers(params);

    if (!result.success) {
      logError("Failed to fetch drivers", result.message, req);
      return res.status(500).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully retrieved ${result.data?.length || 0} drivers`, req);
    res.json({
      success: true,
      message: result.message,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    logError("Get drivers error", error, req);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

// @route   GET /api/driver/:id
// @desc    Get driver by ID
// @access  Public
async function getDriverById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { fields } = req.query;

    if (!id) {
      logError("Missing ID parameter", "ID is required", req);
      return res.status(400).json({
        success: false,
        message: "ID is required",
      });
    }

    if (fields && typeof fields !== "string") {
      logError("Invalid fields parameter", `Fields: ${fields}`, req);
      return res.status(400).json({
        success: false,
        message: "Fields must be a string",
      });
    }

    const result = await driverService.getDriverById(id, fields as string);

    if (!result.success) {
      logError(`Driver not found with ID: ${id}`, result.message, req);
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully retrieved driver: ${id}`, req);
    res.json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    logError("Get driver error", error, req);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

// @route   POST /api/driver
// @desc    Create driver
// @access  Public
async function createDriver(req: Request, res: Response) {
  try {
    const result = await driverService.createDriver(req.body);

    if (!result.success) {
      logError("Failed to create driver", result.message, req);
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully created driver: ${req.body.email}`, req);
    res.status(201).json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    logError("Create driver error", error, req);
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

// @route   PATCH /api/driver/:id
// @desc    Update driver
// @access  Private
async function updateDriver(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await driverService.updateDriver(id, req.body);

    if (!result.success) {
      logError(`Failed to update driver: ${id}`, result.message, req);
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully updated driver: ${id}`, req);
    res.json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    logError("Update driver error", error, req);
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

// @route   PUT /api/driver/:id
// @desc    Soft Delete driver
// @access  Private
async function deleteDriver(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await driverService.deleteDriver(id);

    if (!result.success) {
      logError(`Failed to delete driver: ${id}`, result.message, req);
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully deleted driver: ${id}`, req);
    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    logError("Delete driver error", error, req);
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
