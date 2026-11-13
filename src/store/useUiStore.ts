import { create } from "zustand";

export type ToastType = "success" | "info" | "warning" | "error";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  action?: ToastAction;
  durationMs?: number;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
}

interface ConfirmInternalState extends ConfirmOptions {
  isOpen: boolean;
  resolve?: (confirmed: boolean) => void;
}

interface UiStoreState {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, "id">) => string;
  removeToast: (id: string) => void;

  confirmState: ConfirmInternalState;
  openConfirm: (options: ConfirmOptions) => Promise<boolean>;
  closeConfirm: (confirmed: boolean) => void;

  isGlobalSearchOpen: boolean;
  openGlobalSearch: () => void;
  closeGlobalSearch: () => void;
  toggleGlobalSearch: () => void;
}

export const useUiStore = create<UiStoreState>((set, get) => ({
  toasts: [],

  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const durationMs = toast.durationMs ?? (toast.action ? 6000 : 4000);
    set((state) => ({
      toasts: [...state.toasts.slice(-3), { ...toast, id, durationMs }],
    }));

    if (typeof window !== "undefined" && durationMs > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, durationMs);
    }

    return id;
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  confirmState: {
    isOpen: false,
    title: "",
    message: "",
    confirmLabel: "Confirmar",
    cancelLabel: "Cancelar",
    variant: "danger",
  },

  openConfirm: (options) => {
    const prevResolve = get().confirmState.resolve;
    if (prevResolve) {
      prevResolve(false);
    }

    return new Promise<boolean>((resolve) => {
      set({
        confirmState: {
          isOpen: true,
          title: options.title,
          message: options.message,
          confirmLabel: options.confirmLabel ?? "Confirmar",
          cancelLabel: options.cancelLabel ?? "Cancelar",
          variant: options.variant ?? "danger",
          resolve,
        },
      });
    });
  },

  closeConfirm: (confirmed) => {
    const currentResolve = get().confirmState.resolve;
    set({
      confirmState: {
        isOpen: false,
        title: "",
        message: "",
        confirmLabel: "Confirmar",
        cancelLabel: "Cancelar",
        variant: "danger",
        resolve: undefined,
      },
    });
    if (currentResolve) {
      currentResolve(confirmed);
    }
  },

  isGlobalSearchOpen: false,
  openGlobalSearch: () => set({ isGlobalSearchOpen: true }),
  closeGlobalSearch: () => set({ isGlobalSearchOpen: false }),
  toggleGlobalSearch: () => set((s) => ({ isGlobalSearchOpen: !s.isGlobalSearchOpen })),
}));

export const toast = {
  success: (message: string, action?: ToastAction, durationMs?: number) =>
    useUiStore.getState().addToast({ type: "success", message, action, durationMs }),
  info: (message: string, action?: ToastAction, durationMs?: number) =>
    useUiStore.getState().addToast({ type: "info", message, action, durationMs }),
  warning: (message: string, action?: ToastAction, durationMs?: number) =>
    useUiStore.getState().addToast({ type: "warning", message, action, durationMs }),
  error: (message: string, action?: ToastAction, durationMs?: number) =>
    useUiStore.getState().addToast({ type: "error", message, action, durationMs }),
};

export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  return useUiStore.getState().openConfirm(options);
}
