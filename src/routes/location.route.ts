import express, { Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import { logError, logInfo } from "../middleware/logger";
import { requireWritePermission, requireDeletePermission } from "../middleware/rbac";
import locationService from "../services/location.service";

const router = express.Router();

router.get("/", authenticate, getAllLocations);
router.post("/", authenticate, requireWritePermission, createLocation);
router.get("/user/:userId", authenticate, getLocationByUserId);
router.get("/:id", authenticate, getLocationById);
router.patch("/:id", authenticate, requireWritePermission, updateLocation);
router.put("/:id", authenticate, requireDeletePermission, deleteLocation);

// @route   GET /api/location
// @desc    Get all locations
// @access  Private
async function getAllLocations(req: Request, res: Response) {
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

    const result = await locationService.getAllLocations(params);

    if (!result.success) {
      logError("Failed to fetch locations", result.message, req);
      return res.status(500).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully retrieved ${result.data?.length || 0} locations`, req);
    res.json({
      success: true,
      message: result.message,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    logError("Get locations error", error, req);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

// @route   GET /api/location/:id
// @desc    Get location by ID
// @access  Private
async function getLocationById(req: Request, res: Response) {
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

    const result = await locationService.getLocationById(id, fields as string);

    if (!result.success) {
      logError(`Location not found with ID: ${id}`, result.message, req);
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully retrieved location: ${id}`, req);
    res.json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    logError("Get location error", error, req);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

// @route   GET /api/location/user/:userId
// @desc    Get location by user ID
// @access  Private
async function getLocationByUserId(req: Request, res: Response) {
  try {
    const { userId } = req.params;

    if (!userId) {
      logError("Missing user ID parameter", "User ID is required", req);
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const result = await locationService.getLocationByUserId(userId);

    if (!result.success) {
      logError(`Location not found for user ID: ${userId}`, result.message, req);
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully retrieved location for user: ${userId}`, req);
    res.json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    logError("Get location by user ID error", error, req);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

// @route   POST /api/location
// @desc    Create location
// @access  Private
async function createLocation(req: Request, res: Response) {
  try {
    const { latitude, longitude } = req.body;

    const userId = req.user?.id;

    // Validate required fields
    if (!userId) {
      logError("User not authenticated", "No user ID found in request", req);
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    if (latitude === undefined || latitude === null) {
      logError("Missing latitude field", "Latitude is required", req);
      return res.status(400).json({
        success: false,
        message: "Latitude is required",
      });
    }

    if (longitude === undefined || longitude === null) {
      logError("Missing longitude field", "Longitude is required", req);
      return res.status(400).json({
        success: false,
        message: "Longitude is required",
      });
    }

    // Validate coordinate values
    if (typeof latitude !== "number" || isNaN(latitude)) {
      logError("Invalid latitude value", `Latitude: ${latitude}`, req);
      return res.status(400).json({
        success: false,
        message: "Latitude must be a valid number",
      });
    }

    if (typeof longitude !== "number" || isNaN(longitude)) {
      logError("Invalid longitude value", `Longitude: ${longitude}`, req);
      return res.status(400).json({
        success: false,
        message: "Longitude must be a valid number",
      });
    }

    // Validate coordinate ranges
    if (latitude < -90 || latitude > 90) {
      logError("Invalid latitude range", `Latitude: ${latitude}`, req);
      return res.status(400).json({
        success: false,
        message: "Latitude must be between -90 and 90",
      });
    }

    if (longitude < -180 || longitude > 180) {
      logError("Invalid longitude range", `Longitude: ${longitude}`, req);
      return res.status(400).json({
        success: false,
        message: "Longitude must be between -180 and 180",
      });
    }

    const result = await locationService.createLocation({
      userId,
      latitude,
      longitude,
    });

    if (!result.success) {
      logError("Failed to create location", result.message, req);
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully created location for user: ${userId}`, req);
    res.status(201).json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    logError("Create location error", error, req);
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

// @route   PATCH /api/location/:id
// @desc    Update location
// @access  Private
async function updateLocation(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { latitude, longitude } = req.body;

    if (!id) {
      logError("Missing ID parameter", "ID is required", req);
      return res.status(400).json({
        success: false,
        message: "ID is required",
      });
    }

    // Validate coordinate values if provided
    if (latitude !== undefined && (typeof latitude !== "number" || isNaN(latitude))) {
      logError("Invalid latitude value", `Latitude: ${latitude}`, req);
      return res.status(400).json({
        success: false,
        message: "Latitude must be a valid number",
      });
    }

    if (longitude !== undefined && (typeof longitude !== "number" || isNaN(longitude))) {
      logError("Invalid longitude value", `Longitude: ${longitude}`, req);
      return res.status(400).json({
        success: false,
        message: "Longitude must be a valid number",
      });
    }

    // Validate coordinate ranges if provided
    if (latitude !== undefined && (latitude < -90 || latitude > 90)) {
      logError("Invalid latitude range", `Latitude: ${latitude}`, req);
      return res.status(400).json({
        success: false,
        message: "Latitude must be between -90 and 90",
      });
    }

    if (longitude !== undefined && (longitude < -180 || longitude > 180)) {
      logError("Invalid longitude range", `Longitude: ${longitude}`, req);
      return res.status(400).json({
        success: false,
        message: "Longitude must be between -180 and 180",
      });
    }

    // Check if at least one field is provided for update
    if (latitude === undefined && longitude === undefined) {
      logError("No fields to update", "At least one field is required for update", req);
      return res.status(400).json({
        success: false,
        message: "At least one field (latitude or longitude) is required for update",
      });
    }

    const result = await locationService.updateLocation(id, { latitude, longitude });

    if (!result.success) {
      logError(`Failed to update location: ${id}`, result.message, req);
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully updated location: ${id}`, req);
    res.json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    logError("Update location error", error, req);
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

// @route   PUT /api/location/:id
// @desc    Delete location
// @access  Private
async function deleteLocation(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id) {
      logError("Missing ID parameter", "ID is required", req);
      return res.status(400).json({
        success: false,
        message: "ID is required",
      });
    }

    const result = await locationService.deleteLocation(id);

    if (!result.success) {
      logError(`Failed to delete location: ${id}`, result.message, req);
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully deleted location: ${id}`, req);
    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    logError("Delete location error", error, req);
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
