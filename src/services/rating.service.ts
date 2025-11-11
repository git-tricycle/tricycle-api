import { Prisma } from "../../prisma/generated/prisma";
import { getPrismaClient } from "../lib/db.connection";

const prisma = getPrismaClient();

const ratingService = {
  getAllRatings,
  getRatingById,
  getRatingByRideId,
  createRating,
  updateRating,
  deleteRating,
};

export default ratingService;

async function getAllRatings(params?: {
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
    const whereClause: Prisma.RatingWhereInput = {
      isDeleted: false,
      ...(query
        ? {
            OR: [
              { comment: { contains: query, mode: "insensitive" } },
              { passengerId: { contains: query, mode: "insensitive" } },
              { driverId: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
      // Apply dynamic filters
      ...(combinedFilters || {}),
    };

    const findManyQuery: Prisma.RatingFindManyArgs = {
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

    const [ratings, total] = await Promise.all([
      prisma.rating.findMany(findManyQuery),
      prisma.rating.count({ where: whereClause }),
    ]);

    return {
      success: true,
      message: "Ratings retrieved successfully",
      data: ratings,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total,
      },
    };
  } catch (error) {
    console.error("Get ratings error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}

async function getRatingById(id: string, fields?: string) {
  try {
    const query: Prisma.RatingFindUniqueArgs = {
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

    const rating = await prisma.rating.findUnique(query);

    if (!rating) {
      return {
        success: false,
        message: "Rating not found",
      };
    }

    return {
      success: true,
      message: "Rating retrieved successfully",
      data: rating,
    };
  } catch (error) {
    console.error("Get rating error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}

async function getRatingByRideId(rideId: string) {
  try {
    const rating = await prisma.rating.findUnique({
      where: {
        rideId,
        isDeleted: false,
      },
      select: {
        id: true,
        rideId: true,
        passengerId: true,
        driverId: true,
        rating: true,
        comment: true,
        createdAt: true,
      },
    });

    if (!rating) {
      return {
        success: false,
        message: "Rating not found for this ride",
      };
    }

    return {
      success: true,
      message: "Rating retrieved successfully",
      data: rating,
    };
  } catch (error) {
    console.error("Get rating by ride ID error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}

async function createRating(data: {
  rideId: string;
  passengerId: string;
  driverId: string;
  rating: number;
  comment?: string;
}) {
  try {
    // Validate ride exists and is completed
    const ride = await prisma.ride.findUnique({
      where: {
        id: data.rideId,
        isDeleted: false,
      },
    });

    if (!ride) {
      return { success: false, message: "Ride not found" };
    }

    if (ride.status !== "completed") {
      return { success: false, message: "Can only rate completed rides" };
    }

    // Check if rating already exists for this ride
    const existingRating = await prisma.rating.findUnique({
      where: { rideId: data.rideId },
    });

    if (existingRating && !existingRating.isDeleted) {
      return { success: false, message: "Rating already exists for this ride" };
    }

    // Validate rating value
    if (data.rating < 1 || data.rating > 5) {
      return { success: false, message: "Rating must be between 1 and 5" };
    }

    // Create rating
    const rating = await prisma.rating.create({
      data: {
        rideId: data.rideId,
        passengerId: data.passengerId,
        driverId: data.driverId,
        rating: data.rating,
        comment: data.comment,
      },
      select: {
        id: true,
        rideId: true,
        passengerId: true,
        driverId: true,
        rating: true,
        comment: true,
        createdAt: true,
      },
    });

    return { success: true, data: rating, message: "Rating created successfully" };
  } catch (error) {
    console.error("Create rating error:", error);
    return { success: false, message: "Server error" };
  }
}

async function updateRating(
  id: string,
  data: {
    rating?: number;
    comment?: string;
  }
) {
  try {
    // Check if rating exists
    const existingRating = await prisma.rating.findUnique({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!existingRating) {
      return {
        success: false,
        message: "Rating not found",
      };
    }

    // Validate rating value if provided
    if (data.rating !== undefined && (data.rating < 1 || data.rating > 5)) {
      return { success: false, message: "Rating must be between 1 and 5" };
    }

    // Prepare update data
    const updateData: Prisma.RatingUpdateInput = {};
    if (data.rating !== undefined) updateData.rating = data.rating;
    if (data.comment !== undefined) updateData.comment = data.comment;

    // Update rating
    const updatedRating = await prisma.rating.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        rideId: true,
        passengerId: true,
        driverId: true,
        rating: true,
        comment: true,
        createdAt: true,
      },
    });

    return {
      success: true,
      message: "Rating updated successfully",
      data: updatedRating,
    };
  } catch (error) {
    console.error("Update rating error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}

async function deleteRating(id: string) {
  try {
    // Check if rating exists
    const existingRating = await prisma.rating.findUnique({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!existingRating) {
      return {
        success: false,
        message: "Rating not found",
      };
    }

    // Soft delete rating
    await prisma.rating.update({
      where: { id },
      data: {
        isDeleted: true,
      },
    });

    return {
      success: true,
      message: "Rating deleted successfully",
    };
  } catch (error) {
    console.error("Delete rating error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}
