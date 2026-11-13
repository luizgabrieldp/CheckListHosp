"use client";

import React, { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useModalA11y } from "@/lib/useFocusTrap";
import { KeyRound, ShieldAlert, Lock, ArrowRight, Stethoscope, UserCheck } from "lucide-react";

export function GatekeeperModal() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const login = useAppStore((s) => s.login);
  const setPlantonista = useAppStore((s) => s.setPlantonista);
  const [senha, setSenha] = useState("");
  const [nomePlantonista, setNomePlantonista] = useState("");
  const [erro, setErro] = useState(false);

  const modalRef = useModalA11y<HTMLDivElement>({ isOpen: !isAuthenticated });

  if (isAuthenticated) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Remove o foco do teclado móvel antes de fechar o modal para evitar deslocamento residual da viewport
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    const ok = login(senha);
    if (!ok) {
      setErro(true);
    } else {
      setErro(false);
      if (nomePlantonista.trim()) {
        setPlantonista(nomePlantonista);
      }
      // Garante restauração instantânea do alinhamento inicial da tela (0,0) pós-login
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      }
    }
  }

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="gatekeeper-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm p-4 transition-all no-print print:hidden"
    >
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-lg border border-slate-200 dark:border-slate-800 relative">
        <div className="flex items-center space-x-3.5 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="w-10 h-10 rounded-lg bg-emerald-700 flex items-center justify-center text-white shrink-0">
            <Stethoscope className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2 id="gatekeeper-title" className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
              CheckList Hospitalar
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Enfermaria Cirúrgica · Sessão de Plantão</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="gatekeeper-input"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2"
            >
              Senha Mestre da Enfermaria
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <KeyRound className="w-4 h-4" aria-hidden="true" />
              </div>
              <input
                id="gatekeeper-input"
                type="password"
                value={senha}
                onChange={(e) => {
                  setSenha(e.target.value);
                  if (erro) setErro(false);
                }}
                placeholder="Digite a senha"
                aria-invalid={erro}
                aria-describedby={erro ? "senha-erro-msg" : undefined}
                className={`w-full pl-10 pr-4 py-2.5 min-h-[46px] rounded-xl border text-slate-900 dark:text-white dark:bg-slate-800/90 placeholder-slate-400 dark:placeholder-slate-500 text-base md:text-sm focus:outline-none transition-all ${
                  erro
                    ? "border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                    : "border-slate-200 dark:border-slate-700 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                }`}
              />
            </div>
            {erro && (
              <p
                id="senha-erro-msg"
                role="alert"
                className="mt-2 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5 font-medium"
              >
                <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
                Senha incorreta. Verifique com a equipe do plantão.
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="gatekeeper-plantonista-input"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2"
            >
              Identificação do Plantonista <span className="font-normal lowercase text-slate-400">(opcional)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <UserCheck className="w-4 h-4" aria-hidden="true" />
              </div>
              <input
                id="gatekeeper-plantonista-input"
                type="text"
                maxLength={32}
                value={nomePlantonista}
                onChange={(e) => setNomePlantonista(e.target.value)}
                placeholder="Ex: R1 João, Dra. Ana"
                className="w-full pl-10 pr-4 py-2.5 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white dark:bg-slate-800/90 placeholder-slate-400 dark:placeholder-slate-500 text-base md:text-sm focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            className="min-h-[46px] w-full py-2.5 px-4 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Acessar Enfermaria</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Acesso restrito da equipe de saúde. Ferramenta de apoio operacional — não substitui o prontuário eletrônico oficial.
          </p>
        </div>
      </div>
    </div>
  );
}
