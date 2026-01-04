export interface ActionResponse<T = undefined> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>; // For Zod validation errors
  report?: {
    total: number;
    success: number;
    failed: number;
    errors: string[];
  };
}
