import express, { Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import { logError, logInfo } from "../middleware/logger";
import { requireWritePermission, requireDeletePermission } from "../middleware/rbac";
import ratingService from "../services/rating.service";

const router = express.Router();

router.get("/", authenticate, getAllRatings);
router.post("/", authenticate, requireWritePermission, createRating);
router.get("/ride/:rideId", authenticate, getRatingByRideId);
router.get("/:id", authenticate, getRatingById);
router.patch("/:id", authenticate, requireWritePermission, updateRating);
router.put("/:id", authenticate, requireDeletePermission, deleteRating);

// @route   GET /api/rating
// @desc    Get all ratings
// @access  Private
async function getAllRatings(req: Request, res: Response) {
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

    const result = await ratingService.getAllRatings(params);

    if (!result.success) {
      logError("Failed to fetch ratings", result.message, req);
      return res.status(500).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully retrieved ${result.data?.length || 0} ratings`, req);
    res.json({
      success: true,
      message: result.message,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    logError("Get ratings error", error, req);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

// @route   GET /api/rating/:id
// @desc    Get rating by ID
// @access  Private
async function getRatingById(req: Request, res: Response) {
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

    const result = await ratingService.getRatingById(id, fields as string);

    if (!result.success) {
      logError(`Rating not found with ID: ${id}`, result.message, req);
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully retrieved rating: ${id}`, req);
    res.json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    logError("Get rating error", error, req);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

// @route   GET /api/rating/ride/:rideId
// @desc    Get rating by ride ID
// @access  Private
async function getRatingByRideId(req: Request, res: Response) {
  try {
    const { rideId } = req.params;

    if (!rideId) {
      logError("Missing ride ID parameter", "Ride ID is required", req);
      return res.status(400).json({
        success: false,
        message: "Ride ID is required",
      });
    }

    const result = await ratingService.getRatingByRideId(rideId);

    if (!result.success) {
      logError(`Rating not found for ride ID: ${rideId}`, result.message, req);
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully retrieved rating for ride: ${rideId}`, req);
    res.json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    logError("Get rating by ride ID error", error, req);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

// @route   POST /api/rating
// @desc    Create rating
// @access  Private
async function createRating(req: Request, res: Response) {
  try {
    const { rideId, driverId, rating, comment } = req.body;

    // Validate required fields
    if (!rideId) {
      logError("Missing rideId field", "Ride ID is required", req);
      return res.status(400).json({
        success: false,
        message: "Ride ID is required",
      });
    }

    // Get passenger ID from authenticated user
    const passengerId = req.user?.id;

    if (!passengerId) {
      logError("User not authenticated", "No user ID found in request", req);
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }
    
    if (!driverId) {
      logError("Missing driverId field", "Driver ID is required", req);
      return res.status(400).json({
        success: false,
        message: "Driver ID is required",
      });
    }

    if (rating === undefined || rating === null) {
      logError("Missing rating field", "Rating is required", req);
      return res.status(400).json({
        success: false,
        message: "Rating is required",
      });
    }

    // Validate rating value
    if (typeof rating !== "number" || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      logError("Invalid rating value", `Rating: ${rating}`, req);
      return res.status(400).json({
        success: false,
        message: "Rating must be an integer between 1 and 5",
      });
    }

    // Validate comment if provided
    if (comment && typeof comment !== "string") {
      logError("Invalid comment field", "Comment must be a string", req);
      return res.status(400).json({
        success: false,
        message: "Comment must be a string",
      });
    }

    const result = await ratingService.createRating({
      rideId,
      passengerId,
      driverId,
      rating,
      comment,
    });

    if (!result.success) {
      logError("Failed to create rating", result.message, req);
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully created rating for ride: ${rideId}`, req);
    res.status(201).json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    logError("Create rating error", error, req);
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

// @route   PATCH /api/rating/:id
// @desc    Update rating
// @access  Private
async function updateRating(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    if (!id) {
      logError("Missing ID parameter", "ID is required", req);
      return res.status(400).json({
        success: false,
        message: "ID is required",
      });
    }

    // Validate rating value if provided
    if (rating !== undefined && (typeof rating !== "number" || rating < 1 || rating > 5 || !Number.isInteger(rating))) {
      logError("Invalid rating value", `Rating: ${rating}`, req);
      return res.status(400).json({
        success: false,
        message: "Rating must be an integer between 1 and 5",
      });
    }

    // Validate comment if provided
    if (comment !== undefined && typeof comment !== "string") {
      logError("Invalid comment field", "Comment must be a string", req);
      return res.status(400).json({
        success: false,
        message: "Comment must be a string",
      });
    }

    // Check if at least one field is provided for update
    if (rating === undefined && comment === undefined) {
      logError("No fields to update", "At least one field is required for update", req);
      return res.status(400).json({
        success: false,
        message: "At least one field (rating or comment) is required for update",
      });
    }

    const result = await ratingService.updateRating(id, { rating, comment });

    if (!result.success) {
      logError(`Failed to update rating: ${id}`, result.message, req);
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully updated rating: ${id}`, req);
    res.json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    logError("Update rating error", error, req);
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

// @route   PUT /api/rating/:id
// @desc    Soft Delete rating
// @access  Private
async function deleteRating(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id) {
      logError("Missing ID parameter", "ID is required", req);
      return res.status(400).json({
        success: false,
        message: "ID is required",
      });
    }

    const result = await ratingService.deleteRating(id);

    if (!result.success) {
      logError(`Failed to delete rating: ${id}`, result.message, req);
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully deleted rating: ${id}`, req);
    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    logError("Delete rating error", error, req);
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
