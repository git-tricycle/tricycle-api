import express, { Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import { logError, logInfo } from "../middleware/logger";
import { requireDeletePermission, requireWritePermission } from "../middleware/rbac";
import paymentService from "../services/payment.service";

const router = express.Router();

router.get("/", authenticate, getAllPayments);
router.post("/", authenticate, requireWritePermission, createPayment);
router.get("/ride/:rideId", authenticate, getPaymentByRideId);
router.get("/:id", authenticate, getPaymentById);
router.patch("/:id", authenticate, requireWritePermission, updatePayment);
router.put("/:id", authenticate, requireDeletePermission, deletePayment);
router.patch("/:id/process", authenticate, requireWritePermission, processPayment);

// @route   GET /api/payment
// @desc    Get all payments
// @access  Private
async function getAllPayments(req: Request, res: Response) {
  try {
    const { page, limit, sort, order, fields, query } = req.query;

    // Validate query parameters
    if (page && (isNaN(Number(page)) || Number(page) < 1)) {
      logError("Invalid page parameter", `Page: ${page}`, req);
      return res.status(400).json({
        success: false,
        message: "Invalid page parameter",
      });
    }

    if (limit && (isNaN(Number(limit)) || Number(limit) < 1)) {
      logError("Invalid limit parameter", `Limit: ${limit}`, req);
      return res.status(400).json({
        success: false,
        message: "Invalid limit parameter",
      });
    }

    if (order && !["asc", "desc"].includes(order as string)) {
      logError("Invalid order parameter", `Order: ${order}`, req);
      return res.status(400).json({
        success: false,
        message: "Order must be 'asc' or 'desc'",
      });
    }

    if (fields && typeof fields !== "string") {
      logError("Invalid fields parameter", `Fields: ${fields}`, req);
      return res.status(400).json({
        success: false,
        message: "Fields must be a string",
      });
    }

    const params = {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sort: sort as string,
      order: order as "asc" | "desc",
      fields: fields as string,
      query: query as string,
      reqQuery: req.query,
    };

    const result = await paymentService.getAllPayments(params);

    if (!result.success) {
      logError("Failed to fetch payments", result.message, req);
      return res.status(500).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully retrieved ${result.data?.length || 0} payments`, req);
    res.json({
      success: true,
      message: result.message,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    logError("Get payments error", error, req);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

// @route   GET /api/payment/:id
// @desc    Get payment by ID
// @access  Private
async function getPaymentById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id) {
      logError("Payment ID not provided", null, req);
      return res.status(400).json({
        success: false,
        message: "Payment ID is required",
      });
    }

    const result = await paymentService.getPaymentById(id);

    if (!result.success) {
      logError(`Failed to fetch payment: ${id}`, result.message, req);
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully retrieved payment: ${id}`, req);
    res.json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    logError("Get payment by ID error", error, req);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

// @route   GET /api/payment/ride/:rideId
// @desc    Get payment by ride ID
// @access  Private
async function getPaymentByRideId(req: Request, res: Response) {
  try {
    const { rideId } = req.params;

    if (!rideId) {
      logError("Ride ID not provided", null, req);
      return res.status(400).json({
        success: false,
        message: "Ride ID is required",
      });
    }

    const result = await paymentService.getPaymentByRideId(rideId);

    if (!result.success) {
      logError(`Failed to fetch payment for ride: ${rideId}`, result.message, req);
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Successfully retrieved payment for ride: ${rideId}`, req);
    res.json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    logError("Get payment by ride ID error", error, req);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

// @route   POST /api/payment
// @desc    Create a new payment
// @access  Private (requires write permission)
async function createPayment(req: Request, res: Response) {
  try {
    const { rideId, amount, type } = req.body;

    // Validate required fields
    if (!rideId) {
      logError("Missing required field: rideId", null, req);
      return res.status(400).json({
        success: false,
        message: "Ride ID is required",
      });
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      logError("Invalid amount provided", `Amount: ${amount}`, req);
      return res.status(400).json({
        success: false,
        message: "Valid amount is required",
      });
    }

    if (!type || !["cash", "gcash"].includes(type)) {
      logError("Invalid payment type", `Type: ${type}`, req);
      return res.status(400).json({
        success: false,
        message: "Payment type must be 'cash' or 'gcash'",
      });
    }

    const result = await paymentService.createPayment({
      rideId,
      amount: Number(amount),
      type,
    });

    if (!result.success) {
      logError(`Failed to create payment for ride: ${rideId}`, result.message, req);
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Payment created successfully for ride: ${rideId}`, req);
    res.status(201).json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    logError("Create payment error", error, req);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

// @route   PATCH /api/payment/:id
// @desc    Update a payment
// @access  Private (requires write permission)
async function updatePayment(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { amount, type, isPaid } = req.body;

    if (!id) {
      logError("Payment ID not provided", null, req);
      return res.status(400).json({
        success: false,
        message: "Payment ID is required",
      });
    }

    // Validate amount if provided
    if (amount !== undefined && (isNaN(Number(amount)) || Number(amount) <= 0)) {
      logError("Invalid amount provided", `Amount: ${amount}`, req);
      return res.status(400).json({
        success: false,
        message: "Valid amount is required",
      });
    }

    // Validate type if provided
    if (type !== undefined && !["cash", "gcash"].includes(type)) {
      logError("Invalid payment type", `Type: ${type}`, req);
      return res.status(400).json({
        success: false,
        message: "Payment type must be 'cash' or 'gcash'",
      });
    }

    // Validate isPaid if provided
    if (isPaid !== undefined && typeof isPaid !== "boolean") {
      logError("Invalid isPaid value", `isPaid: ${isPaid}`, req);
      return res.status(400).json({
        success: false,
        message: "isPaid must be a boolean value",
      });
    }

    const updateData: any = {};
    if (amount !== undefined) updateData.amount = Number(amount);
    if (type !== undefined) updateData.type = type;
    if (isPaid !== undefined) updateData.isPaid = isPaid;

    const result = await paymentService.updatePayment(id, updateData);

    if (!result.success) {
      logError(`Failed to update payment: ${id}`, result.message, req);
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Payment updated successfully: ${id}`, req);
    res.json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    logError("Update payment error", error, req);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

// @route   PUT /api/payment/:id
// @desc    Delete a payment
// @access  Private (requires delete permission)
async function deletePayment(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id) {
      logError("Payment ID not provided", null, req);
      return res.status(400).json({
        success: false,
        message: "Payment ID is required",
      });
    }

    const result = await paymentService.deletePayment(id);

    if (!result.success) {
      logError(`Failed to delete payment: ${id}`, result.message, req);
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Payment deleted successfully: ${id}`, req);
    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    logError("Delete payment error", error, req);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

// @route   PATCH /api/payment/:id/process
// @desc    Process a payment (mark as paid)
// @access  Private (requires write permission)
async function processPayment(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id) {
      logError("Payment ID not provided", null, req);
      return res.status(400).json({
        success: false,
        message: "Payment ID is required",
      });
    }

    const result = await paymentService.processPayment(id);

    if (!result.success) {
      logError(`Failed to process payment: ${id}`, result.message, req);
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`Payment processed successfully: ${id}`, req);
    res.json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    logError("Process payment error", error, req);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

export default router;
