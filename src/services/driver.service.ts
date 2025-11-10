import { Prisma } from "../../prisma/generated/prisma";
import { getPrismaClient } from "../lib/db.connection";

const prisma = getPrismaClient();

const driverService = {
  getAllDrivers,
  getDriverById,
  createDriver,
  updateDriver,
  deleteDriver,
};

export default driverService;

async function getAllDrivers(params?: {
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
    const whereClause: Prisma.DriverProfileWhereInput = {
      isDeleted: false,
      ...(query
        ? {
            OR: [{ username: { contains: query, mode: "insensitive" } }],
          }
        : {}),
      // Apply dynamic filters
      ...(combinedFilters || {}),
    };

    const findManyQuery: Prisma.DriverProfileFindManyArgs = {
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

    const [drivers, total] = await Promise.all([
      prisma.driverProfile.findMany(findManyQuery),
      prisma.driverProfile.count({ where: whereClause }),
    ]);

    return {
      success: true,
      message: "Drivers retrieved successfully",
      data: drivers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total,
      },
    };
  } catch (error) {
    console.error("Get drivers error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}

async function getDriverById(id: string, fields?: string) {
  try {
    const query: Prisma.DriverProfileFindUniqueArgs = {
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

    const driver = await prisma.driverProfile.findUnique(query);

    if (!driver) {
      return {
        success: false,
        message: "Driver not found",
      };
    }

    return {
      success: true,
      message: "Driver retrieved successfully",
      data: driver,
    };
  } catch (error) {
    console.error("Get driver error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}

async function createDriver(data: Prisma.DriverProfileCreateInput) {
  try {
    // Check if driver id already exists
    const exisitingDriver = await prisma.driverProfile.findUnique({
      where: { username: data.username },
    });

    if (exisitingDriver) {
      return { success: false, message: "Driver ID already exists" };
    }

    // Create driver
    const driver = await prisma.driverProfile.create({
      data: {
        username: data.username,
        address: data.address,
        age: data.age,
        contactNumber: data.contactNumber,
        validIdPhoto: data.validIdPhoto,
        licensePhoto: data.licensePhoto,
        user: data.user,
      },
      select: {
        id: true,
        userId: true,
        username: true,
        address: true,
        age: true,
        contactNumber: true,
        validIdPhoto: true,
        licensePhoto: true,
      },
    });

    return { success: true, data: driver, message: "Driver created successfully" };
  } catch (error) {
    console.error("Register error:", error);
    return { success: false, message: "Server error" };
  }
}

async function updateDriver(id: string, data: Prisma.DriverProfileUpdateInput) {
  try {
    // Check if driver exists
    const exisitingDriver = await prisma.driverProfile.findUnique({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!exisitingDriver) {
      return {
        success: false,
        message: "Driver not found",
      };
    }

    // Prepare update data
    const updateData = { ...data };

    // Update driver
    const updatedDriver = await prisma.driverProfile.update({
      where: { id },
      data: {
        ...updateData,
      },
      select: {
        id: true,
        userId: true,
        username: true,
        address: true,
        age: true,
        contactNumber: true,
        validIdPhoto: true,
        licensePhoto: true,
      },
    });

    return {
      success: true,
      message: "Driver updated successfully",
      data: updatedDriver,
    };
  } catch (error) {
    console.error("Update driver error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}

async function deleteDriver(id: string) {
  try {
    // Check if driver exists
    const exisitingDriver = await prisma.driverProfile.findUnique({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!exisitingDriver) {
      return {
        success: false,
        message: "Driver not found",
      };
    }

    // Soft delete driver
    await prisma.driverProfile.update({
      where: { id },
      data: {
        isDeleted: true,
      },
    });

    return {
      success: true,
      message: "Driver deleted successfully",
    };
  } catch (error) {
    console.error("Delete driver error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}
