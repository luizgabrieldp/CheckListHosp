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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 md:p-8 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="flex items-center gap-3 mb-5 shrink-0">
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              Termo de Ciência & LGPD do Dia
              <span className="text-[10px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200 font-semibold">
                Obrigatório
              </span>
            </h3>
            <p className="text-xs text-slate-500">Sincronização da rotina de plantão</p>
          </div>
        </div>

        {/* AVISO CRÍTICO */}
        <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-3 shrink-0">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="block text-rose-800 font-semibold mb-0.5">
              AVISO REGULATÓRIO FUNDAMENTAL:
            </strong>
            Este sistema destina-se exclusivamente a agilizar o fluxo da enfermaria.{" "}
            <span className="underline font-bold">NÃO substitui o prontuário eletrônico ou físico oficial</span> do hospital.
          </div>
        </div>

        {/* POLÍTICA 48H */}
        <div className="space-y-2.5 mb-6 text-xs text-slate-700 flex-1">
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <Clock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900 font-semibold">
                Expurgo 48h a partir da Data Agendada:
              </strong>
              <p className="text-slate-600 text-[11px] mt-0.5">
                Dados clínicos de admissões são expurgados 48h após a data agendada de cada paciente. Pacientes adicionados para datas futuras permanecem salvos até a data deles.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={aceitarTermoLgpd}
          className="min-h-[48px] w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm transition-all shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer shrink-0"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Estou ciente e concordo / Iniciar Plantão</span>
        </button>
      </div>
    </div>
  );
}
