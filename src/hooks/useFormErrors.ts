import type { ActionResponse } from '@/types/action-response';

export function useFormErrors(state: ActionResponse) {
  return {
    getError: (field: string) => state.errors?.[field]?.[0],
    hasError: (field: string) => Boolean(state.errors?.[field]?.length),
  };
}
