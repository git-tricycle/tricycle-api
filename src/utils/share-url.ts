/**
 * Utility function to generate share URLs
 * Automatically uses production URL or localhost based on environment
 */

/**
 * Get the base URL for share links
 * Production: https://ride-it-app.vercel.app
 * Development: http://localhost:8081
 */
export function getShareBaseUrl(): string {
  // Check if explicitly set in environment
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL;
  }

  // Production URL
  if (process.env.NODE_ENV === "production") {
    return "https://ride-it-app.vercel.app";
  }

  // Development URL
  return "http://localhost:8081";
}

/**
 * Generate a complete share URL for a trip
 * @param shareToken - The unique share token
 * @returns The complete shareable URL
 */
export function generateShareUrl(shareToken: string): string {
  const baseUrl = getShareBaseUrl();
  const cleanBaseUrl = baseUrl.replace(/\/$/, "");
  return `${cleanBaseUrl}/share-trip/${shareToken}`;
}
