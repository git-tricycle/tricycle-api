import express, { Request, Response } from "express";
import authService from "../services/auth.service";
import { logInfo, logError } from "../middleware/logger";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
async function register(req: Request, res: Response) {
  try {
    const { firstName, lastName, middleName, email, password, metadata } = req.body;

    const result = await authService.register({ firstName, lastName, middleName, email, password, metadata });

    if (!result.success) {
      logError(`Registration failed for: ${email}`, result.message, req);
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`User registered successfully: ${email}`, req);
    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        user: result.user,
        token: result.token,
      },
    });
  } catch (error) {
    logError("Register error", error, req);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
async function login(req: Request, res: Response) {
  try {
    const { email, password, role } = req.body;

    const result = await authService.login(email, password, role);

    if (!result.success) {
      logError(`Login failed for: ${email}`, result.message, req);
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    logInfo(`User logged in successfully: ${email}`, req);
    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        user: {
          firstName: result.data?.user.firstName,
          lastName: result.data?.user.lastName,
          middleName: result.data?.user.middleName,
        },
        token: result.data?.token,
      },
    });
  } catch (error) {
    logError("Login error", error, req);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

export default router;
