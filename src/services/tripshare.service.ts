import crypto from "crypto";
import { getPrismaClient } from "../lib/db.connection";
import { generateShareUrl } from "../utils/share-url";

const prisma = getPrismaClient();

const tripShareService = {
  generateShareLink,
  getSharedTripData,
  deactivateShare,
  updateViewCount,
  getActiveSharesByRide,
  cleanupExpiredShares,
};

export default tripShareService;

/**
 * Generate a shareable link for a trip
 */
async function generateShareLink(
  rideId: string,
  passengerId: string,
  expirationHours: number = 24,
) {
  try {
    // Verify the ride exists and belongs to the passenger
    const ride = await prisma.ride.findFirst({
      where: {
        id: rideId,
        passengerId,
        isDeleted: false,
        status: {
          in: ["accepted", "in_progress"],
        },
      },
      include: {
        passenger: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            metadata: true,
          },
        },
      },
    });

    if (!ride) {
      return {
        success: false,
        message: "Ride not found or not eligible for sharing",
      };
    }

    // Check if there's an active share link for this ride
    const existingShare = await prisma.tripShare.findFirst({
      where: {
        rideId,
        isActive: true,
        isDeleted: false,
        expiresAt: {
          gte: new Date(),
        },
      },
    });

    if (existingShare) {
      return {
        success: true,
        message: "Active share link already exists",
        data: {
          shareToken: existingShare.shareToken,
          shareUrl: generateShareUrl(existingShare.shareToken),
          expiresAt: existingShare.expiresAt,
        },
      };
    }

    // Generate a secure random token
    const shareToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expirationHours);

    // Get passenger contact from metadata
    const passengerContact =
      ride.passenger.metadata?.phone || ride.passenger.email;

    // Create trip share record
    const tripShare = await prisma.tripShare.create({
      data: {
        rideId,
        shareToken,
        passengerName: `${ride.passenger.firstName} ${ride.passenger.lastName}`,
        passengerContact,
        expiresAt,
        isActive: true,
      },
    });

    return {
      success: true,
      message: "Share link generated successfully",
      data: {
        shareToken: tripShare.shareToken,
        shareUrl: generateShareUrl(tripShare.shareToken),
        expiresAt: tripShare.expiresAt,
      },
    };
  } catch (error) {
    console.error("Error generating share link:", error);
    return {
      success: false,
      message: "Failed to generate share link",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get shared trip data by share token (public access)
 */
async function getSharedTripData(shareToken: string) {
  try {
    // Find the trip share
    const tripShare = await prisma.tripShare.findUnique({
      where: {
        shareToken,
      },
      include: {
        ride: {
          include: {
            passenger: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            driver: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                driverProfile: {
                  select: {
                    vehicle: {
                      select: {
                        plateNumber: true,
                        bodyNumber: true,
                      },
                    },
                  },
                },
              },
            },
            location: {
              select: {
                id: true,
                latitude: true,
                longitude: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    });

    if (!tripShare) {
      return {
        success: false,
        message: "Share link not found",
      };
    }

    // Check if the share link has expired
    if (new Date() > tripShare.expiresAt) {
      return {
        success: false,
        message: "Share link has expired",
      };
    }

    // Check if the share is still active
    if (!tripShare.isActive || tripShare.isDeleted) {
      return {
        success: false,
        message: "Share link is no longer active",
      };
    }

    // Check if the ride is still in progress or accepted
    if (!["accepted", "in_progress"].includes(tripShare.ride.status)) {
      return {
        success: false,
        message: "This trip has been completed or cancelled",
      };
    }

    // Increment view count asynchronously (don't wait for it)
    updateViewCount(shareToken).catch((error) =>
      console.error("Error updating view count:", error),
    );

    // Format the response
    const response = {
      tripInfo: {
        pickup: tripShare.ride.pickup,
        dropoff: tripShare.ride.dropoff,
        status: tripShare.ride.status,
        eta: tripShare.ride.eta,
        createdAt: tripShare.ride.createdAt,
      },
      passenger: {
        name: `${tripShare.ride.passenger.firstName} ${tripShare.ride.passenger.lastName}`,
        contact: tripShare.passengerContact,
      },
      driver: tripShare.ride.driver
        ? {
            name: `${tripShare.ride.driver.firstName} ${tripShare.ride.driver.lastName}`,
            vehicle: {
              plateNumber:
                tripShare.ride.driver.driverProfile?.vehicle?.plateNumber,
              bodyNumber:
                tripShare.ride.driver.driverProfile?.vehicle?.bodyNumber,
            },
          }
        : null,
      currentLocation: tripShare.ride.location
        ? {
            latitude: tripShare.ride.location.latitude,
            longitude: tripShare.ride.location.longitude,
            lastUpdated: tripShare.ride.location.updatedAt,
          }
        : null,
      shareInfo: {
        expiresAt: tripShare.expiresAt,
        viewCount: tripShare.viewCount,
      },
    };

    return {
      success: true,
      message: "Shared trip data retrieved successfully",
      data: response,
    };
  } catch (error) {
    console.error("Error getting shared trip data:", error);
    return {
      success: false,
      message: "Failed to retrieve shared trip data",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Deactivate a share link
 */
async function deactivateShare(shareToken: string, passengerId: string) {
  try {
    // Find the trip share and verify ownership
    const tripShare = await prisma.tripShare.findUnique({
      where: {
        shareToken,
      },
      include: {
        ride: {
          select: {
            passengerId: true,
          },
        },
      },
    });

    if (!tripShare) {
      return {
        success: false,
        message: "Share link not found",
      };
    }

    // Verify the passenger owns this trip
    if (tripShare.ride.passengerId !== passengerId) {
      return {
        success: false,
        message: "Unauthorized to deactivate this share link",
      };
    }

    // Deactivate the share
    await prisma.tripShare.update({
      where: {
        shareToken,
      },
      data: {
        isActive: false,
      },
    });

    return {
      success: true,
      message: "Share link deactivated successfully",
    };
  } catch (error) {
    console.error("Error deactivating share:", error);
    return {
      success: false,
      message: "Failed to deactivate share link",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Update view count for a shared trip
 */
async function updateViewCount(shareToken: string) {
  try {
    await prisma.tripShare.update({
      where: {
        shareToken,
      },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    });

    return {
      success: true,
      message: "View count updated",
    };
  } catch (error) {
    console.error("Error updating view count:", error);
    return {
      success: false,
      message: "Failed to update view count",
    };
  }
}

/**
 * Get all active shares for a specific ride
 */
async function getActiveSharesByRide(rideId: string, passengerId: string) {
  try {
    // Verify the ride belongs to the passenger
    const ride = await prisma.ride.findFirst({
      where: {
        id: rideId,
        passengerId,
        isDeleted: false,
      },
    });

    if (!ride) {
      return {
        success: false,
        message: "Ride not found",
      };
    }

    const shares = await prisma.tripShare.findMany({
      where: {
        rideId,
        isActive: true,
        isDeleted: false,
        expiresAt: {
          gte: new Date(),
        },
      },
      select: {
        id: true,
        shareToken: true,
        expiresAt: true,
        viewCount: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      success: true,
      message: "Active shares retrieved successfully",
      data: shares.map((share) => ({
        ...share,
        shareUrl: generateShareUrl(share.shareToken),
      })),
    };
  } catch (error) {
    console.error("Error getting active shares:", error);
    return {
      success: false,
      message: "Failed to retrieve active shares",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Cleanup expired shares (should be run periodically)
 */
async function cleanupExpiredShares() {
  try {
    const result = await prisma.tripShare.updateMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    return {
      success: true,
      message: `Cleaned up ${result.count} expired shares`,
      data: {
        count: result.count,
      },
    };
  } catch (error) {
    console.error("Error cleaning up expired shares:", error);
    return {
      success: false,
      message: "Failed to cleanup expired shares",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
