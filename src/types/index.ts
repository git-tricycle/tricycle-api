export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface PaginationResponse {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface CreateUserData {
  email: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  role?: "driver" | "passenger" | "admin";
  status?: "active" | "inactive" | "banned";
  password: string;
  metadata?: {
    address?: string;
    phone?: string;
    age?: number;
    gender?: string;
  };
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  email?: string;
  role?: "driver" | "passenger" | "admin";
  status?: "active" | "inactive" | "banned";
  avatar?: string;
  password?: string;
  metadata?: {
    address?: string;
    phone?: string;
    age?: number;
    gender?: string;
  };
}

export interface SearchUserParams {
  query?: string;
  role?: "driver" | "passenger" | "admin";
  status?: "active" | "inactive" | "banned";
  limit?: number;
  offset?: number;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  role: "driver" | "passenger" | "admin";
  status: "active" | "inactive" | "banned";
  createdAt: Date;
}

export type Role = "driver" | "passenger" | "admin";
export type Permission = "read:users" | "write:users" | "delete:users" | "admin:all";

export interface RolePermissions {
  [key: string]: Permission[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
