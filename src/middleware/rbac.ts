import { Request, Response, NextFunction } from "express";
import { Role, Permission, RolePermissions } from "../types";

// Define role-based permissions
const ROLE_PERMISSIONS: RolePermissions = {
  admin: ["read:users", "write:users", "delete:users", "admin:all"],
  driver: ["read:users"],
  passenger: ["read:users"],
};

// RBAC Helper functions
export const rbac = {
  // Check if user has specific permission
  hasPermission: (userRole: Role, permission: Permission): boolean => {
    const permissions = ROLE_PERMISSIONS[userRole] || [];
    return permissions.includes(permission) || permissions.includes("admin:all");
  },

  // Check if user has any of the required permissions
  hasAnyPermission: (userRole: Role, permissions: Permission[]): boolean => {
    return permissions.some(permission => rbac.hasPermission(userRole, permission));
  },

  // Check if user has all required permissions
  hasAllPermissions: (userRole: Role, permissions: Permission[]): boolean => {
    return permissions.every(permission => rbac.hasPermission(userRole, permission));
  },

  // Role hierarchy check
  isRoleAllowed: (userRole: Role, allowedRoles: Role[]): boolean => {
    return allowedRoles.includes(userRole);
  },
};

// Middleware factory functions
export const requireRole = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!rbac.isRoleAllowed(req.user.role, allowedRoles)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
      });
    }

    next();
  };
};

export const requirePermission = (...permissions: Permission[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!rbac.hasAnyPermission(req.user.role, permissions)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
      });
    }

    next();
  };
};

// Convenience middleware for common patterns
export const requireAdmin = requireRole("admin");
export const requireDriver = requireRole("driver", "admin");
export const requirePassenger = requireRole("passenger", "admin");

// Service-level RBAC helpers
export const checkPermission = (userRole: Role, permission: Permission): void => {
  if (!rbac.hasPermission(userRole, permission)) {
    throw new Error("Insufficient permissions");
  }
};

export const checkRole = (userRole: Role, allowedRoles: Role[]): void => {
  if (!rbac.isRoleAllowed(userRole, allowedRoles)) {
    throw new Error("Insufficient permissions");
  }
};

// Service wrapper for admin operations
export const requireAdminPermission = (userRole?: Role): void => {
  if (!userRole) {
    throw new Error("Authentication required");
  }
  checkRole(userRole, ["admin"]);
};

// Service wrapper for write operations
export const requireWritePermission = (userRole?: Role): void => {
  if (!userRole) {
    throw new Error("Authentication required");
  }
  checkPermission(userRole, "write:users");
};

// Service wrapper for delete operations
export const requireDeletePermission = (userRole?: Role): void => {
  if (!userRole) {
    throw new Error("Authentication required");
  }
  checkPermission(userRole, "delete:users");
};