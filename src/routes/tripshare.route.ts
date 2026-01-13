import express, { Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import tripShareService from "../services/tripshare.service";

const router = express.Router();

/**
 * @route   POST /api/tripshare/generate
 * @desc    Generate a shareable link for a trip
 * @access  Private (Authenticated passengers)
 */
router.post(
  "/generate",
  authenticate,
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { rideId, expirationHours } = req.body;
      const passengerId = req.user?.id;

      // Validation
      if (!rideId) {
        return res.status(400).json({
          success: false,
          message: "Ride ID is required",
        });
      }

      if (!passengerId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }

      if (expirationHours && (expirationHours < 1 || expirationHours > 72)) {
        return res.status(400).json({
          success: false,
          message: "Expiration hours must be between 1 and 72",
        });
      }

      const result = await tripShareService.generateShareLink(
        rideId,
        passengerId,
        expirationHours || 24
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message,
          error: result.error,
        });
      }

      return res.status(201).json({
        success: true,
        message: result.message,
        data: result.data,
      });
    } catch (error) {
      console.error("Error in generate share link route:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

/**
 * @route   GET /api/tripshare/:shareToken
 * @desc    Get shared trip data by share token (Public)
 * @access  Public
 */
router.get("/:shareToken", async (req: Request, res: Response): Promise<any> => {
  try {
    const { shareToken } = req.params;

    if (!shareToken) {
      return res.status(400).json({
        success: false,
        message: "Share token is required",
      });
    }

    const result = await tripShareService.getSharedTripData(shareToken);

    if (!result.success) {
      const statusCode = result.message?.includes("not found") ? 404 : 400;
      return res.status(statusCode).json({
        success: false,
        message: result.message,
        error: result.error,
      });
    }

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    console.error("Error in get shared trip data route:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

/**
 * @route   PATCH /api/tripshare/:shareToken/deactivate
 * @desc    Deactivate a share link
 * @access  Private (Authenticated passengers)
 */
router.patch(
  "/:shareToken/deactivate",
  authenticate,
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { shareToken } = req.params;
      const passengerId = req.user?.id;

      if (!shareToken) {
        return res.status(400).json({
          success: false,
          message: "Share token is required",
        });
      }

      if (!passengerId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }

      const result = await tripShareService.deactivateShare(shareToken, passengerId);

      if (!result.success) {
        const statusCode = result.message?.includes("Unauthorized") ? 403 : 400;
        return res.status(statusCode).json({
          success: false,
          message: result.message,
          error: result.error,
        });
      }

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error("Error in deactivate share route:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

/**
 * @route   GET /api/tripshare/ride/:rideId/shares
 * @desc    Get all active shares for a specific ride
 * @access  Private (Authenticated passengers)
 */
router.get(
  "/ride/:rideId/shares",
  authenticate,
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { rideId } = req.params;
      const passengerId = req.user?.id;

      if (!rideId) {
        return res.status(400).json({
          success: false,
          message: "Ride ID is required",
        });
      }

      if (!passengerId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }

      const result = await tripShareService.getActiveSharesByRide(rideId, passengerId);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message,
          error: result.error,
        });
      }

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result.data,
      });
    } catch (error) {
      console.error("Error in get active shares route:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

/**
 * @route   POST /api/tripshare/cleanup
 * @desc    Cleanup expired share links (Admin/Cron job)
 * @access  Private (Admin only or internal service)
 */
router.post(
  "/cleanup",
  authenticate,
  async (req: Request, res: Response): Promise<any> => {
    try {
      // Optional: Add admin role check here
      // if (req.user?.role !== 'admin') {
      //   return res.status(403).json({
      //     success: false,
      //     message: 'Unauthorized access',
      //   });
      // }

      const result = await tripShareService.cleanupExpiredShares();

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result.data,
      });
    } catch (error) {
      console.error("Error in cleanup expired shares route:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

export default router;
