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
 * 3. Foco Inicial Automático: Move o foco para o primeiro elemento interativo ao abrir.
 * 4. Restauração de Foco: Ao fechar, retorna o foco para o botão ou elemento que abriu o modal.
 */
export function useModalA11y<T extends HTMLElement = HTMLDivElement>({
  isOpen,
  onClose,
  autoFocus = true,
}: UseModalA11yOptions) {
  const containerRef = useRef<T | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (typeof document !== "undefined") {
      triggerRef.current = document.activeElement as HTMLElement | null;
    }

    const container = containerRef.current;
    if (container && autoFocus) {
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

      const timer = setTimeout(() => {
        if (focusables.length > 0) {
          focusables[0].focus();
        } else {
          container.focus();
        }
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [isOpen, autoFocus]);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && onClose) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
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
      if (triggerRef.current && typeof triggerRef.current.focus === "function") {
        triggerRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  return containerRef;
}
