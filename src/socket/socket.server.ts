import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { getPrismaClient } from "../lib/db.connection";

const prisma = getPrismaClient();

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

interface LocationUpdate {
  latitude: number;
  longitude: number;
  timestamp: Date;
}

interface RideLocationUpdate extends LocationUpdate {
  rideId: string;
  driverId: string;
}

let io: SocketIOServer | null = null;

export function initializeSocketServer(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps)
        if (!origin) return callback(null, true);

        // In development, allow all origins
        if (process.env.NODE_ENV !== "production") {
          return callback(null, true);
        }

        // In production, specify allowed origins
        const allowedOrigins = [
          "http://localhost:8081",
          "http://localhost:8080",
          "http://127.0.0.1:8081",
          "http://127.0.0.1:8080",
          "https://ride-it-app.vercel.app",
          process.env.FRONTEND_URL,
        ];

        if (
          allowedOrigins.includes(origin) ||
          /^https?:\/\/.*\.expo\.dev$/.test(origin) ||
          /^https?:\/\/.*\.ngrok\.io$/.test(origin) ||
          /^https?:\/\/.*\.vercel\.app$/.test(origin)
        ) {
          return callback(null, true);
        }

        // For now, allow all origins (you can restrict this later)
        return callback(null, true);
      },
      credentials: true,
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.split(" ")[1];

      if (!token) {
        // Allow unauthenticated connections for public share tracking
        const shareToken = socket.handshake.auth.shareToken;
        if (shareToken) {
          socket.userId = `share_${shareToken}`;
          socket.userRole = "public";
          return next();
        }
        return next(new Error("Authentication token required"));
      }

      // Verify JWT token
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "your-secret-key",
      ) as any;
      socket.userId = decoded.id;
      socket.userRole = decoded.role;

      next();
    } catch (error) {
      console.error("Socket authentication error:", error);
      next(new Error("Authentication failed"));
    }
  });

  // Connection handler
  io.on("connection", (socket: AuthenticatedSocket) => {
    console.log(
      `Client connected: ${socket.id} (User: ${socket.userId}, Role: ${socket.userRole})`,
    );

    // Driver joins their own room for location updates
    socket.on("driver:join", async (data: { driverId: string }) => {
      if (socket.userRole !== "driver") {
        socket.emit("error", { message: "Only drivers can join driver rooms" });
        return;
      }

      const room = `driver:${data.driverId}`;
      await socket.join(room);

      // Also join the global drivers room for new ride notifications
      await socket.join("drivers");

      console.log(`Driver ${data.driverId} joined rooms: ${room} and drivers`);
      socket.emit("driver:joined", { room, globalRoom: "drivers" });
    });

    // Passenger joins a ride room to track driver location
    socket.on("ride:join", async (data: { rideId: string }) => {
      try {
        // Verify the ride exists and user has access
        const ride = await prisma.ride.findUnique({
          where: { id: data.rideId },
          include: {
            passenger: true,
            driver: true,
          },
        });

        if (!ride) {
          socket.emit("error", { message: "Ride not found" });
          return;
        }

        // Check if user is authorized to join this ride room
        const isPassenger = socket.userId === ride.passenger?.id;
        const isDriver = socket.userId === ride.driver?.id;
        const isPublicShare = socket.userRole === "public";

        if (!isPassenger && !isDriver && !isPublicShare) {
          socket.emit("error", { message: "Unauthorized to join this ride" });
          return;
        }

        const room = `ride:${data.rideId}`;
        await socket.join(room);
        console.log(`User ${socket.userId} joined ride room: ${room}`);
        socket.emit("ride:joined", { room, rideId: data.rideId });

        // Send current ride status and location
        const location = await prisma.location.findFirst({
          where: { userId: ride.driver?.id },
          orderBy: { updatedAt: "desc" },
        });

        if (location) {
          socket.emit("ride:location:update", {
            rideId: data.rideId,
            location: {
              latitude: location.latitude,
              longitude: location.longitude,
              timestamp: location.updatedAt,
            },
          });
        }
      } catch (error) {
        console.error("Error joining ride room:", error);
        socket.emit("error", { message: "Failed to join ride" });
      }
    });

    // Passenger or public viewer joins using share token
    socket.on("share:join", async (data: { shareToken: string }) => {
      try {
        // Verify the share token exists and is active
        const tripShare = await prisma.tripShare.findUnique({
          where: { shareToken: data.shareToken },
          include: {
            ride: {
              include: {
                driver: true,
              },
            },
          },
        });

        if (!tripShare || !tripShare.isActive) {
          socket.emit("error", { message: "Invalid or expired share link" });
          return;
        }

        const room = `ride:${tripShare.rideId}`;
        await socket.join(room);
        console.log(`Share viewer joined ride room: ${room}`);
        socket.emit("share:joined", { room, rideId: tripShare.rideId });

        // Send current ride status and location
        const location = await prisma.location.findFirst({
          where: { userId: tripShare.ride.driver?.id },
          orderBy: { updatedAt: "desc" },
        });

        if (location) {
          socket.emit("ride:location:update", {
            rideId: tripShare.rideId,
            location: {
              latitude: location.latitude,
              longitude: location.longitude,
              timestamp: location.updatedAt,
            },
          });
        }
      } catch (error) {
        console.error("Error joining share room:", error);
        socket.emit("error", { message: "Failed to join shared trip" });
      }
    });

    // Driver updates their location (broadcasts to all rides they're in)
    socket.on("driver:location:update", async (data: LocationUpdate) => {
      if (socket.userRole !== "driver") {
        socket.emit("error", { message: "Only drivers can update location" });
        return;
      }

      try {
        // Find active rides for this driver
        const activeRides = await prisma.ride.findMany({
          where: {
            driverId: socket.userId,
            status: {
              in: ["accepted", "in_progress"],
            },
          },
          select: {
            id: true,
            passengerId: true,
          },
        });

        // Broadcast location update to all active ride rooms
        for (const ride of activeRides) {
          const room = `ride:${ride.id}`;
          io?.to(room).emit("ride:location:update", {
            rideId: ride.id,
            location: {
              latitude: data.latitude,
              longitude: data.longitude,
              timestamp: data.timestamp || new Date(),
            },
          });
        }

        socket.emit("driver:location:updated", {
          success: true,
          rideCount: activeRides.length,
        });
      } catch (error) {
        console.error("Error broadcasting location update:", error);
        socket.emit("error", { message: "Failed to update location" });
      }
    });

    // Ride status updates (e.g., started, completed)
    socket.on(
      "ride:status:update",
      async (data: { rideId: string; status: string }) => {
        try {
          const ride = await prisma.ride.findUnique({
            where: { id: data.rideId },
            include: { driver: true },
          });

          if (!ride) {
            socket.emit("error", { message: "Ride not found" });
            return;
          }

          // Check authorization
          const isDriver = socket.userId === ride.driver?.id;
          if (!isDriver && socket.userRole !== "admin") {
            socket.emit("error", {
              message: "Unauthorized to update ride status",
            });
            return;
          }

          const room = `ride:${data.rideId}`;
          io?.to(room).emit("ride:status:update", {
            rideId: data.rideId,
            status: data.status,
            timestamp: new Date(),
          });

          console.log(`Ride ${data.rideId} status updated to: ${data.status}`);
        } catch (error) {
          console.error("Error updating ride status:", error);
          socket.emit("error", { message: "Failed to update ride status" });
        }
      },
    );

    // Leave ride room
    socket.on("ride:leave", async (data: { rideId: string }) => {
      const room = `ride:${data.rideId}`;
      await socket.leave(room);
      console.log(`User ${socket.userId} left ride room: ${room}`);
      socket.emit("ride:left", { room });
    });

    // Disconnect handler
    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id} (User: ${socket.userId})`);
    });

    // Error handler
    socket.on("error", (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });

  console.log("Socket.IO server initialized");
  return io;
}

// Helper function to emit events from services
export function emitToRide(rideId: string, event: string, data: any) {
  if (!io) {
    console.warn("Socket.IO server not initialized");
    return;
  }
  const room = `ride:${rideId}`;
  io.to(room).emit(event, data);
  console.log(`Emitted ${event} to room ${room}`);
}

export function emitToDriver(driverId: string, event: string, data: any) {
  if (!io) {
    console.warn("Socket.IO server not initialized");
    return;
  }
  const room = `driver:${driverId}`;
  io.to(room).emit(event, data);
  console.log(`Emitted ${event} to driver ${driverId}`);
}

export function emitToAllDrivers(event: string, data: any) {
  if (!io) {
    console.warn("Socket.IO server not initialized");
    return;
  }
  io.to("drivers").emit(event, data);
  console.log(`Emitted ${event} to all drivers`);
}

export function getIO(): SocketIOServer | null {
  return io;
}

export default {
  initializeSocketServer,
  emitToRide,
  emitToDriver,
  emitToAllDrivers,
  getIO,
};
