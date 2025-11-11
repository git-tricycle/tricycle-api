import { Prisma } from "../../prisma/generated/prisma";
import { getPrismaClient } from "../lib/db.connection";

const prisma = getPrismaClient();

const paymentService = {
  getAllPayments,
  getPaymentById,
  getPaymentByRideId,
  createPayment,
  updatePayment,
  deletePayment,
  processPayment,
};

export default paymentService;

async function getAllPayments(params?: {
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
    const whereClause: Prisma.PaymentWhereInput = {
      isDeleted: false,
      ...(query
        ? {
            OR: [{ isPaid: { equals: query as any } }],
          }
        : {}),
      // Apply dynamic filters
      ...(combinedFilters || {}),
    };

    const findManyQuery: Prisma.PaymentFindManyArgs = {
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

    const [payments, total] = await Promise.all([
      prisma.payment.findMany(findManyQuery),
      prisma.payment.count({ where: whereClause }),
    ]);

    return {
      success: true,
      message: "Payments retrieved successfully",
      data: payments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total,
      },
    };
  } catch (error) {
    console.error("Get payments error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}

async function getPaymentById(id: string, fields?: string) {
  try {
    const query: Prisma.PaymentFindUniqueArgs = {
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

    const payment = await prisma.payment.findUnique(query);

    if (!payment) {
      return {
        success: false,
        message: "Payment not found",
      };
    }

    return {
      success: true,
      message: "Payment retrieved successfully",
      data: payment,
    };
  } catch (error) {
    console.error("Get payment by ID error:", error);
    return {
      success: false,
      message: "Failed to retrieve payment",
    };
  }
}

async function getPaymentByRideId(rideId: string) {
  try {
    const payment = await prisma.payment.findUnique({
      where: { rideId },
      include: {
        ride: {
          include: {
            passenger: true,
            driver: true,
          },
        },
      },
    });

    if (!payment) {
      return {
        success: false,
        message: "Payment not found for this ride",
      };
    }

    return {
      success: true,
      message: "Payment retrieved successfully",
      data: payment,
    };
  } catch (error) {
    console.error("Get payment by ride ID error:", error);
    return {
      success: false,
      message: "Failed to retrieve payment",
    };
  }
}

async function createPayment(data: { rideId: string; amount: number; type: "cash" | "gcash" }) {
  try {
    // Check if ride exists
    const ride = await prisma.ride.findUnique({
      where: { id: data.rideId },
    });

    if (!ride) {
      return {
        success: false,
        message: "Ride not found",
      };
    }

    // Check if payment already exists for this ride
    const existingPayment = await prisma.payment.findUnique({
      where: { rideId: data.rideId },
    });

    if (existingPayment) {
      return {
        success: false,
        message: "Payment already exists for this ride",
      };
    }

    const payment = await prisma.payment.create({
      data: {
        rideId: data.rideId,
        amount: data.amount,
        type: data.type,
      },
      include: {
        ride: {
          include: {
            passenger: true,
            driver: true,
          },
        },
      },
    });

    return {
      success: true,
      message: "Payment created successfully",
      data: payment,
    };
  } catch (error) {
    console.error("Create payment error:", error);
    return {
      success: false,
      message: "Failed to create payment",
    };
  }
}

async function updatePayment(
  id: string,
  data: {
    amount?: number;
    type?: "cash" | "gcash";
    isPaid?: boolean;
  }
) {
  try {
    const existingPayment = await prisma.payment.findUnique({
      where: { id },
    });

    if (!existingPayment) {
      return {
        success: false,
        message: "Payment not found",
      };
    }

    // Prepare update data
    const updateData = { ...data };

    const payment = await prisma.payment.update({
      where: { id },
      data: {
        ...updateData,
      },
      include: {
        ride: {
          include: {
            passenger: true,
            driver: true,
          },
        },
      },
    });

    return {
      success: true,
      message: "Payment updated successfully",
      data: payment,
    };
  } catch (error) {
    console.error("Update payment error:", error);
    return {
      success: false,
      message: "Failed to update payment",
    };
  }
}

async function deletePayment(id: string) {
  try {
    const existingPayment = await prisma.payment.findUnique({
      where: { id },
    });

    if (!existingPayment) {
      return {
        success: false,
        message: "Payment not found",
      };
    }
    // Soft delete payment
    await prisma.payment.update({
      where: { id },
      data: {
        isDeleted: true,
      },
    });

    return {
      success: true,
      message: "Payment deleted successfully",
    };
  } catch (error) {
    console.error("Delete payment error:", error);
    return {
      success: false,
      message: "Failed to delete payment",
    };
  }
}

async function processPayment(id: string) {
  try {
    const existingPayment = await prisma.payment.findUnique({
      where: { id },
      include: {
        ride: true,
      },
    });

    if (!existingPayment) {
      return {
        success: false,
        message: "Payment not found",
      };
    }

    if (existingPayment.isPaid) {
      return {
        success: false,
        message: "Payment has already been processed",
      };
    }

    const payment = await prisma.payment.update({
      where: { id },
      data: {
        isPaid: true,
      },
      include: {
        ride: {
          include: {
            passenger: true,
            driver: true,
          },
        },
      },
    });

    return {
      success: true,
      message: "Payment processed successfully",
      data: payment,
    };
  } catch (error) {
    console.error("Process payment error:", error);
    return {
      success: false,
      message: "Failed to process payment",
    };
  }
}
