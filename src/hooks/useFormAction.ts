'use client';

import { useFormState } from 'react-dom';
import { useEffect, useRef, useCallback, useState } from 'react';
import { notify, wrapFormAction } from '@/lib/ui-helpers';

type ActionResponse = { success: boolean; message: string };
type InitialState = { success: false; message: '' };

interface UseFormActionOptions {
  /** Callback when action succeeds */
  onSuccess?: () => void;
  /** Callback when action fails */
  onError?: (message: string) => void;
  /** Reset form on success (requires formRef) */
  resetOnSuccess?: boolean;
}

/**
 * Custom hook that wraps useFormState with automatic toast notifications
 * and optional form reset on success.
 *
 * @example
 * const { state, action, formRef } = useFormAction(createProduct, {
 *   onSuccess: () => setDialogOpen(false),
 *   resetOnSuccess: true,
 * });
 *
 * return <form ref={formRef} action={action}>...</form>
 */
export function useFormAction(
  serverAction: (formData: FormData) => Promise<ActionResponse>,
  options: UseFormActionOptions = {},
) {
  const { onSuccess, onError, resetOnSuccess = false } = options;
  const formRef = useRef<HTMLFormElement>(null);

  const wrappedAction = wrapFormAction(serverAction);
  const initialState: InitialState = { success: false, message: '' };
  const [state, action] = useFormState(wrappedAction, initialState);

  useEffect(() => {
    if (state.message) {
      notify.ok(state);
      if (state.success) {
        onSuccess?.();
        if (resetOnSuccess && formRef.current) {
          formRef.current.reset();
        }
      } else {
        onError?.(state.message);
      }
    }
  }, [state, onSuccess, onError, resetOnSuccess]);

  return { state, action, formRef };
}

/**
 * Simple hook for async actions with loading state and notifications.
 *
 * @example
 * const { execute, isLoading } = useAsyncAction(async (id: string) => {
 *   return await deleteItem(id);
 * });
 *
 * <button onClick={() => execute(itemId)} disabled={isLoading}>Delete</button>
 */
export function useAsyncAction<TArgs extends any[], TResult extends ActionResponse>(
  action: (...args: TArgs) => Promise<TResult>,
  options: UseFormActionOptions = {},
) {
  const { onSuccess, onError } = options;
  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(
    async (...args: TArgs) => {
      setIsLoading(true);
      try {
        const result = await action(...args);
        notify.ok(result);
        if (result.success) {
          onSuccess?.();
        } else {
          onError?.(result.message);
        }
        return result;
      } catch (err: any) {
        notify.error(err.message);
        onError?.(err.message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [action, onSuccess, onError],
  );

  return { execute, isLoading };
}
