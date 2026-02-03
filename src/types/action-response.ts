export interface ActionResponse<T = undefined> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
  report?: {
    total: number;
    success: number;
    failed: number;
    errors: string[];
  };
}
