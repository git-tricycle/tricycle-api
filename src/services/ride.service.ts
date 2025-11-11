import { Prisma } from "../../prisma/generated/prisma";
import { getPrismaClient } from "../lib/db.connection";

const prisma = getPrismaClient();

const rideService = {
  getAllRides,
  getRideById,
  createRide,
  updateRide,
  deleteRide,
  acceptRide,
  cancelRide,
  completeRide,
  startRide,
  getRidesByPassenger,
  getRidesByDriver,
};

export default rideService;

async function getAllRides(params?: {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  fields?: string;
  query?: string;
  filters?: Record<string, any>;
  reqQuery?: Record<string, any>;
}) {
  try {
    const { page = 1, limit = 10, sort, order = "desc", fields, query, filters, reqQuery } = params || {};

    // Build dynamic filters from query parameters (format: filter_fieldName)
    let dynamicFilters: Record<string, any> = {};

    if (reqQuery) {
      Object.keys(reqQuery).forEach((key) => {
        if (key.startsWith("filter_")) {
          const fieldName = key.replace("filter_", "");
          const value = reqQuery[key];
          if (value && typeof value === "string") {
            dynamicFilters[fieldName] = value;
          }
        }
      });
    }

    // Merge provided filters with dynamic filters
    const combinedFilters = { ...filters, ...dynamicFilters };

    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: Prisma.RideWhereInput = {
      isDeleted: false,
      ...(query
        ? {
            OR: [
              { pickup: { contains: query, mode: "insensitive" } },
              { dropoff: { contains: query, mode: "insensitive" } },
              { status: { equals: query as any } },
            ],
          }
        : {}),
      // Apply dynamic filters
      ...(combinedFilters || {}),
    };

    const findManyQuery: Prisma.RideFindManyArgs = {
      where: whereClause,
      skip,
      take: limit,
      orderBy: sort
        ? typeof sort === "string" && !sort.startsWith("{")
          ? { [sort]: order }
          : JSON.parse(sort)
        : { createdAt: "desc" },
    };

    // Handle field selection - default to basic fields if no fields specified
    const fieldSelections = fields
      ? fields.split(",").reduce(
          (acc, field) => {
            const parts = field.trim().split(".");
            if (parts.length > 1) {
              const [parent, ...children] = parts;
              acc[parent] = acc[parent] || { select: {} };

              let current = acc[parent].select;
              for (let i = 0; i < children.length - 1; i++) {
                current[children[i]] = current[children[i]] || { select: {} };
                current = current[children[i]].select;
              }
              current[children[children.length - 1]] = true;
            } else {
              acc[parts[0]] = true;
            }
            return acc;
          },
          { id: true } as Record<string, any>
        )
      : { id: true };

    findManyQuery.select = fieldSelections;

    const [rides, total] = await Promise.all([
      prisma.ride.findMany(findManyQuery),
      prisma.ride.count({ where: whereClause }),
    ]);

    return {
      success: true,
      message: "Rides retrieved successfully",
      data: rides,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total,
      },
    };
  } catch (error) {
    console.error("Get rides error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}

async function getRideById(id: string, fields?: string) {
  try {
    const query: Prisma.RideFindUniqueArgs = {
      where: {
        id,
        isDeleted: false,
      },
    };

    // Handle field selection - default to basic fields if no fields specified
    const fieldSelections = fields
      ? fields.split(",").reduce(
          (acc, field) => {
            const parts = field.trim().split(".");
            if (parts.length > 1) {
              const [parent, ...children] = parts;
              acc[parent] = acc[parent] || { select: {} };

              let current = acc[parent].select;
              for (let i = 0; i < children.length - 1; i++) {
                current[children[i]] = current[children[i]] || { select: {} };
                current = current[children[i]].select;
              }
              current[children[children.length - 1]] = true;
            } else {
              acc[parts[0]] = true;
            }
            return acc;
          },
          { id: true } as Record<string, any>
        )
      : { id: true };

    query.select = fieldSelections;

    const ride = await prisma.ride.findUnique(query);

    if (!ride) {
      return {
        success: false,
        message: "Ride not found",
      };
    }

    return {
      success: true,
      message: "Ride retrieved successfully",
      data: ride,
    };
  } catch (error) {
    console.error("Get ride error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}

async function createRide(data: {
  passengerId: string;
  pickup: string;
  dropoff: string;
  fare: number;
  paymentMode: string;
  locationId?: string;
  eta?: number;
}) {
  try {
    // Validate passenger exists
    const passenger = await prisma.user.findUnique({
      where: { id: data.passengerId, isDeleted: false },
    });

    if (!passenger) {
      return { success: false, message: "User not found" };
    }

    // Create ride
    const ride = await prisma.ride.create({
      data: {
        passengerId: data.passengerId,
        pickup: data.pickup,
        dropoff: data.dropoff,
        fare: data.fare,
        paymentMode: data.paymentMode,
        locationId: data.locationId,
        eta: data.eta,
      },
      select: {
        id: true,
        passengerId: true,
        driverId: true,
        locationId: true,
        pickup: true,
        dropoff: true,
        fare: true,
        paymentMode: true,
        status: true,
        eta: true,
        createdAt: true,
        passenger: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
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
    });

    return { success: true, data: ride, message: "Ride created successfully" };
  } catch (error) {
    console.error("Create ride error:", error);
    return { success: false, message: "Server error" };
  }
}

async function updateRide(id: string, data: Prisma.RideUpdateInput) {
  try {
    // Check if ride exists
    const existingRide = await prisma.ride.findUnique({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!existingRide) {
      return {
        success: false,
        message: "Ride not found",
      };
    }

    // Prepare update data
    const updateData = { ...data };

    // Update ride
    const updatedRide = await prisma.ride.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        passengerId: true,
        driverId: true,
        locationId: true,
        pickup: true,
        dropoff: true,
        fare: true,
        paymentMode: true,
        status: true,
        eta: true,
        createdAt: true,
        passenger: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
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
    });

    return {
      success: true,
      message: "Ride updated successfully",
      data: updatedRide,
    };
  } catch (error) {
    console.error("Update ride error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}

async function deleteRide(id: string) {
  try {
    // Check if ride exists
    const existingRide = await prisma.ride.findUnique({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!existingRide) {
      return {
        success: false,
        message: "Ride not found",
      };
    }

    // Soft delete ride
    await prisma.ride.update({
      where: { id },
      data: {
        isDeleted: true,
      },
    });

    return {
      success: true,
      message: "Ride deleted successfully",
    };
  } catch (error) {
    console.error("Delete ride error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}

async function acceptRide(id: string, driverId: string) {
  try {
    // Check if ride exists and is pending
    const existingRide = await prisma.ride.findUnique({
      where: {
        id,
        isDeleted: false,
        status: "pending",
      },
    });

    if (!existingRide) {
      return {
        success: false,
        message: "Ride not found or not available for acceptance",
      };
    }

    // Validate driver exists
    const driver = await prisma.user.findUnique({
      where: { id: driverId, role: "driver", isDeleted: false },
    });

    if (!driver) {
      return { success: false, message: "Driver not found" };
    }

    // Accept ride
    const updatedRide = await prisma.ride.update({
      where: { id },
      data: {
        driverId,
        status: "accepted",
      },
      select: {
        id: true,
        passengerId: true,
        driverId: true,
        locationId: true,
        pickup: true,
        dropoff: true,
        fare: true,
        paymentMode: true,
        status: true,
        eta: true,
        createdAt: true,
        passenger: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
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
    });

    return {
      success: true,
      message: "Ride accepted successfully",
      data: updatedRide,
    };
  } catch (error) {
    console.error("Accept ride error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}

async function cancelRide(id: string) {
  try {
    // Check if ride exists and can be cancelled
    const existingRide = await prisma.ride.findUnique({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!existingRide) {
      return {
        success: false,
        message: "Ride not found",
      };
    }

    if (existingRide.status === "completed" || existingRide.status === "cancelled") {
      return {
        success: false,
        message: "Cannot cancel a completed or already cancelled ride",
      };
    }

    // Cancel ride
    const updatedRide = await prisma.ride.update({
      where: { id },
      data: {
        status: "cancelled",
      },
      select: {
        id: true,
        status: true,
      },
    });

    return {
      success: true,
      message: "Ride cancelled successfully",
      data: updatedRide,
    };
  } catch (error) {
    console.error("Cancel ride error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}

async function startRide(id: string) {
  try {
    // Check if ride exists and is accepted
    const existingRide = await prisma.ride.findUnique({
      where: {
        id,
        isDeleted: false,
        status: "accepted",
      },
    });

    if (!existingRide) {
      return {
        success: false,
        message: "Ride not found or not in accepted status",
      };
    }

    // Start ride (move to in_progress)
    const updatedRide = await prisma.ride.update({
      where: { id },
      data: {
        status: "in_progress",
      },
      select: {
        id: true,
        status: true,
        passenger: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return {
      success: true,
      message: "Ride started successfully",
      data: updatedRide,
    };
  } catch (error) {
    console.error("Start ride error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}

async function completeRide(id: string) {
  try {
    // Check if ride exists and is in progress
    const existingRide = await prisma.ride.findUnique({
      where: {
        id,
        isDeleted: false,
        status: "in_progress",
      },
    });

    if (!existingRide) {
      return {
        success: false,
        message: "Ride not found or not in progress",
      };
    }

    // Complete ride
    const updatedRide = await prisma.ride.update({
      where: { id },
      data: {
        status: "completed",
      },
      select: {
        id: true,
        status: true,
        passenger: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return {
      success: true,
      message: "Ride completed successfully",
      data: updatedRide,
    };
  } catch (error) {
    console.error("Complete ride error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}

async function getRidesByPassenger(
  passengerId: string,
  params?: {
    page?: number;
    limit?: number;
    status?: string;
  }
) {
  try {
    const { page = 1, limit = 10, status } = params || {};
    const skip = (page - 1) * limit;

    const whereClause: Prisma.RideWhereInput = {
      passengerId,
      isDeleted: false,
      ...(status ? { status: status as any } : {}),
    };

    const [rides, total] = await Promise.all([
      prisma.ride.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          locationId: true,
          pickup: true,
          dropoff: true,
          fare: true,
          paymentMode: true,
          status: true,
          eta: true,
          createdAt: true,
          driver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
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
      }),
      prisma.ride.count({ where: whereClause }),
    ]);

    return {
      success: true,
      message: "Passenger rides retrieved successfully",
      data: rides,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total,
      },
    };
  } catch (error) {
    console.error("Get passenger rides error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}

async function getRidesByDriver(
  driverId: string,
  params?: {
    page?: number;
    limit?: number;
    status?: string;
  }
) {
  try {
    const { page = 1, limit = 10, status } = params || {};
    const skip = (page - 1) * limit;

    const whereClause: Prisma.RideWhereInput = {
      driverId,
      isDeleted: false,
      ...(status ? { status: status as any } : {}),
    };

    const [rides, total] = await Promise.all([
      prisma.ride.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          locationId: true,
          pickup: true,
          dropoff: true,
          fare: true,
          paymentMode: true,
          status: true,
          eta: true,
          createdAt: true,
          passenger: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
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
      }),
      prisma.ride.count({ where: whereClause }),
    ]);

    return {
      success: true,
      message: "Driver rides retrieved successfully",
      data: rides,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total,
      },
    };
  } catch (error) {
    console.error("Get driver rides error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}
