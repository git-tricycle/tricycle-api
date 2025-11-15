import express, { Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import { logError, logInfo } from "../middleware/logger";
import { requireDeletePermission } from "../middleware/rbac";
import driverService from "../services/driver.service";
import multerHelper from "../utils/multer";

const router = express.Router();

router.get("/", authenticate, getAllDrivers);
router.post("/", createDriver);
router.patch("/status", authenticate, updateDriverStatus);
router.patch("/location", authenticate, updateDriverLocation);
router.post(
  "/:id/upload-requirements",
  authenticate,
  multerHelper.upload.fields([
    { name: "licensePhoto", maxCount: 1 },
    { name: "validIdPhoto", maxCount: 1 },
  ]),
  uploadRequirements
);
router.delete("/:id/delete-requirements", authenticate, deleteRequirements);
router.get("/:id", authenticate, getDriverById);
router.patch("/:id", authenticate, updateDriver);
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

// @route   PATCH /api/driver/status
// @desc    Update driver online/offline status
// @access  Private
async function updateDriverStatus(req: Request, res: Response) {
  try {
    const { isOnline } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    if (typeof isOnline !== "boolean") {
      logError("Invalid isOnline parameter", `isOnline: ${isOnline}`, req);
      return res.status(400).json({
        success: false,
        message: "isOnline must be a boolean value",
      });
    }

    const result = await driverService.updateDriverStatus(userId, isOnline);

    if (!result.success) {
      logError(`Failed to update driver status: ${userId}`, result.message, req);
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully updated driver status: ${userId} - Online: ${isOnline}`, req);
    res.json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    logError("Update driver status error", error, req);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

// @route   PATCH /api/driver/location
// @desc    Update driver current location
// @access  Private
async function updateDriverLocation(req: Request, res: Response) {
  try {
    const { latitude, longitude } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      logError("Invalid location parameters", `lat: ${latitude}, lng: ${longitude}`, req);
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude must be valid numbers",
      });
    }

    // Basic coordinate validation
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: "Invalid coordinates provided",
      });
    }

    const result = await driverService.updateDriverLocation(userId, { latitude, longitude });

    if (!result.success) {
      logError(`Failed to update driver location: ${userId}`, result.message, req);
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully updated driver location: ${userId}`, req);
    res.json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    logError("Update driver location error", error, req);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

// @route   POST /api/driver/:id/upload-requirements
// @desc    Upload driver requirements (license and valid ID photos)
// @access  Private
async function uploadRequirements(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

    if (!id) {
      logError("Missing ID parameter", "ID is required", req);
      return res.status(400).json({
        success: false,
        message: "Driver ID is required",
      });
    }

    if (!files || (!files.licensePhoto && !files.validIdPhoto)) {
      logError("No files provided", "At least one file is required", req);
      return res.status(400).json({
        success: false,
        message: "At least one file (licensePhoto or validIdPhoto) is required",
      });
    }

    // Extract files from multer fields format
    const requirementFiles: {
      licensePhoto?: Express.Multer.File;
      validIdPhoto?: Express.Multer.File;
    } = {};

    if (files.licensePhoto && files.licensePhoto[0]) {
      requirementFiles.licensePhoto = files.licensePhoto[0];
    }

    if (files.validIdPhoto && files.validIdPhoto[0]) {
      requirementFiles.validIdPhoto = files.validIdPhoto[0];
    }

    const result = await driverService.uploadRequirements(id, requirementFiles);

    if (!result.success) {
      logError(`Failed to upload requirements for driver: ${id}`, result.message, req);
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully uploaded requirements for driver: ${id}`, req);
    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    logError("Upload requirements error", error, req);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

// @route   DELETE /api/driver/:id/delete-requirements
// @desc    Delete driver requirements from Cloudinary
// @access  Private
async function deleteRequirements(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { documentType } = req.query;

    if (!id) {
      logError("Missing ID parameter", "ID is required", req);
      return res.status(400).json({
        success: false,
        message: "Driver ID is required",
      });
    }

    // Validate document type if provided
    if (documentType && !["license", "validId", "all"].includes(documentType as string)) {
      logError("Invalid document type", `Document type: ${documentType}`, req);
      return res.status(400).json({
        success: false,
        message: "Document type must be 'license', 'validId', or 'all'",
      });
    }

    const result = await driverService.deleteRequirements(
      id,
      documentType as "license" | "validId" | "all" | undefined
    );

    if (!result.success) {
      logError(`Failed to delete requirements for driver: ${id}`, result.message, req);
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully deleted requirements for driver: ${id}`, req);
    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    logError("Delete requirements error", error, req);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

export default router;
