// Import database connection
import { PrismaClient } from "../../prisma/generated/prisma";

// Create a singleton Prisma client instance
let prismaInstance: PrismaClient;

export const getPrismaClient = () => {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      // Increase transaction timeout to 30 seconds (30000ms)
      transactionOptions: {
        timeout: 30000,
      },
    });
  }
  return prismaInstance;
};

const prisma = getPrismaClient();

// Function to check database connection
export async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log("Connected to the database successfully.");
  } catch (error) {
    console.error("Error connecting to the database:", {
      error,
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}
