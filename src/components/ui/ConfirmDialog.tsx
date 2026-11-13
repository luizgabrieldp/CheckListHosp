"use client";

import React from "react";
import { useUiStore } from "@/store/useUiStore";
import { useModalA11y } from "@/lib/useFocusTrap";
import { AlertTriangle, HelpCircle, X } from "lucide-react";

export function ConfirmDialog() {
  const confirmState = useUiStore((s) => s.confirmState);
  const closeConfirm = useUiStore((s) => s.closeConfirm);

  const modalRef = useModalA11y<HTMLDivElement>({
    isOpen: confirmState.isOpen,
    onClose: () => closeConfirm(false),
  });

  if (!confirmState.isOpen) return null;

  const isDanger = confirmState.variant !== "primary";

  return (
    <div
      ref={modalRef}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closeConfirm(false);
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm p-4 no-print print:hidden"
    >
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isDanger
                  ? "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                  : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
              }`}
            >
              {isDanger ? (
                <AlertTriangle className="w-5 h-5" aria-hidden="true" />
              ) : (
                <HelpCircle className="w-5 h-5" aria-hidden="true" />
              )}
            </div>
            <div>
              <h2
                id="confirm-dialog-title"
                className="text-base font-bold text-slate-900 dark:text-white leading-snug"
              >
                {confirmState.title}
              </h2>
              <p
                id="confirm-dialog-desc"
                className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed"
              >
                {confirmState.message}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => closeConfirm(false)}
            aria-label="Fechar caixa de confirmação"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => closeConfirm(false)}
            className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {confirmState.cancelLabel || "Cancelar"}
          </button>
          <button
            type="button"
            onClick={() => closeConfirm(true)}
            className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer shadow-sm ${
              isDanger
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-emerald-700 hover:bg-emerald-800"
            }`}
          >
            {confirmState.confirmLabel || "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
