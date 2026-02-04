import { toast } from 'sonner';

function nextToastId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const wrapFormAction =
  <T = any>(fn: (formData: FormData) => Promise<T>) =>
  (_prev: any, formData: FormData) =>
    fn(formData);

export const notify = {
  ok(res: any, opts?: { id?: string | number; successMsg?: string; errorMsg?: string }) {
    const toastOpts = { id: opts?.id !== undefined ? String(opts.id) : nextToastId() };
    res?.success
      ? toast.success(res.message || opts?.successMsg || 'Success', toastOpts)
      : toast.error(res?.message || opts?.errorMsg || 'Failed', toastOpts);
  },
  success: (msg: string, opts?: { id?: string | number }) =>
    toast.success(msg, { id: opts?.id !== undefined ? String(opts.id) : nextToastId() }),
  error: (msg?: string, opts?: { id?: string | number }) =>
    toast.error(msg || 'Error', { id: opts?.id !== undefined ? String(opts.id) : nextToastId() }),
};

export const confirmAction = (message: string) => confirm(message);
