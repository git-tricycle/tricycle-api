import { Prisma } from "../../prisma/generated/prisma";
import { getPrismaClient } from "../lib/db.connection";
import cloudinaryService from "../utils/cloudinary";

const prisma = getPrismaClient();

const driverService = {
  getAllDrivers,
  getDriverById,
  createDriver,
  updateDriver,
  deleteDriver,
  updateDriverStatus,
  updateDriverLocation,
  uploadRequirements,
  deleteRequirements,
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
    // First try to find by driver profile ID, then by userId
    const query: Prisma.DriverProfileFindFirstArgs = {
      where: {
        OR: [
          { id, isDeleted: false },
          { userId: id, isDeleted: false },
        ],
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

    console.log("Field selections:", JSON.stringify(fieldSelections, null, 2));

    const driver = await prisma.driverProfile.findFirst(query);

    console.log("Driver data returned:", JSON.stringify(driver, null, 2));

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

async function updateDriverStatus(userId: string, isOnline: boolean) {
  try {
    // First check if driver profile exists
    const driverProfile = await prisma.driverProfile.findFirst({
      where: {
        userId,
        isDeleted: false,
      },
    });

    if (!driverProfile) {
      return {
        success: false,
        message: "Driver profile not found",
      };
    }

    // Update user status (online/offline)
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        status: isOnline ? "active" : "inactive",
        updatedAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        updatedAt: true,
      },
    });

    return {
      success: true,
      message: `Driver status updated to ${isOnline ? "online" : "offline"}`,
      data: {
        userId: updatedUser.id,
        isOnline,
        status: updatedUser.status,
        updatedAt: updatedUser.updatedAt,
      },
    };
  } catch (error) {
    console.error("Update driver status error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}

async function updateDriverLocation(
  userId: string,
  location: { latitude: number; longitude: number }
) {
  try {
    // First check if driver profile exists
    const driverProfile = await prisma.driverProfile.findFirst({
      where: {
        userId,
        isDeleted: false,
      },
    });

    if (!driverProfile) {
      return {
        success: false,
        message: "Driver profile not found",
      };
    }

    // Create or update driver location
    const existingLocation = await prisma.location.findFirst({
      where: {
        userId: userId,
      },
    });

    let locationRecord;

    if (existingLocation) {
      // Update existing location
      locationRecord = await prisma.location.update({
        where: { id: existingLocation.id },
        data: {
          latitude: location.latitude,
          longitude: location.longitude,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new location record
      locationRecord = await prisma.location.create({
        data: {
          latitude: location.latitude,
          longitude: location.longitude,
          userId: userId,
        },
      });
    }

    return {
      success: true,
      message: "Driver location updated successfully",
      data: {
        locationId: locationRecord.id,
        latitude: locationRecord.latitude,
        longitude: locationRecord.longitude,
        updatedAt: locationRecord.updatedAt,
      },
    };
  } catch (error) {
    console.error("Update driver location error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}

async function uploadRequirements(
  driverId: string,
  files: { licensePhoto?: Express.Multer.File; validIdPhoto?: Express.Multer.File }
) {
  try {
    // Check if driver exists
    const existingDriver = await prisma.driverProfile.findUnique({
      where: {
        id: driverId,
        isDeleted: false,
      },
    });

    if (!existingDriver) {
      return {
        success: false,
        message: "Driver not found",
      };
    }

    const updateData: any = {};
    const uploadResults: any = {};

    // Upload license photo if provided
    if (files.licensePhoto) {
      try {
        const licenseResult = await cloudinaryService.uploadAttachment(
          files.licensePhoto,
          `driver-requirements/${driverId}/license`
        );
        updateData.licensePhoto = licenseResult.url;
        uploadResults.licensePhoto = {
          url: licenseResult.url,
          publicId: licenseResult.publicId,
          filename: licenseResult.filename,
        };
      } catch (error) {
        console.error("License photo upload error:", error);
        return {
          success: false,
          message: "Failed to upload license photo",
        };
      }
    }

    // Upload valid ID photo if provided
    if (files.validIdPhoto) {
      try {
        const validIdResult = await cloudinaryService.uploadAttachment(
          files.validIdPhoto,
          `driver-requirements/${driverId}/valid-id`
        );
        updateData.validIdPhoto = validIdResult.url;
        uploadResults.validIdPhoto = {
          url: validIdResult.url,
          publicId: validIdResult.publicId,
          filename: validIdResult.filename,
        };
      } catch (error) {
        console.error("Valid ID photo upload error:", error);
        return {
          success: false,
          message: "Failed to upload valid ID photo",
        };
      }
    }

    // Set driver as verified if both documents are uploaded
    const hasLicense = updateData.licensePhoto || existingDriver.licensePhoto;
    const hasValidId = updateData.validIdPhoto || existingDriver.validIdPhoto;

    if (hasLicense && hasValidId) {
      updateData.isVerified = true;
    }

    // Update driver with new document URLs and verification status
    const updatedDriver = await prisma.driverProfile.update({
      where: { id: driverId },
      data: updateData,
      select: {
        id: true,
        userId: true,
        username: true,
        licensePhoto: true,
        validIdPhoto: true,
        isVerified: true,
      },
    });

    return {
      success: true,
      message: "Requirements uploaded successfully",
      data: {
        driver: updatedDriver,
        uploadResults,
      },
    };
  } catch (error) {
    console.error("Upload requirements error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}

async function deleteRequirements(driverId: string, documentType?: "license" | "validId" | "all") {
  try {
    // Check if driver exists
    const existingDriver = await prisma.driverProfile.findUnique({
      where: {
        id: driverId,
        isDeleted: false,
      },
    });

    if (!existingDriver) {
      return {
        success: false,
        message: "Driver not found",
      };
    }

    const updateData: any = {};
    const deletionResults: string[] = [];

    // Determine what to delete
    const shouldDeleteLicense = documentType === "license" || documentType === "all";
    const shouldDeleteValidId = documentType === "validId" || documentType === "all";
    const shouldDeleteBoth = !documentType || documentType === "all";

    // Delete license photo
    if ((shouldDeleteLicense || shouldDeleteBoth) && existingDriver.licensePhoto) {
      try {
        // Extract public ID from URL or use the full path
        const licensePublicId = existingDriver.licensePhoto.includes("driver-requirements")
          ? existingDriver.licensePhoto.split("/").slice(-3).join("/").split(".")[0]
          : null;

        if (licensePublicId) {
          await cloudinaryService.deleteAttachment(
            licensePublicId,
            `driver-requirements/${driverId}/license`
          );
        }
        updateData.licensePhoto = null;
        deletionResults.push("License photo deleted");
      } catch (error) {
        console.error("License photo deletion error:", error);
        // Continue with other operations even if this fails
      }
    }

    // Delete valid ID photo
    if ((shouldDeleteValidId || shouldDeleteBoth) && existingDriver.validIdPhoto) {
      try {
        // Extract public ID from URL or use the full path
        const validIdPublicId = existingDriver.validIdPhoto.includes("driver-requirements")
          ? existingDriver.validIdPhoto.split("/").slice(-3).join("/").split(".")[0]
          : null;

        if (validIdPublicId) {
          await cloudinaryService.deleteAttachment(
            validIdPublicId,
            `driver-requirements/${driverId}/valid-id`
          );
        }
        updateData.validIdPhoto = null;
        deletionResults.push("Valid ID photo deleted");
      } catch (error) {
        console.error("Valid ID photo deletion error:", error);
        // Continue with other operations even if this fails
      }
    }

    // Update verification status - set to false if any document is deleted
    if (Object.keys(updateData).length > 0) {
      updateData.isVerified = false;
    }

    // Update driver in database
    if (Object.keys(updateData).length > 0) {
      const updatedDriver = await prisma.driverProfile.update({
        where: { id: driverId },
        data: updateData,
        select: {
          id: true,
          userId: true,
          username: true,
          licensePhoto: true,
          validIdPhoto: true,
          isVerified: true,
        },
      });

      return {
        success: true,
        message: deletionResults.length > 0 ? deletionResults.join(", ") : "No documents to delete",
        data: updatedDriver,
      };
    }

    return {
      success: true,
      message: "No documents to delete",
      data: existingDriver,
    };
  } catch (error) {
    console.error("Delete requirements error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}
