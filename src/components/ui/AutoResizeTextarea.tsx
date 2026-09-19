"use client";

import React, {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from "react";

export interface AutoResizeTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minRows?: number;
  maxHeight?: number;
}

/**
 * Textarea com Auto-Ajuste de Altura Dinâmico e Suporte Completo à Rolagem ao Redimensionar
 *
 * - Auto-expande suavemente conforme o texto cresce (digitado ou colado).
 * - Quando o usuário redimensiona manualmente para uma área menor, ativa
 *   rolagem vertical fluida (overflow-y: auto) para que todas as informações
 *   permaneçam 100% visíveis e acessíveis.
 * - Respeita a altura manual escolhida pelo usuário sem resetar ao digitar.
 * - Mantém o marcador de redimensionamento manual (resize: vertical) sempre visível
 *   e fácil de clicar, com padding inferior/direito de proteção.
 */
export const AutoResizeTextarea = forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(
  ({ value, minRows = 2, maxHeight, onChange, onInput, onMouseUp, onPointerUp, className = "", style, ...props }, ref) => {
    const internalRef = useRef<HTMLTextAreaElement | null>(null);
    const userResizedRef = useRef<boolean>(false);
    const programmaticHeightRef = useRef<number | null>(null);
    const valueRef = useRef(value);
    valueRef.current = value;

    useImperativeHandle(ref, () => internalRef.current as HTMLTextAreaElement);

    const ajustarAltura = useCallback(() => {
      const el = internalRef.current;
      if (!el) return;

      const valAtual = valueRef.current;

      // Se o usuário limpou o texto por completo, reseta o redimensionamento manual
      if ((valAtual === "" || valAtual === undefined || valAtual === null) && (!el.value || el.value.trim() === "")) {
        userResizedRef.current = false;
      }

      // Se o usuário redimensionou manualmente para um tamanho específico,
      // preservamos a altura escolhida por ele e garantimos a barra de rolagem ativa
      if (userResizedRef.current) {
        el.style.overflowY = "auto";
        return;
      }

      // Sempre manter overflowY em "auto", permitindo scroll suave quando o conteúdo exceder a área
      el.style.overflowY = "auto";

      // Reset temporário para calcular o scrollHeight real do conteúdo
      el.style.height = "auto";

      // Altura das bordas verticais para compensar box-sizing: border-box
      // (scrollHeight inclui padding mas não inclui bordas; height com border-box inclui bordas)
      const bordasVerticais = Math.max(el.offsetHeight - el.clientHeight, 0);

      // Altura mínima baseada em minRows (aprox 20px por linha + padding de 16px)
      const alturaMinima = Math.max(minRows * 20 + 16, 44);
      let novaAltura = Math.max(el.scrollHeight + bordasVerticais, alturaMinima);

      if (maxHeight && novaAltura > maxHeight) {
        novaAltura = maxHeight;
      }

      el.style.height = `${novaAltura}px`;
      programmaticHeightRef.current = novaAltura;
      el.style.overflowY = "auto";
    }, [minRows, maxHeight]);

    // Detectar redimensionamento manual via ResizeObserver
    useEffect(() => {
      const el = internalRef.current;
      if (!el || typeof ResizeObserver === "undefined") return;

      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const currentHeight = Math.round(
            entry.borderBoxSize?.[0]?.blockSize ?? el.getBoundingClientRect().height
          );
          if (
            programmaticHeightRef.current !== null &&
            Math.abs(currentHeight - programmaticHeightRef.current) > 4
          ) {
            userResizedRef.current = true;
            el.style.overflowY = "auto";
          }
        }
      });

      observer.observe(el);
      return () => observer.disconnect();
    }, []);

    // Ajusta a altura sempre que o valor externo mudar
    useEffect(() => {
      ajustarAltura();
    }, [value, ajustarAltura]);

    // Ajuste único no primeiro mount
    useEffect(() => {
      const timer = setTimeout(ajustarAltura, 20);
      return () => clearTimeout(timer);
    }, [ajustarAltura]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      ajustarAltura();
      if (onChange) onChange(e);
    };

    const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
      ajustarAltura();
      if (onInput) onInput(e);
    };

    const handlePointerUpCapture = (e: React.PointerEvent<HTMLTextAreaElement>) => {
      const el = internalRef.current;
      if (el && programmaticHeightRef.current !== null) {
        if (Math.abs(el.offsetHeight - programmaticHeightRef.current) > 4) {
          userResizedRef.current = true;
          el.style.overflowY = "auto";
        }
      }
      if (onPointerUp) onPointerUp(e);
    };

    const handleMouseUpCapture = (e: React.MouseEvent<HTMLTextAreaElement>) => {
      const el = internalRef.current;
      if (el && programmaticHeightRef.current !== null) {
        if (Math.abs(el.offsetHeight - programmaticHeightRef.current) > 4) {
          userResizedRef.current = true;
          el.style.overflowY = "auto";
        }
      }
      if (onMouseUp) onMouseUp(e);
    };

    const alturaMinimaCalculada = Math.max(minRows * 20 + 16, 44);

    return (
      <div className="relative w-full">
        <textarea
          ref={internalRef}
          value={value}
          onChange={handleChange}
          onInput={handleInput}
          onMouseUp={handleMouseUpCapture}
          onPointerUp={handlePointerUpCapture}
          rows={minRows}
          style={{
            resize: "vertical",
            overflowY: "auto",
            minHeight: `${alturaMinimaCalculada}px`,
            ...style,
          }}
          className={`w-full px-3 pt-2 pb-4 pr-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-normal focus:bg-white focus:border-sky-500 focus:outline-none transition-colors leading-relaxed block overflow-y-auto ${className}`}
          {...props}
        />
      </div>
    );
  }
);

AutoResizeTextarea.displayName = "AutoResizeTextarea";
