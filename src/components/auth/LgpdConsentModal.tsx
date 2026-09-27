"use client";

import React from "react";
import { useAppStore } from "@/store/useAppStore";
import { obterDataLocalHoje } from "@/lib/utils";
import { ShieldCheck, AlertTriangle, Clock, FileText, CheckCircle2 } from "lucide-react";

export function LgpdConsentModal() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const lgpdAcceptedDate = useAppStore((s) => s.lgpdAcceptedDate);
  const aceitarTermoLgpd = useAppStore((s) => s.aceitarTermoLgpd);

  const hoje = obterDataLocalHoje();
  const precisaAceitar = isAuthenticated && lgpdAcceptedDate !== hoje;

  if (!precisaAceitar) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lgpd-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs p-4 animate-in fade-in duration-200 no-print print:hidden"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-5 sm:p-7 md:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 relative max-h-[90vh] flex flex-col">
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <ShieldCheck className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <h3 id="lgpd-modal-title" className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Termo de Ciência & LGPD do Dia
              <span className="text-[10px] bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 font-semibold">
                Obrigatório
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Sincronização da rotina de plantão</p>
          </div>
        </div>

        <div className="space-y-3 overflow-y-auto flex-1 pr-1 pb-2">
          {/* AVISO CRÍTICO */}
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="leading-relaxed">
              <strong className="block text-rose-800 dark:text-rose-300 font-semibold mb-0.5">
                AVISO REGULATÓRIO FUNDAMENTAL:
              </strong>
              Este sistema destina-se exclusivamente a agilizar o fluxo da enfermaria.{" "}
              <span className="underline font-bold">NÃO substitui o prontuário eletrônico ou físico oficial</span> do hospital.
            </div>
          </div>

          {/* POLÍTICA 48H */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200">
            <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <strong className="text-slate-900 dark:text-white font-semibold">
                Expurgo 48h a partir da Data Agendada:
              </strong>
              <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5">
                Dados clínicos de admissões são expurgados 48h após a data agendada de cada paciente. Pacientes adicionados para datas futuras permanecem salvos até a data deles.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <button
            onClick={aceitarTermoLgpd}
            className="min-h-[48px] w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm transition-all shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            <span>Estou ciente e concordo / Iniciar Plantão</span>
          </button>
        </div>
      </div>
    </div>
  );
}
