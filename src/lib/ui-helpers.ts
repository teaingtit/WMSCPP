import { toast } from 'sonner';

export function wrapFormAction<T = any>(fn: (formData: FormData) => Promise<T>) {
  return (_prev: any, formData: FormData) => fn(formData);
}

export const notify = {
  ok(res: any, opts?: { id?: string | number; successMsg?: string; errorMsg?: string }) {
    if (res?.success) {
      if (opts?.id !== undefined)
        toast.success(res.message || opts?.successMsg || 'Success', { id: opts.id });
      else toast.success(res.message || opts?.successMsg || 'Success');
    } else {
      if (opts?.id !== undefined)
        toast.error(res?.message || opts?.errorMsg || 'Failed', { id: opts.id });
      else toast.error(res?.message || opts?.errorMsg || 'Failed');
    }
  },
  success(msg: string, opts?: { id?: string | number }) {
    if (opts?.id !== undefined) toast.success(msg, { id: opts.id });
    else toast.success(msg);
  },
  error(msg?: string, opts?: { id?: string | number }) {
    if (opts?.id !== undefined) toast.error(msg || 'Error', { id: opts.id });
    else toast.error(msg || 'Error');
  },
};

export function confirmAction(message: string) {
  return confirm(message);
}

export default {
  wrapFormAction,
  notify,
  confirmAction,
};
