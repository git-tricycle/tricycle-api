import { Prisma } from "../../prisma/generated/prisma";
import { getPrismaClient } from "../lib/db.connection";

const prisma = getPrismaClient();

const locationService = {
  getAllLocations,
  getLocationById,
  getLocationByUserId,
  createLocation,
  updateLocation,
  deleteLocation,
};

export default locationService;

async function getAllLocations(params?: {
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
    const whereClause: Prisma.LocationWhereInput = {
      ...(query
        ? {
            OR: [{ userId: { contains: query, mode: "insensitive" } }],
          }
        : {}),
      // Apply dynamic filters
      ...(combinedFilters || {}),
    };

    const findManyQuery: Prisma.LocationFindManyArgs = {
      where: whereClause,
      skip,
      take: limit,
      orderBy: sort
        ? typeof sort === "string" && !sort.startsWith("{")
          ? { [sort]: order }
          : JSON.parse(sort)
        : { updatedAt: "desc" },
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

    const [locations, total] = await Promise.all([
      prisma.location.findMany(findManyQuery),
      prisma.location.count({ where: whereClause }),
    ]);

    return {
      success: true,
      message: "Locations retrieved successfully",
      data: locations,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total,
      },
    };
  } catch (error) {
    console.error("Get locations error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}

async function getLocationById(id: string, fields?: string) {
  try {
    const query: Prisma.LocationFindUniqueArgs = {
      where: {
        id,
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

    const location = await prisma.location.findUnique(query);

    if (!location) {
      return {
        success: false,
        message: "Location not found",
      };
    }

    return {
      success: true,
      message: "Location retrieved successfully",
      data: location,
    };
  } catch (error) {
    console.error("Get location error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}

async function getLocationByUserId(userId: string) {
  try {
    const location = await prisma.location.findUnique({
      where: {
        userId,
      },
      select: {
        id: true,
        userId: true,
        latitude: true,
        longitude: true,
        updatedAt: true,
      },
    });

    if (!location) {
      return {
        success: false,
        message: "Location not found for this user",
      };
    }

    return {
      success: true,
      message: "Location retrieved successfully",
      data: location,
    };
  } catch (error) {
    console.error("Get location by user ID error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}

async function createLocation(data: { userId: string; latitude: number; longitude: number }) {
  try {
    // Validate user exists
    const user = await prisma.user.findUnique({
      where: { id: data.userId, isDeleted: false },
    });

    if (!user) {
      return { success: false, message: "User not found" };
    }

    // Check if location already exists for this user
    const existingLocation = await prisma.location.findUnique({
      where: { userId: data.userId },
    });

    if (existingLocation) {
      return { success: false, message: "Location already exists for this user" };
    }

    // Validate coordinates
    if (data.latitude < -90 || data.latitude > 90) {
      return { success: false, message: "Latitude must be between -90 and 90" };
    }

    if (data.longitude < -180 || data.longitude > 180) {
      return { success: false, message: "Longitude must be between -180 and 180" };
    }

    // Create location
    const location = await prisma.location.create({
      data: {
        userId: data.userId,
        latitude: data.latitude,
        longitude: data.longitude,
      },
      select: {
        id: true,
        userId: true,
        latitude: true,
        longitude: true,
        updatedAt: true,
      },
    });

    return { success: true, data: location, message: "Location created successfully" };
  } catch (error) {
    console.error("Create location error:", error);
    return { success: false, message: "Server error" };
  }
}

async function updateLocation(
  id: string,
  data: {
    latitude?: number;
    longitude?: number;
  }
) {
  try {
    // Check if location exists
    const existingLocation = await prisma.location.findUnique({
      where: {
        id,
      },
    });

    if (!existingLocation) {
      return {
        success: false,
        message: "Location not found",
      };
    }

    // Validate coordinates if provided
    if (data.latitude !== undefined && (data.latitude < -90 || data.latitude > 90)) {
      return { success: false, message: "Latitude must be between -90 and 90" };
    }

    if (data.longitude !== undefined && (data.longitude < -180 || data.longitude > 180)) {
      return { success: false, message: "Longitude must be between -180 and 180" };
    }

    // Prepare update data
    const updateData: Prisma.LocationUpdateInput = {};
    if (data.latitude !== undefined) updateData.latitude = data.latitude;
    if (data.longitude !== undefined) updateData.longitude = data.longitude;

    // Update location
    const updatedLocation = await prisma.location.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        userId: true,
        latitude: true,
        longitude: true,
        updatedAt: true,
      },
    });

    return {
      success: true,
      message: "Location updated successfully",
      data: updatedLocation,
    };
  } catch (error) {
    console.error("Update location error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}

async function deleteLocation(id: string) {
  try {
    // Check if location exists
    const existingLocation = await prisma.location.findUnique({
      where: {
        id,
      },
    });

    if (!existingLocation) {
      return {
        success: false,
        message: "Location not found",
      };
    }

    // Delete location (hard delete since no isDeleted field)
    await prisma.location.delete({
      where: { id },
    });

    return {
      success: true,
      message: "Location deleted successfully",
    };
  } catch (error) {
    console.error("Delete location error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}
