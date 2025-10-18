import { ApiResponse } from "../types";

export const createResponse = <T>(success: boolean, message?: string, data?: T, error?: string): ApiResponse<T> => {
  return {
    success,
    message,
    data,
    error,
  };
};

export const createSuccessResponse = <T>(data?: T, message?: string): ApiResponse<T> => {
  return createResponse(true, message, data);
};

export const createErrorResponse = (error: string, message?: string): ApiResponse => {
  return createResponse(false, message, undefined, error);
};
