"use client";

import React from "react";
import { useUiStore, ToastType } from "@/store/useUiStore";
import { CheckCircle2, Info, AlertTriangle, XCircle, X, RotateCcw } from "lucide-react";

const ICON_MAP: Record<ToastType, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
};

const STYLE_MAP: Record<ToastType, string> = {
  success: "border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100",
  info: "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100",
  warning: "border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100",
  error: "border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100",
};

const ICON_COLOR_MAP: Record<ToastType, string> = {
  success: "text-emerald-600 dark:text-emerald-400",
  info: "text-sky-600 dark:text-sky-400",
  warning: "text-amber-600 dark:text-amber-400",
  error: "text-rose-600 dark:text-rose-400",
};

export function ToastContainer() {
  const toasts = useUiStore((s) => s.toasts);
  const removeToast = useUiStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Notificações do sistema"
      className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-50 flex flex-col gap-2 pointer-events-none no-print print:hidden"
    >
      {toasts.map((item) => {
        const Icon = ICON_MAP[item.type];
        return (
          <div
            key={item.id}
            role="status"
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl border shadow-lg transition-all ${STYLE_MAP[item.type]}`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Icon className={`w-4 h-4 shrink-0 ${ICON_COLOR_MAP[item.type]}`} aria-hidden="true" />
              <p className="text-xs font-medium leading-snug break-words">{item.message}</p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {item.action && (
                <button
                  type="button"
                  onClick={() => {
                    item.action?.onClick();
                    removeToast(item.id);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" aria-hidden="true" />
                  <span>{item.action.label}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => removeToast(item.id)}
                aria-label="Fechar notificação"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
