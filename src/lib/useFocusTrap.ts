"use client";

import { useEffect, useRef } from "react";

interface UseModalA11yOptions {
  isOpen: boolean;
  onClose?: () => void;
  autoFocus?: boolean;
}

/**
 * Hook de Acessibilidade para Modais e Diálogos (WCAG 2.1 AA / 2.4.3 / 2.1.2)
 *
 * 1. Trap de Foco: Mantém o foco do teclado confinado dentro do modal durante a navegação por Tab / Shift+Tab.
 * 2. Fechamento por Tecla ESC: Dispara onClose() ao pressionar Escape.
 * 3. Foco Inicial Automático: Move o foco para o primeiro elemento interativo ao abrir (sem roubar foco em digitação).
 * 4. Restauração de Foco: Ao fechar, retorna o foco para o botão ou elemento que abriu o modal (NUNCA durante digitação).
 */
export function useModalA11y<T extends HTMLElement = HTMLDivElement>({
  isOpen,
  onClose,
  autoFocus = true,
}: UseModalA11yOptions) {
  const containerRef = useRef<T | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef<boolean>(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // 1. Armazenar o elemento que abriu o modal e restaurar foco APENAS quando o modal realmente fechar
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      // O modal acabou de abrir
      if (typeof document !== "undefined") {
        triggerRef.current = document.activeElement as HTMLElement | null;
      }
      wasOpenRef.current = true;
    } else if (!isOpen && wasOpenRef.current) {
      // O modal acabou de fechar
      wasOpenRef.current = false;
      if (
        triggerRef.current &&
        typeof triggerRef.current.focus === "function" &&
        typeof document !== "undefined" &&
        document.contains(triggerRef.current)
      ) {
        triggerRef.current.focus();
      }
    }
  }, [isOpen]);

  // 2. Foco inicial quando o modal abre (executa estritamente na transição para isOpen === true)
  useEffect(() => {
    if (!isOpen || !autoFocus) return;

    const container = containerRef.current;
    if (!container) return;

    const timer = setTimeout(() => {
      // Se o usuário já está com o foco dentro do container (ex: já tocou num input), JAMAIS rouba o foco
      if (typeof document !== "undefined" && document.activeElement && container.contains(document.activeElement)) {
        return;
      }

      const focusableSelector = [
        'input:not([disabled]):not([type="hidden"])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        'button:not([disabled])',
        'a[href]',
        '[tabindex]:not([tabindex="-1"])',
      ].join(", ");

      const focusables = Array.from(
        container.querySelectorAll<HTMLElement>(focusableSelector)
      ).filter(
        (el) => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0
      );

      // No mobile / tablet (touch), evitamos forçar foco com focus() se isso puder forçar teclado virtual sem intenção do usuário
      const isTouch = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);
      if (focusables.length > 0) {
        if (!isTouch) {
          focusables[0].focus();
        } else {
          container.focus();
        }
      } else {
        container.focus();
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [isOpen, autoFocus]);

  // 3. Trap de Foco (Tab / Shift+Tab) e fechamento por tecla ESC
  // Depende EXCLUSIVAMENTE de [isOpen], garantindo que NUNCA re-execute ou desmonte durante a digitação
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && onCloseRef.current) {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (e.key === "Tab" && containerRef.current) {
        const focusableSelector = [
          'input:not([disabled]):not([type="hidden"])',
          'select:not([disabled])',
          'textarea:not([disabled])',
          'button:not([disabled])',
          'a[href]',
          '[tabindex]:not([tabindex="-1"])',
        ].join(", ");

        const focusables = Array.from(
          containerRef.current.querySelectorAll<HTMLElement>(focusableSelector)
        ).filter(
          (el) => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0
        );

        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusables[0];
        const lastElement = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (
            document.activeElement === firstElement ||
            !containerRef.current.contains(document.activeElement)
          ) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (
            document.activeElement === lastElement ||
            !containerRef.current.contains(document.activeElement)
          ) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // 4. Restauração de foco ao desmontar o componente (caso seja desmontado enquanto ainda aberto)
  useEffect(() => {
    return () => {
      if (wasOpenRef.current) {
        if (
          triggerRef.current &&
          typeof triggerRef.current.focus === "function" &&
          typeof document !== "undefined" &&
          document.contains(triggerRef.current)
        ) {
          triggerRef.current.focus();
        }
      }
    };
  }, []);

  return containerRef;
}
