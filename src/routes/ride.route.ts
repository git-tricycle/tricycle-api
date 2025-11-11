import express, { Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import { logError, logInfo } from "../middleware/logger";
import { requireDeletePermission, requireWritePermission } from "../middleware/rbac";
import rideService from "../services/ride.service";

const router = express.Router();

router.get("/", authenticate, getAllRides);
router.post("/", authenticate, createRide);
router.get("/passenger/:passengerId", authenticate, getRidesByPassenger);
router.get("/driver/:driverId", authenticate, getRidesByDriver);
router.get("/:id", authenticate, getRideById);
router.patch("/:id", authenticate, requireWritePermission, updateRide);
router.put("/:id", authenticate, requireDeletePermission, deleteRide);
router.patch("/:id/accept", authenticate, acceptRide);
router.patch("/:id/start", authenticate, startRide);
router.patch("/:id/cancel", authenticate, cancelRide);
router.patch("/:id/complete", authenticate, completeRide);

// @route   GET /api/ride
// @desc    Get all rides
// @access  Private
async function getAllRides(req: Request, res: Response) {
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

    const result = await rideService.getAllRides(params);

    if (!result.success) {
      logError("Failed to fetch rides", result.message, req);
      return res.status(500).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully retrieved ${result.data?.length || 0} rides`, req);
    res.json({
      success: true,
      message: result.message,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    logError("Get rides error", error, req);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

// @route   GET /api/ride/:id
// @desc    Get ride by ID
// @access  Private
async function getRideById(req: Request, res: Response) {
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

    const result = await rideService.getRideById(id, fields as string);

    if (!result.success) {
      logError(`Ride not found with ID: ${id}`, result.message, req);
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully retrieved ride: ${id}`, req);
    res.json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    logError("Get ride error", error, req);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

// @route   POST /api/ride
// @desc    Create ride
// @access  Private
async function createRide(req: Request, res: Response) {
  try {
    const { pickup, dropoff, fare, paymentMode, locationId, eta } = req.body;

    // Get passenger ID from authenticated user
    const passengerId = req.user?.id;

    if (!passengerId) {
      logError("User not authenticated", "No user ID found in request", req);
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    // Validate required fields
    if (!pickup || !dropoff || !fare || !paymentMode) {
      logError("Missing required fields", "Required: pickup, dropoff, fare, paymentMode", req);
      return res.status(400).json({
        success: false,
        message: "Missing required fields: pickup, dropoff, fare, paymentMode",
      });
    }

    // Validate fare is a positive number
    if (isNaN(Number(fare)) || Number(fare) <= 0) {
      logError("Invalid fare", `Fare: ${fare}`, req);
      return res.status(400).json({
        success: false,
        message: "Fare must be a positive number",
      });
    }

    // Validate ETA if provided
    if (eta && (isNaN(Number(eta)) || Number(eta) <= 0)) {
      logError("Invalid ETA", `ETA: ${eta}`, req);
      return res.status(400).json({
        success: false,
        message: "ETA must be a positive number",
      });
    }

    const result = await rideService.createRide({
      passengerId,
      pickup,
      dropoff,
      fare: Number(fare),
      paymentMode,
      locationId: locationId || undefined,
      eta: eta ? Number(eta) : undefined,
    });

    if (!result.success) {
      logError("Failed to create ride", result.message, req);
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully created ride for user: ${passengerId}`, req);
    res.status(201).json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    logError("Create ride error", error, req);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

// @route   PATCH /api/ride/:id
// @desc    Update ride
// @access  Private
async function updateRide(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { fare, paymentMode, locationId, eta } = req.body;

    if (!id) {
      logError("Missing ID parameter", "ID is required", req);
      return res.status(400).json({
        success: false,
        message: "ID is required",
      });
    }

    // Validate fare if provided
    if (fare && (isNaN(Number(fare)) || Number(fare) <= 0)) {
      logError("Invalid fare", `Fare: ${fare}`, req);
      return res.status(400).json({
        success: false,
        message: "Fare must be a positive number",
      });
    }

    // Validate ETA if provided
    if (eta && (isNaN(Number(eta)) || Number(eta) <= 0)) {
      logError("Invalid ETA", `ETA: ${eta}`, req);
      return res.status(400).json({
        success: false,
        message: "ETA must be a positive number",
      });
    }

    const updateData: any = {};
    if (fare !== undefined) updateData.fare = Number(fare);
    if (paymentMode) updateData.paymentMode = paymentMode;
    if (locationId !== undefined) updateData.locationId = locationId;
    if (eta !== undefined) updateData.eta = Number(eta);

    const result = await rideService.updateRide(id, updateData);

    if (!result.success) {
      logError(`Failed to update ride: ${id}`, result.message, req);
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully updated ride: ${id}`, req);
    res.json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    logError("Update ride error", error, req);
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

// @route   PUT /api/ride/:id
// @desc    Soft Delete ride
// @access  Private
async function deleteRide(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id) {
      logError("Missing ID parameter", "ID is required", req);
      return res.status(400).json({
        success: false,
        message: "ID is required",
      });
    }

    const result = await rideService.deleteRide(id);

    if (!result.success) {
      logError(`Failed to delete ride: ${id}`, result.message, req);
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully deleted ride: ${id}`, req);
    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    logError("Delete ride error", error, req);
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

// @route   PATCH /api/ride/:id/accept
// @desc    Accept ride (assign driver)
// @access  Private
async function acceptRide(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { driverId } = req.body;

    if (!id) {
      logError("Missing ID parameter", "ID is required", req);
      return res.status(400).json({
        success: false,
        message: "ID is required",
      });
    }

    if (!driverId) {
      logError("Missing driverId", "Driver ID is required to accept ride", req);
      return res.status(400).json({
        success: false,
        message: "Driver ID is required",
      });
    }

    const result = await rideService.acceptRide(id, driverId);

    if (!result.success) {
      logError(`Failed to accept ride: ${id}`, result.message, req);
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully accepted ride: ${id} by driver: ${driverId}`, req);
    res.json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    logError("Accept ride error", error, req);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

// @route   PATCH /api/ride/:id/cancel
// @desc    Cancel ride
// @access  Private
async function cancelRide(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id) {
      logError("Missing ID parameter", "ID is required", req);
      return res.status(400).json({
        success: false,
        message: "ID is required",
      });
    }

    const result = await rideService.cancelRide(id);

    if (!result.success) {
      logError(`Failed to cancel ride: ${id}`, result.message, req);
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully cancelled ride: ${id}`, req);
    res.json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    logError("Cancel ride error", error, req);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

// @route   PATCH /api/ride/:id/start
// @desc    Start ride (change status to in_progress)
// @access  Private
async function startRide(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id) {
      logError("Missing ID parameter", "ID is required", req);
      return res.status(400).json({
        success: false,
        message: "ID is required",
      });
    }

    const result = await rideService.startRide(id);

    if (!result.success) {
      logError(`Failed to start ride: ${id}`, result.message, req);
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully started ride: ${id}`, req);
    res.json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    logError("Start ride error", error, req);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

// @route   PATCH /api/ride/:id/complete
// @desc    Complete ride
// @access  Private
async function completeRide(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id) {
      logError("Missing ID parameter", "ID is required", req);
      return res.status(400).json({
        success: false,
        message: "ID is required",
      });
    }

    const result = await rideService.completeRide(id);

    if (!result.success) {
      logError(`Failed to complete ride: ${id}`, result.message, req);
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully completed ride: ${id}`, req);
    res.json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    logError("Complete ride error", error, req);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

// @route   GET /api/ride/passenger/:passengerId
// @desc    Get rides by passenger ID
// @access  Private
async function getRidesByPassenger(req: Request, res: Response) {
  try {
    const { passengerId } = req.params;
    const { page, limit, status } = req.query;

    if (!passengerId) {
      logError("Missing passengerId parameter", "Passenger ID is required", req);
      return res.status(400).json({
        success: false,
        message: "Passenger ID is required",
      });
    }

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

    const params = {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status: status as string,
    };

    const result = await rideService.getRidesByPassenger(passengerId, params);

    if (!result.success) {
      logError("Failed to fetch passenger rides", result.message, req);
      return res.status(500).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(
      `Successfully retrieved ${result.data?.length || 0} rides for passenger: ${passengerId}`,
      req
    );
    res.json({
      success: true,
      message: result.message,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    logError("Get passenger rides error", error, req);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

// @route   GET /api/ride/driver/:driverId
// @desc    Get rides by driver ID
// @access  Private
async function getRidesByDriver(req: Request, res: Response) {
  try {
    const { driverId } = req.params;
    const { page, limit, status } = req.query;

    if (!driverId) {
      logError("Missing driverId parameter", "Driver ID is required", req);
      return res.status(400).json({
        success: false,
        message: "Driver ID is required",
      });
    }

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

    const params = {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status: status as string,
    };

    const result = await rideService.getRidesByDriver(driverId, params);

    if (!result.success) {
      logError("Failed to fetch driver rides", result.message, req);
      return res.status(500).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(
      `Successfully retrieved ${result.data?.length || 0} rides for driver: ${driverId}`,
      req
    );
    res.json({
      success: true,
      message: result.message,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    logError("Get driver rides error", error, req);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

export default router;
