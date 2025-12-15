import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

// Import routes
import userRoutes from "./routes/user.route";
import authRoutes from "./routes/auth.route";
import studentRoutes from "./routes/student.route";
import vehicleRoutes from "./routes/vehicle.route";
import driverRoutes from "./routes/driver.route";
import rideRoutes from "./routes/ride.route";
import paymentRoutes from "./routes/payment.route";
import ratingRoutes from "./routes/rating.route";
import locationRoutes from "./routes/location.route";
import fareRoutes from "./routes/fare.route";

// Import middleware
import { errorHandler } from "./middleware/error.handler";
import { notFound } from "./middleware/not.found";
import { httpLogger } from "./middleware/logger";

// Import the database connection
import { connectDatabase } from "./lib/db.connection";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Rate limiting
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // limit each IP to 100 requests per windowMs
//   message: "Too many requests from this IP, please try again later.",
// });

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // In development, allow all origins
      if (process.env.NODE_ENV !== "production") {
        return callback(null, true);
      }

      // In production, you can specify allowed origins
      const allowedOrigins = [
        "http://localhost:8081",
        "http://localhost:8080",
        "http://127.0.0.1:8081",
        "http://127.0.0.1:8080",
        "exp://localhost:8081",
        "exp://127.0.0.1:8081",
        process.env.FRONTEND_URL,
      ];

      if (
        allowedOrigins.includes(origin) ||
        /^https?:\/\/.*\.expo\.dev$/.test(origin) ||
        /^https?:\/\/.*\.ngrok\.io$/.test(origin)
      ) {
        return callback(null, true);
      }

      // For now, allow all origins (you can restrict this later)
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);
// app.use(limiter);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(httpLogger); // Winston HTTP logging

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/vehicle", vehicleRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/ride", rideRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/rating", ratingRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/fare", fareRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Start server with database connection check
async function startServer() {
  await connectDatabase();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Start the application
startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
