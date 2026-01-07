import { toast } from 'sonner';

export const wrapFormAction =
  <T = any>(fn: (formData: FormData) => Promise<T>) =>
  (_prev: any, formData: FormData) =>
    fn(formData);

export const notify = {
  ok(res: any, opts?: { id?: string | number; successMsg?: string; errorMsg?: string }) {
    const toastOpts = opts?.id !== undefined ? { id: opts.id } : undefined;
    res?.success
      ? toast.success(res.message || opts?.successMsg || 'Success', toastOpts)
      : toast.error(res?.message || opts?.errorMsg || 'Failed', toastOpts);
  },
  success: (msg: string, opts?: { id?: string | number }) =>
    toast.success(msg, opts?.id !== undefined ? { id: opts.id } : undefined),
  error: (msg?: string, opts?: { id?: string | number }) =>
    toast.error(msg || 'Error', opts?.id !== undefined ? { id: opts.id } : undefined),
};

export const confirmAction = (message: string) => confirm(message);
