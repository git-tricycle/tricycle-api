import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

// Import routes
import userRoutes from "./routes/user.route";
import authRoutes from "./routes/auth.route";

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
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "https://nextjs-template-frontend.vercel.app" || "http://localhost:3000",
    credentials: true,
  })
);
app.use(limiter);
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

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Start server with database connection check
async function startServer() {
  const isDbConnected = await connectDatabase();

  if (!isDbConnected) {
    console.error("Server not started due to database connection issues");
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

// Start the application
startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
