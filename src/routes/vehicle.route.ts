import express, { Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import { logError, logInfo } from "../middleware/logger";
import { requireDeletePermission, requireWritePermission } from "../middleware/rbac";
import vehicleService from "../services/vehicle.service";

const router = express.Router();

router.get("/", authenticate, getAllVehicles);
router.post("/", createVehicle);
router.get("/driver/:driverId", authenticate, getVehicleByDriverId);
router.get("/:id", authenticate, getVehicleById);
router.patch("/:id", authenticate, requireWritePermission, updateVehicle);
router.put("/:id", authenticate, requireDeletePermission, deleteVehicle);

// @route   GET /api/vehicle
// @desc    Get all vehicle
// @access  Public
async function getAllVehicles(req: Request, res: Response) {
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

    const result = await vehicleService.getAllVehicles(params);

    if (!result.success) {
      logError("Failed to fetch vehicles", result.message, req);
      return res.status(500).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully retrieved ${result.data?.length || 0} vehicles`, req);
    res.json({
      success: true,
      message: result.message,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    logError("Get vehicles error", error, req);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

// @route   GET /api/vehicle/:id
// @desc    Get vehicle by ID
// @access  Public
async function getVehicleById(req: Request, res: Response) {
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

    const result = await vehicleService.getVehicleById(id, fields as string);

    if (!result.success) {
      logError(`Vehicle not found with ID: ${id}`, result.message, req);
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully retrieved vehicle: ${id}`, req);
    res.json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    logError("Get vehicle error", error, req);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

// @route   POST /api/vehicle
// @desc    Create vehicle
// @access  Public
async function createVehicle(req: Request, res: Response) {
  try {
    const result = await vehicleService.createVehicle(req.body);

    if (!result.success) {
      logError("Failed to create vehicle", result.message, req);
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully created vehicle: ${req.body.email}`, req);
    res.status(201).json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    logError("Create vehicle error", error, req);
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

// @route   PATCH /api/vehicle/:id
// @desc    Update vehicle
// @access  Private
async function updateVehicle(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await vehicleService.updateVehicle(id, req.body);

    if (!result.success) {
      logError(`Failed to update vehicle: ${id}`, result.message, req);
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully updated vehicle: ${id}`, req);
    res.json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    logError("Update vehicle error", error, req);
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

// @route   PUT /api/vehicle/:id
// @desc    Soft Delete vehicle
// @access  Private
async function deleteVehicle(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await vehicleService.deleteVehicle(id);

    if (!result.success) {
      logError(`Failed to delete vehicle: ${id}`, result.message, req);
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully deleted vehicle: ${id}`, req);
    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    logError("Delete vehicle error", error, req);
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

// @route   GET /api/vehicle/driver/:driverId
// @desc    Get vehicle by driver ID
// @access  Private
async function getVehicleByDriverId(req: Request, res: Response) {
  try {
    const { driverId } = req.params;

    if (!driverId) {
      logError("Missing driverId parameter", "Driver ID is required", req);
      return res.status(400).json({
        success: false,
        message: "Driver ID is required",
      });
    }

    const result = await vehicleService.getVehicleByDriverId(driverId);

    if (!result.success) {
      logError(`Vehicle not found for driver: ${driverId}`, result.message, req);
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully retrieved vehicle for driver: ${driverId}`, req);
    res.json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    logError("Get vehicle by driver error", error, req);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

export default router;
