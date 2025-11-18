import express, { Request, Response } from "express";
import fareService from "../services/fare.service";
import { authenticate } from "../middleware/auth";
import { requireAdmin } from "../middleware/rbac";
import { logInfo, logError } from "../middleware/logger";

const router = express.Router();

// Public route to get current fare settings
router.get("/current", getCurrentFareSettings);

// Public route to calculate fare
router.get("/calculate", calculateFare);

// Admin routes
router.get("/", authenticate, requireAdmin, getAllFareSettings);
router.post("/", authenticate, requireAdmin, createFareSettings);
router.patch("/:id", authenticate, requireAdmin, updateFareSettings);
router.delete("/:id", authenticate, requireAdmin, deleteFareSettings);

// @route   GET /api/fare/current
// @desc    Get current active fare settings
// @access  Public
async function getCurrentFareSettings(req: Request, res: Response) {
  try {
    const result = await fareService.getCurrentFareSettings();

    if (!result.success) {
      logError("Failed to get current fare settings", result.message, req);
      return res.status(500).json({
        success: false,
        message: result.message,
      });
    }

    logInfo("Successfully retrieved current fare settings", req);
    res.json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    logError("Get current fare settings error", error, req);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

// @route   GET /api/fare/calculate?distance=5.2&estimatedTime=15&surgeMultiplier=1.5
// @desc    Calculate fare based on distance with enhanced options
// @access  Public
async function calculateFare(req: Request, res: Response) {
  try {
    const { distance, estimatedTime, surgeMultiplier } = req.query;

    if (!distance) {
      logError("Missing distance parameter", "Distance is required", req);
      return res.status(400).json({
        success: false,
        message: "Distance parameter is required",
      });
    }

    const distanceNum = Number(distance);
    if (isNaN(distanceNum) || distanceNum < 0) {
      logError("Invalid distance parameter", `Distance: ${distance}`, req);
      return res.status(400).json({
        success: false,
        message: "Distance must be a valid positive number",
      });
    }

    // Parse optional parameters
    const options: { estimatedTime?: number; surgeMultiplier?: number } = {};

    if (estimatedTime && !isNaN(Number(estimatedTime)) && Number(estimatedTime) > 0) {
      options.estimatedTime = Number(estimatedTime);
    }

    if (surgeMultiplier && !isNaN(Number(surgeMultiplier)) && Number(surgeMultiplier) >= 1) {
      options.surgeMultiplier = Number(surgeMultiplier);
    }

    const result = await fareService.getFareCalculation(distanceNum, options);

    if (!result.success) {
      logError("Failed to calculate fare", result.message, req);
      return res.status(500).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully calculated fare for distance: ${distanceNum}km`, req);
    res.json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    logError("Calculate fare error", error, req);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

// @route   GET /api/fare
// @desc    Get all fare settings (Admin only)
// @access  Private (Admin)
async function getAllFareSettings(req: Request, res: Response) {
  try {
    const result = await fareService.getAllFareSettings(req.user?.role);

    if (!result.success) {
      logError("Failed to get fare settings", result.message, req);
      return res.status(500).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully retrieved ${result.data?.length || 0} fare settings`, req);
    res.json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    logError("Get fare settings error", error, req);
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

// @route   POST /api/fare
// @desc    Create new fare settings (Admin only)
// @access  Private (Admin)
async function createFareSettings(req: Request, res: Response) {
  try {
    const { baseFare, ratePerKm } = req.body;

    if (!baseFare || !ratePerKm) {
      logError("Missing required fields", "baseFare and ratePerKm are required", req);
      return res.status(400).json({
        success: false,
        message: "baseFare and ratePerKm are required",
      });
    }

    if (isNaN(Number(baseFare)) || Number(baseFare) <= 0) {
      logError("Invalid baseFare", `baseFare: ${baseFare}`, req);
      return res.status(400).json({
        success: false,
        message: "baseFare must be a positive number",
      });
    }

    if (isNaN(Number(ratePerKm)) || Number(ratePerKm) <= 0) {
      logError("Invalid ratePerKm", `ratePerKm: ${ratePerKm}`, req);
      return res.status(400).json({
        success: false,
        message: "ratePerKm must be a positive number",
      });
    }

    const result = await fareService.createFareSettings(
      {
        baseFare: Number(baseFare),
        ratePerKm: Number(ratePerKm),
      },
      req.user?.role
    );

    if (!result.success) {
      logError("Failed to create fare settings", result.message, req);
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    logInfo("Successfully created fare settings", req);
    res.status(201).json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    logError("Create fare settings error", error, req);
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

// @route   PATCH /api/fare/:id
// @desc    Update fare settings (Admin only)
// @access  Private (Admin)
async function updateFareSettings(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { baseFare, ratePerKm, isActive } = req.body;

    if (!id) {
      logError("Missing ID parameter", "ID is required", req);
      return res.status(400).json({
        success: false,
        message: "ID is required",
      });
    }

    // Validate baseFare if provided
    if (baseFare !== undefined && (isNaN(Number(baseFare)) || Number(baseFare) <= 0)) {
      logError("Invalid baseFare", `baseFare: ${baseFare}`, req);
      return res.status(400).json({
        success: false,
        message: "baseFare must be a positive number",
      });
    }

    // Validate ratePerKm if provided
    if (ratePerKm !== undefined && (isNaN(Number(ratePerKm)) || Number(ratePerKm) <= 0)) {
      logError("Invalid ratePerKm", `ratePerKm: ${ratePerKm}`, req);
      return res.status(400).json({
        success: false,
        message: "ratePerKm must be a positive number",
      });
    }

    const updateData: any = {};
    if (baseFare !== undefined) updateData.baseFare = Number(baseFare);
    if (ratePerKm !== undefined) updateData.ratePerKm = Number(ratePerKm);
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const result = await fareService.updateFareSettings(id, updateData, req.user?.role);

    if (!result.success) {
      logError(`Failed to update fare settings: ${id}`, result.message, req);
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully updated fare settings: ${id}`, req);
    res.json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    logError("Update fare settings error", error, req);
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

// @route   DELETE /api/fare/:id
// @desc    Delete fare settings (Admin only)
// @access  Private (Admin)
async function deleteFareSettings(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id) {
      logError("Missing ID parameter", "ID is required", req);
      return res.status(400).json({
        success: false,
        message: "ID is required",
      });
    }

    const result = await fareService.deleteFareSettings(id, req.user?.role);

    if (!result.success) {
      logError(`Failed to delete fare settings: ${id}`, result.message, req);
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully deleted fare settings: ${id}`, req);
    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    logError("Delete fare settings error", error, req);
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
