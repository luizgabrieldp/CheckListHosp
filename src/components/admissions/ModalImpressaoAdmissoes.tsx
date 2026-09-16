"use client";

import React, { useState } from "react";
import { AdmissaoPaciente } from "@/types/hospital";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Printer, GripVertical, X, Check, ArrowUpDown } from "lucide-react";
import { formatarDataBR } from "@/lib/utils";

interface Props {
  admissoes: AdmissaoPaciente[];
  onClose: () => void;
  onSalvarOrdem: (ordenadas: AdmissaoPaciente[]) => void;
}

function SortableItem({ paciente }: { paciente: AdmissaoPaciente }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: paciente.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-3 rounded-xl bg-slate-800/90 border border-slate-700/80 hover:border-cyan-500/50 transition-all select-none"
    >
      <div className="flex items-center gap-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-700/60"
          title="Arrastar para reordenar"
        >
          <GripVertical className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-cyan-400 text-xs px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/60">
              {paciente.leito || "Leito -"}
            </span>
            <span className="text-sm font-semibold text-white">{paciente.nome}</span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {paciente.enfermaria} • Status: {paciente.status} • HD: {paciente.historicoClinico?.hd || "Sem HD"}
          </p>
        </div>
      </div>
      <div className="text-xs text-slate-400 text-right">
        {formatarDataBR(paciente.dataAdmissaoAgendada)}
      </div>
    </div>
  );
}

export function ModalImpressaoAdmissoes({ admissoes, onClose, onSalvarOrdem }: Props) {
  const [itens, setItens] = useState<AdmissaoPaciente[]>(() => [...admissoes]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItens((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const reordenado = arrayMove(items, oldIndex, newIndex);
        return reordenado;
      });
    }
  }

  function handleImprimir() {
    onSalvarOrdem(itens);
    setTimeout(() => {
      window.print();
    }, 150);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl glass-card border border-cyan-500/40 p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* CABEÇALHO MODAL */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <ArrowUpDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Priorização de Leitos para Impressão
              </h3>
              <p className="text-xs text-slate-400">
                Arraste os leitos para cima ou para baixo para definir a ordem no relatório A4.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* LISTA ARRASTÁVEL COM DND-KIT */}
        <div className="flex-1 overflow-y-auto py-4 space-y-2.5">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={itens.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              {itens.map((paciente) => (
                <SortableItem key={paciente.id} paciente={paciente} />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        {/* RODAPÉ COM AÇÕES */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            Cancelar
          </button>
          <button
            onClick={handleImprimir}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-lg shadow-cyan-500/25 active:scale-95 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Confirmar Ordem & Imprimir Relatório</span>
          </button>
        </div>
      </div>
    </div>
  );
}
