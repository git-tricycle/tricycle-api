import { Prisma } from "../../prisma/generated/prisma";
import { getPrismaClient } from "../lib/db.connection";

const prisma = getPrismaClient();

const vehicleService = {
  getAllVehicles,
  getVehicleById,
  getVehicleByDriverId,
  createVehicle,
  updateVehicle,
  deleteVehicle,
};

export default vehicleService;

async function getAllVehicles(params?: {
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
    const {
      page = 1,
      limit = 10,
      sort,
      order = "desc",
      fields,
      query,
      filters,
      reqQuery,
    } = params || {};

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
    const whereClause: Prisma.VehicleWhereInput = {
      isDeleted: false,
      ...(query
        ? {
            OR: [
              { plateNumber: { contains: query, mode: "insensitive" } },
              { bodyNumber: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
      // Apply dynamic filters
      ...(combinedFilters || {}),
    };

    const findManyQuery: Prisma.VehicleFindManyArgs = {
      where: whereClause,
      skip,
      take: limit,
      orderBy: sort
        ? typeof sort === "string" && !sort.startsWith("{")
          ? { [sort]: order }
          : JSON.parse(sort)
        : undefined,
    };

    // Handle field selection - default to only "id" if no fields specified
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

    const [vehicles, total] = await Promise.all([
      prisma.vehicle.findMany(findManyQuery),
      prisma.vehicle.count({ where: whereClause }),
    ]);

    return {
      success: true,
      message: "Vehicles retrieved successfully",
      data: vehicles,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total,
      },
    };
  } catch (error) {
    console.error("Get vehicles error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}

async function getVehicleById(id: string, fields?: string) {
  try {
    const query: Prisma.VehicleFindUniqueArgs = {
      where: {
        id,
        isDeleted: false,
      },
    };

    // Handle field selection - default to only "id" if no fields specified
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

    const vehicle = await prisma.vehicle.findUnique(query);

    if (!vehicle) {
      return {
        success: false,
        message: "Vehicle not found",
      };
    }

    return {
      success: true,
      message: "Vehicle retrieved successfully",
      data: vehicle,
    };
  } catch (error) {
    console.error("Get vehicle error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}

async function createVehicle(data: Prisma.VehicleUncheckedCreateInput) {
  try {
    // Check if vehicle id already exists
    const existingVehicle = await prisma.vehicle.findUnique({
      where: { plateNumber: data.plateNumber },
    });

    if (existingVehicle) {
      return { success: false, message: "Vehicle Plate Number already exists" };
    }

    // Create vehicle
    const vehicle = await prisma.vehicle.create({
      data: {
        driverId: data.driverId,
        plateNumber: data.plateNumber,
        bodyNumber: data.bodyNumber,
        vehiclePhoto: data.vehiclePhoto,
        orCrPhoto: data.orCrPhoto,
      },
      select: {
        id: true,
        plateNumber: true,
        bodyNumber: true,
        vehiclePhoto: true,
        orCrPhoto: true,
      },
    });

    return { success: true, data: vehicle, message: "Vehicle created successfully" };
  } catch (error) {
    console.error("Create vehicle error:", error);
    return { success: false, message: "Server error" };
  }
}

async function updateVehicle(id: string, data: Prisma.VehicleUpdateInput) {
  try {
    // Check if vehicle exists
    const existingVehicle = await prisma.vehicle.findUnique({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!existingVehicle) {
      return {
        success: false,
        message: "Vehicle not found",
      };
    }

    // Prepare update data
    const updateData = { ...data };

    // Update vehicle
    const updatedVehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        ...updateData,
      },
      select: {
        id: true,
        driverId: true,
        plateNumber: true,
        bodyNumber: true,
        vehiclePhoto: true,
        orCrPhoto: true,
        isApproved: true,
      },
    });

    return {
      success: true,
      message: "Vehicle updated successfully",
      data: updatedVehicle,
    };
  } catch (error) {
    console.error("Update vehicle error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}

async function deleteVehicle(id: string) {
  try {
    // Check if vehicle exists
    const existingVehicle = await prisma.vehicle.findUnique({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!existingVehicle) {
      return {
        success: false,
        message: "Vehicle not found",
      };
    }

    // Soft delete vehicle
    await prisma.vehicle.update({
      where: { id },
      data: {
        isDeleted: true,
      },
    });

    return {
      success: true,
      message: "Vehicle deleted successfully",
    };
  } catch (error) {
    console.error("Delete vehicle error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}

async function getVehicleByDriverId(driverId: string) {
  try {
    // First try to find by driver profile ID, then by userId
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        OR: [
          { driverId, isDeleted: false },
          {
            driver: {
              userId: driverId,
              isDeleted: false,
            },
            isDeleted: false,
          },
        ],
      },
      select: {
        id: true,
        driverId: true,
        plateNumber: true,
        bodyNumber: true,
        vehiclePhoto: true,
        orCrPhoto: true,
        isApproved: true,
        driver: {
          select: {
            id: true,
            username: true,
            contactNumber: true,
          },
        },
      },
    });

    if (!vehicle) {
      return {
        success: false,
        message: "Vehicle not found for this driver",
      };
    }

    return {
      success: true,
      message: "Vehicle retrieved successfully",
      data: vehicle,
    };
  } catch (error) {
    console.error("Get vehicle by driver error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}
