import { toast as sonnerToast } from 'sonner';

type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
}

const toast = {
  success: (message: string, options?: ToastOptions) => {
    sonnerToast.success(message, {
      duration: options?.duration || 5000,
      description: options?.description,
    });
  },
  error: (message: string, options?: ToastOptions) => {
    sonnerToast.error(message, {
      duration: options?.duration || 5000,
      description: options?.description,
    });
  },
  info: (message: string, options?: ToastOptions) => {
    sonnerToast.info(message, {
      duration: options?.duration || 5000,
      description: options?.description,
    });
  },
  warning: (message: string, options?: ToastOptions) => {
    sonnerToast.warning(message, {
      duration: options?.duration || 5000,
      description: options?.description,
    });
  },
};

export { toast };

