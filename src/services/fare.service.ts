import { Role } from "../types";
import { requireAdminPermission } from "../middleware/rbac";
import { getPrismaClient } from "../lib/db.connection";

const prisma = getPrismaClient();

export interface FareSettings {
  id: string;
  baseFare: number;
  ratePerKm: number;
  minimumFare?: number;
  maximumFare?: number;
  timeBasedRate?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFareSettingsData {
  baseFare: number;
  ratePerKm: number;
  minimumFare?: number;
  maximumFare?: number;
  timeBasedRate?: number;
}

export interface UpdateFareSettingsData {
  baseFare?: number;
  ratePerKm?: number;
  minimumFare?: number;
  maximumFare?: number;
  timeBasedRate?: number;
  isActive?: boolean;
}

const fareService = {
  getCurrentFareSettings,
  getAllFareSettings,
  createFareSettings,
  updateFareSettings,
  deleteFareSettings,
  getFareCalculation,
  calculateFare,
};

export default fareService;

// Get current active fare settings
async function getCurrentFareSettings() {
  try {
    const fareSettings = await prisma.fareSettings.findFirst({
      where: {
        isActive: true,
        isDeleted: false,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // If no fare settings exist, create default ones
    if (!fareSettings) {
      const defaultSettings = await prisma.fareSettings.create({
        data: {
          baseFare: 15.0,
          ratePerKm: 8.0,
          isActive: true,
        },
      });

      return {
        success: true,
        message: "Default fare settings created",
        data: defaultSettings,
      };
    }

    return {
      success: true,
      message: "Current fare settings retrieved successfully",
      data: fareSettings,
    };
  } catch (error) {
    console.error("Get current fare settings error:", error);
    return {
      success: false,
      message: "Failed to retrieve fare settings",
      data: null,
    };
  }
}

// Get all fare settings (admin only)
async function getAllFareSettings(userRole?: Role) {
  try {
    requireAdminPermission(userRole);

    const fareSettings = await prisma.fareSettings.findMany({
      where: {
        isDeleted: false,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      success: true,
      message: "Fare settings retrieved successfully",
      data: fareSettings,
    };
  } catch (error) {
    console.error("Get all fare settings error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to retrieve fare settings",
      data: null,
    };
  }
}

// Create new fare settings (admin only)
async function createFareSettings(data: CreateFareSettingsData, userRole?: Role) {
  try {
    requireAdminPermission(userRole);

    // Validate input
    if (!data.baseFare || data.baseFare <= 0) {
      return {
        success: false,
        message: "Base fare must be a positive number",
        data: null,
      };
    }

    if (!data.ratePerKm || data.ratePerKm <= 0) {
      return {
        success: false,
        message: "Rate per km must be a positive number",
        data: null,
      };
    }

    // Deactivate all existing fare settings
    await prisma.fareSettings.updateMany({
      where: {
        isActive: true,
        isDeleted: false,
      },
      data: {
        isActive: false,
      },
    });

    // Create new fare settings
    const newFareSettings = await prisma.fareSettings.create({
      data: {
        baseFare: data.baseFare,
        ratePerKm: data.ratePerKm,
        isActive: true,
      },
    });

    return {
      success: true,
      message: "Fare settings created successfully",
      data: newFareSettings,
    };
  } catch (error) {
    console.error("Create fare settings error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create fare settings",
      data: null,
    };
  }
}

// Update fare settings (admin only)
async function updateFareSettings(id: string, data: UpdateFareSettingsData, userRole?: Role) {
  try {
    requireAdminPermission(userRole);

    // Check if fare settings exist
    const existingSettings = await prisma.fareSettings.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!existingSettings) {
      return {
        success: false,
        message: "Fare settings not found",
        data: null,
      };
    }

    // Validate input
    if (data.baseFare !== undefined && data.baseFare <= 0) {
      return {
        success: false,
        message: "Base fare must be a positive number",
        data: null,
      };
    }

    if (data.ratePerKm !== undefined && data.ratePerKm <= 0) {
      return {
        success: false,
        message: "Rate per km must be a positive number",
        data: null,
      };
    }

    // If setting as active, deactivate all other settings
    if (data.isActive === true) {
      await prisma.fareSettings.updateMany({
        where: {
          id: { not: id },
          isActive: true,
          isDeleted: false,
        },
        data: {
          isActive: false,
        },
      });
    }

    // Update fare settings
    const updatedSettings = await prisma.fareSettings.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      message: "Fare settings updated successfully",
      data: updatedSettings,
    };
  } catch (error) {
    console.error("Update fare settings error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update fare settings",
      data: null,
    };
  }
}

// Delete fare settings (admin only)
async function deleteFareSettings(id: string, userRole?: Role) {
  try {
    requireAdminPermission(userRole);

    // Check if fare settings exist
    const existingSettings = await prisma.fareSettings.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!existingSettings) {
      return {
        success: false,
        message: "Fare settings not found",
      };
    }

    // Don't allow deleting the active fare settings
    if (existingSettings.isActive) {
      return {
        success: false,
        message: "Cannot delete active fare settings",
      };
    }

    // Soft delete
    await prisma.fareSettings.update({
      where: { id },
      data: {
        isDeleted: true,
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      message: "Fare settings deleted successfully",
    };
  } catch (error) {
    console.error("Delete fare settings error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete fare settings",
    };
  }
}

// Calculate fare based on distance with enhanced options
export function calculateFare(
  distance: number,
  baseFare: number,
  ratePerKm: number,
  options?: {
    minimumFare?: number;
    maximumFare?: number;
    timeBasedRate?: number;
    estimatedTime?: number;
    surgeMultiplier?: number;
  }
): number {
  let fare = baseFare + distance * ratePerKm;

  // Add time-based fare if applicable
  if (options?.timeBasedRate && options?.estimatedTime) {
    fare += (options.estimatedTime / 60) * options.timeBasedRate;
  }

  // Apply surge pricing if applicable
  if (options?.surgeMultiplier && options.surgeMultiplier > 1) {
    fare *= options.surgeMultiplier;
  }

  // Apply minimum fare limit
  if (options?.minimumFare) {
    fare = Math.max(fare, options.minimumFare);
  }

  // Apply maximum fare limit
  if (options?.maximumFare) {
    fare = Math.min(fare, options.maximumFare);
  }

  return Math.round(fare * 100) / 100; // Round to 2 decimal places
}

// Get fare calculation with enhanced options
async function getFareCalculation(
  distance: number,
  options?: {
    estimatedTime?: number;
    surgeMultiplier?: number;
  }
) {
  try {
    const fareSettingsResult = await getCurrentFareSettings();

    if (!fareSettingsResult.success || !fareSettingsResult.data) {
      return {
        success: false,
        message: "Failed to get fare settings",
        data: null,
      };
    }

    const fareSettings = fareSettingsResult.data;
    const { baseFare, ratePerKm, minimumFare, maximumFare, timeBasedRate } = fareSettings;

    const calculatedFare = calculateFare(distance, baseFare, ratePerKm, {
      minimumFare: minimumFare || undefined,
      maximumFare: maximumFare || undefined,
      timeBasedRate: timeBasedRate || undefined,
      estimatedTime: options?.estimatedTime,
      surgeMultiplier: options?.surgeMultiplier,
    });

    return {
      success: true,
      message: "Fare calculated successfully",
      data: {
        distance,
        baseFare,
        ratePerKm,
        minimumFare,
        maximumFare,
        timeBasedRate,
        estimatedTime: options?.estimatedTime,
        surgeMultiplier: options?.surgeMultiplier,
        calculatedFare,
      },
    };
  } catch (error) {
    console.error("Calculate fare error:", error);
    return {
      success: false,
      message: "Failed to calculate fare",
      data: null,
    };
  }
}
