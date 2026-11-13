"use client";

import React, { useLayoutEffect, useRef } from "react";
import { useAppStore } from "@/store/useAppStore";

interface CollabTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  entityId: string;
  field: string;
  value: string;
  onValueChange: (nextValue: string) => void;
}

/**
 * Textarea colaborativo que registra foco ativo no store global e preserva
 * a posição do cursor caso outro usuário edite outro trecho do mesmo texto
 * em tempo real.
 */
export function CollabTextarea({
  entityId,
  field,
  value,
  onValueChange,
  onFocus,
  onBlur,
  ...rest
}: CollabTextareaProps) {
  const setActiveEditingField = useAppStore((s) => s.setActiveEditingField);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isFocusedRef = useRef(false);
  const isLocalChangeRef = useRef(false);
  const prevValueRef = useRef(value);
  const selectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  useLayoutEffect(() => {
    const el = textareaRef.current;
    const prev = prevValueRef.current;
    prevValueRef.current = value;

    if (!el || !isFocusedRef.current) return;

    if (isLocalChangeRef.current) {
      isLocalChangeRef.current = false;
      return;
    }

    if (prev === value) return;

    // Mudança remota enquanto o usuário local está digitando: preserva cursor
    let prefixLen = 0;
    const minLen = Math.min(prev.length, value.length);
    while (prefixLen < minLen && prev[prefixLen] === value[prefixLen]) {
      prefixLen++;
    }

    const { start, end } = selectionRef.current;
    const delta = value.length - prev.length;
    const nextStart = prefixLen < start ? Math.max(0, start + delta) : start;
    const nextEnd = prefixLen < end ? Math.max(0, end + delta) : end;

    const clampedStart = Math.min(nextStart, value.length);
    const clampedEnd = Math.min(nextEnd, value.length);
    el.setSelectionRange(clampedStart, clampedEnd);
    selectionRef.current = { start: clampedStart, end: clampedEnd };
  }, [value]);

  const captureSelection = () => {
    const el = textareaRef.current;
    if (el) {
      selectionRef.current = {
        start: el.selectionStart ?? 0,
        end: el.selectionEnd ?? 0,
      };
    }
  };

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onFocus={(e) => {
        isFocusedRef.current = true;
        captureSelection();
        setActiveEditingField({ entityId, field });
        onFocus?.(e);
      }}
      onBlur={(e) => {
        isFocusedRef.current = false;
        setActiveEditingField(null);
        onBlur?.(e);
      }}
      onSelect={captureSelection}
      onKeyUp={captureSelection}
      onClick={captureSelection}
      onChange={(e) => {
        isLocalChangeRef.current = true;
        selectionRef.current = {
          start: e.target.selectionStart ?? 0,
          end: e.target.selectionEnd ?? 0,
        };
        onValueChange(e.target.value);
      }}
      {...rest}
    />
  );
}
