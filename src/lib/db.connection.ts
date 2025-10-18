// Import database connection
import { prisma } from "./prisma";
import { URL } from "url";

// Function to check database connection
export async function connectDatabase() {
  try {
    // Test the database connection
    await prisma.$connect();

    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error("DATABASE_URL is not set.");
    }

    const parsedUrl = new URL(databaseUrl);
    const hostname = parsedUrl.hostname;
    console.log(`✅ Database connected successfully in: ${hostname}`);
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    console.error("Please check your DATABASE_URL in the .env file");
    return false;
  }
}
