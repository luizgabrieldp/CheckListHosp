"use client";

import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";

export interface AutoResizeTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minRows?: number;
  maxHeight?: number;
}

/**
 * Textarea com Auto-Ajuste de Altura Dinâmico e Marcador de Redimensionamento Desobstruído
 *
 * - Auto-expande suavemente conforme o texto cresce (digitado ou colado),
 *   eliminando barras de rolagem verticais internas desnecessárias.
 * - Mantém o marcador de redimensionamento manual (resize: vertical) sempre visível
 *   e fácil de clicar, com padding inferior/direito de proteção.
 */
export const AutoResizeTextarea = forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(
  ({ value, minRows = 2, maxHeight, onChange, onInput, className = "", style, ...props }, ref) => {
    const internalRef = useRef<HTMLTextAreaElement | null>(null);

    useImperativeHandle(ref, () => internalRef.current as HTMLTextAreaElement);

    const ajustarAltura = () => {
      const el = internalRef.current;
      if (!el) return;

      // Reset temporário para calcular o scrollHeight real do conteúdo
      el.style.height = "auto";

      // Altura mínima baseada em minRows (aprox 20px por linha + padding de 16px)
      const alturaMinima = Math.max(minRows * 20 + 16, 44);
      let novaAltura = Math.max(el.scrollHeight, alturaMinima);

      if (maxHeight && novaAltura > maxHeight) {
        novaAltura = maxHeight;
        el.style.overflowY = "auto";
      } else {
        el.style.overflowY = "hidden";
      }

      el.style.height = `${novaAltura}px`;
    };

    // Ajusta a altura sempre que o valor externo mudar
    useEffect(() => {
      ajustarAltura();
    }, [value]);

    // Ajuste no primeiro mount
    useEffect(() => {
      const timer = setTimeout(ajustarAltura, 20);
      return () => clearTimeout(timer);
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      ajustarAltura();
      if (onChange) onChange(e);
    };

    const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
      ajustarAltura();
      if (onInput) onInput(e);
    };

    return (
      <div className="relative w-full">
        <textarea
          ref={internalRef}
          value={value}
          onChange={handleChange}
          onInput={handleInput}
          rows={minRows}
          style={{
            resize: "vertical",
            minHeight: `${Math.max(minRows * 20 + 16, 44)}px`,
            ...style,
          }}
          className={`w-full px-3 pt-2 pb-4 pr-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-normal focus:bg-white focus:border-sky-500 focus:outline-none transition-colors leading-relaxed block ${className}`}
          {...props}
        />
      </div>
    );
  }
);

AutoResizeTextarea.displayName = "AutoResizeTextarea";
