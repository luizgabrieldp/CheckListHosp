"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";

export interface AutoResizeTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minRows?: number;
  maxHeight?: number;
}

/**
 * Textarea Clínico com Altura Padrão Fixa (2 linhas), Rolagem Vertical Interna e Redimensionamento Manual Livre
 *
 * - Altura padrão compacta fixa (default: 2 linhas, ~56px) para evitar empurrar a tela ou desalinhar os cards clínicos.
 * - Conforme o texto é digitado ou colado, ele fica contido e verticalizado, com rolagem interna fluida (overflow-y: auto).
 * - Suporta redimensionamento manual vertical (resize: vertical) caso o usuário queira expandir ou reduzir a área livremente.
 * - Barra de rolagem translúcida estilo iOS/macOS com auto-hide inteligente: surge durante o scroll e desaparece
 *   automaticamente após 900ms de inatividade, preservando total visibilidade e usabilidade do marcador de redimensionamento manual.
 */
export const AutoResizeTextarea = forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(
  (
    {
      value,
      minRows = 2,
      maxHeight,
      onChange,
      onInput,
      onScroll,
      className = "",
      style,
      rows,
      ...props
    },
    ref
  ) => {
    const internalRef = useRef<HTMLTextAreaElement | null>(null);
    const scrollTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [isScrolling, setIsScrolling] = useState<boolean>(false);
    const [manualHeight, setManualHeight] = useState<number | null>(null);
    const isManualResizeRef = useRef<boolean>(false);

    useImperativeHandle(ref, () => internalRef.current as HTMLTextAreaElement);

    // Altura padrão compacta calculada a partir de minRows (default 2 linhas = 56px)
    const baseRows = rows ? Number(rows) : minRows;
    const alturaPadrao = Math.max(baseRows * 20 + 16, 56);

    // Detectar redimensionamento manual realizado pelo usuário através do handle nativo
    useEffect(() => {
      const el = internalRef.current;
      if (!el || typeof ResizeObserver === "undefined") return;

      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const currentHeight = Math.round(
            entry.borderBoxSize?.[0]?.blockSize ?? el.getBoundingClientRect().height
          );
          // Se o usuário arrastou o handle para uma altura diferente da base (tolerância de 4px)
          if (Math.abs(currentHeight - alturaPadrao) > 4) {
            isManualResizeRef.current = true;
            setManualHeight(currentHeight);
          }
        }
      });

      observer.observe(el);
      return () => observer.disconnect();
    }, [alturaPadrao]);

    // Timer de auto-hide da barra de rolagem (desaparece suavemente após 900ms sem rolar)
    const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
      setIsScrolling(true);
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }
      scrollTimerRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 900);

      if (onScroll) {
        onScroll(e);
      }
    };

    // Limpar timer ao desmontar
    useEffect(() => {
      return () => {
        if (scrollTimerRef.current) {
          clearTimeout(scrollTimerRef.current);
        }
      };
    }, []);

    // Determinar a altura a aplicar: se o usuário redimensionou manualmente, preserva a nova dimensão.
    // Caso contrário, mantém a altura padrão fixa compacta (56px para 2 linhas).
    const alturaAplicada = manualHeight !== null ? `${manualHeight}px` : `${alturaPadrao}px`;

    return (
      <div className="relative w-full">
        <textarea
          ref={internalRef}
          value={value}
          onChange={onChange}
          onInput={onInput}
          onScroll={handleScroll}
          rows={baseRows}
          style={{
            resize: "vertical",
            overflowY: "auto",
            minHeight: `${alturaPadrao}px`,
            maxHeight: maxHeight ? `${maxHeight}px` : undefined,
            height: alturaAplicada,
            ...style,
          }}
          className={`w-full px-3 pt-2 pb-3 pr-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-normal focus:bg-white focus:border-sky-500 focus:outline-none transition-colors leading-relaxed block overflow-y-auto scrollbar-translucent ${
            isScrolling ? "scrollbar-scrolling" : "scrollbar-idle"
          } ${className}`}
          {...props}
        />
      </div>
    );
  }
);

AutoResizeTextarea.displayName = "AutoResizeTextarea";
