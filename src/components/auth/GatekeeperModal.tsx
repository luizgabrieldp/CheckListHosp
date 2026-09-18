"use client";

import React, { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { KeyRound, ShieldAlert, Lock, ArrowRight, Stethoscope } from "lucide-react";

export function GatekeeperModal() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const login = useAppStore((s) => s.login);
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState(false);

  if (isAuthenticated) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = login(senha);
    if (!ok) {
      setErro(true);
    } else {
      setErro(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-100/85 backdrop-blur-2xl p-4 transition-all">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl border border-slate-200/90 relative animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-emerald-700 flex items-center justify-center text-white shadow-md shadow-emerald-700/25">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
              CheckList Hospitalar
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Enfermaria
              </span>
            </h2>
            <p className="text-xs text-slate-500">Sessão Coletiva de Plantão Cirúrgico</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
              Senha Mestre da Enfermaria
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={senha}
                onChange={(e) => {
                  setSenha(e.target.value);
                  if (erro) setErro(false);
                }}
                placeholder="Digite a senha"
                autoFocus
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-slate-900 placeholder-slate-400 text-sm focus:outline-none transition-all ${
                  erro
                    ? "border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                    : "border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                }`}
              />
            </div>
            {erro && (
              <p className="mt-2 text-xs text-rose-600 flex items-center gap-1.5 font-medium">
                <ShieldAlert className="w-3.5 h-3.5" />
                Senha incorreta. Verifique com a equipe do plantão.
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm transition-all shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <span>Acessar Enfermaria</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400 leading-relaxed">
            🔒 Acesso restrito da equipe de saúde. Ferramenta de apoio operacional e não substitui o prontuário eletrônico oficial.
          </p>
        </div>
      </div>
    </div>
  );
}
