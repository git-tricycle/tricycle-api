import { Prisma } from "../../prisma/generated/prisma";
import { getPrismaClient } from "../lib/db.connection";
import cloudinaryService from "../utils/cloudinary";

const prisma = getPrismaClient();

const vehicleService = {
  getAllVehicles,
  getVehicleById,
  getVehicleByDriverId,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  uploadVehicleDocuments,
  deleteVehicleDocuments,
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

async function uploadVehicleDocuments(
  vehicleId: string,
  files: { vehiclePhoto?: Express.Multer.File; orCrPhoto?: Express.Multer.File }
) {
  try {
    // Check if vehicle exists
    const existingVehicle = await prisma.vehicle.findUnique({
      where: {
        id: vehicleId,
        isDeleted: false,
      },
    });

    if (!existingVehicle) {
      return {
        success: false,
        message: "Vehicle not found",
      };
    }

    const updateData: any = {};
    const uploadResults: any = {};

    // Upload vehicle photo if provided
    if (files.vehiclePhoto) {
      try {
        const vehiclePhotoResult = await cloudinaryService.uploadAttachment(
          files.vehiclePhoto,
          `vehicle-documents/${vehicleId}/vehicle-photo`
        );
        updateData.vehiclePhoto = vehiclePhotoResult.url;
        uploadResults.vehiclePhoto = {
          url: vehiclePhotoResult.url,
          publicId: vehiclePhotoResult.publicId,
          filename: vehiclePhotoResult.filename,
        };
      } catch (error) {
        console.error("Vehicle photo upload error:", error);
        return {
          success: false,
          message: "Failed to upload vehicle photo",
        };
      }
    }

    // Upload OR/CR photo if provided
    if (files.orCrPhoto) {
      try {
        const orCrResult = await cloudinaryService.uploadAttachment(
          files.orCrPhoto,
          `vehicle-documents/${vehicleId}/or-cr`
        );
        updateData.orCrPhoto = orCrResult.url;
        uploadResults.orCrPhoto = {
          url: orCrResult.url,
          publicId: orCrResult.publicId,
          filename: orCrResult.filename,
        };
      } catch (error) {
        console.error("OR/CR photo upload error:", error);
        return {
          success: false,
          message: "Failed to upload OR/CR photo",
        };
      }
    }

    // Set vehicle as approved if both documents are uploaded
    const hasVehiclePhoto = updateData.vehiclePhoto || existingVehicle.vehiclePhoto;
    const hasOrCrPhoto = updateData.orCrPhoto || existingVehicle.orCrPhoto;

    if (hasVehiclePhoto && hasOrCrPhoto) {
      updateData.isApproved = true;
    }

    // Update vehicle with new document URLs and approval status
    const updatedVehicle = await prisma.vehicle.update({
      where: { id: vehicleId },
      data: updateData,
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
      message: "Vehicle documents uploaded successfully",
      data: {
        vehicle: updatedVehicle,
        uploadResults,
      },
    };
  } catch (error) {
    console.error("Upload vehicle documents error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}

async function deleteVehicleDocuments(
  vehicleId: string,
  documentType?: "vehiclePhoto" | "orCrPhoto" | "all"
) {
  try {
    // Check if vehicle exists
    const existingVehicle = await prisma.vehicle.findUnique({
      where: {
        id: vehicleId,
        isDeleted: false,
      },
    });

    if (!existingVehicle) {
      return {
        success: false,
        message: "Vehicle not found",
      };
    }

    const updateData: any = {};
    const deletionResults: string[] = [];

    // Determine what to delete
    const shouldDeleteVehiclePhoto = documentType === "vehiclePhoto" || documentType === "all";
    const shouldDeleteOrCrPhoto = documentType === "orCrPhoto" || documentType === "all";
    const shouldDeleteBoth = !documentType || documentType === "all";

    // Delete vehicle photo
    if ((shouldDeleteVehiclePhoto || shouldDeleteBoth) && existingVehicle.vehiclePhoto) {
      try {
        // Extract public ID from URL or use the full path
        const vehiclePhotoPublicId = existingVehicle.vehiclePhoto.includes("vehicle-documents")
          ? existingVehicle.vehiclePhoto.split("/").slice(-3).join("/").split(".")[0]
          : null;

        if (vehiclePhotoPublicId) {
          await cloudinaryService.deleteAttachment(
            vehiclePhotoPublicId,
            `vehicle-documents/${vehicleId}/vehicle-photo`
          );
        }
        updateData.vehiclePhoto = null;
        deletionResults.push("Vehicle photo deleted");
      } catch (error) {
        console.error("Vehicle photo deletion error:", error);
        // Continue with other operations even if this fails
      }
    }

    // Delete OR/CR photo
    if ((shouldDeleteOrCrPhoto || shouldDeleteBoth) && existingVehicle.orCrPhoto) {
      try {
        // Extract public ID from URL or use the full path
        const orCrPublicId = existingVehicle.orCrPhoto.includes("vehicle-documents")
          ? existingVehicle.orCrPhoto.split("/").slice(-3).join("/").split(".")[0]
          : null;

        if (orCrPublicId) {
          await cloudinaryService.deleteAttachment(
            orCrPublicId,
            `vehicle-documents/${vehicleId}/or-cr`
          );
        }
        updateData.orCrPhoto = null;
        deletionResults.push("OR/CR photo deleted");
      } catch (error) {
        console.error("OR/CR photo deletion error:", error);
        // Continue with other operations even if this fails
      }
    }

    // Update approval status - set to false if any document is deleted
    if (Object.keys(updateData).length > 0) {
      updateData.isApproved = false;
    }

    // Update vehicle in database
    if (Object.keys(updateData).length > 0) {
      const updatedVehicle = await prisma.vehicle.update({
        where: { id: vehicleId },
        data: updateData,
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
        message: deletionResults.length > 0 ? deletionResults.join(", ") : "No documents to delete",
        data: updatedVehicle,
      };
    }

    return {
      success: true,
      message: "No documents to delete",
      data: existingVehicle,
    };
  } catch (error) {
    console.error("Delete vehicle documents error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}
