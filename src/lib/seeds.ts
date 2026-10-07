import { MedicoAmbulatorio, ModeloTexto } from "@/types/hospital";

/**
 * Escala Oficial da Agenda Semanal de Ambulatórios (22 vagas / corpo clínico completo)
 * Resgatada fielmente da escala médica da enfermaria cirúrgica.
 */
export const SEED_AMBULATORIO_PADRAO: MedicoAmbulatorio[] = [
  // SEGUNDA-FEIRA
  {
    id: "med-jose-neto",
    nome: "José Neto",
    horarios: [{ dia: "Segunda", turno: "Manhã" }],
  },
  {
    id: "med-marcelo-fernandes",
    nome: "Marcelo Fernandes",
    horarios: [{ dia: "Segunda", turno: "Manhã" }],
  },
  {
    id: "med-romulo-furtado",
    nome: "Romulo Furtado",
    horarios: [{ dia: "Segunda", turno: "Tarde" }],
  },

  // TERÇA-FEIRA
  {
    id: "med-antonio-cavalcanti",
    nome: "Antonio Cavalcanti",
    horarios: [{ dia: "Terça", turno: "Manhã" }],
  },
  {
    id: "med-arthur-krause",
    nome: "Arthur Krause",
    horarios: [{ dia: "Terça", turno: "Manhã" }],
  },
  {
    id: "med-thiago-silva",
    nome: "Thiago Silva",
    especialidade: "Retorno",
    horarios: [
      { dia: "Terça", turno: "Manhã" },
      { dia: "Quinta", turno: "Tarde" },
    ],
  },
  {
    id: "med-cristiano-leao",
    nome: "Cristiano Leão",
    horarios: [{ dia: "Terça", turno: "Tarde" }],
  },

  // QUARTA-FEIRA
  {
    id: "med-arthur-araujo",
    nome: "Arthur Araujo",
    horarios: [{ dia: "Quarta", turno: "Manhã" }],
  },
  {
    id: "med-bruna-bittencourt",
    nome: "Bruna Bittencourt",
    horarios: [{ dia: "Quarta", turno: "Manhã" }],
  },
  {
    id: "med-thais-rodrigues",
    nome: "Thais Rodrigues",
    horarios: [{ dia: "Quarta", turno: "Manhã" }],
  },
  {
    id: "med-gustavo-arruda",
    nome: "Gustavo Arruda",
    horarios: [{ dia: "Quarta", turno: "Tarde" }],
  },
  {
    id: "med-joao-paulo",
    nome: "João Paulo",
    horarios: [{ dia: "Quarta", turno: "Tarde" }],
  },

  // QUINTA-FEIRA
  {
    id: "med-luciana-camara",
    nome: "Luciana Camara",
    horarios: [{ dia: "Quinta", turno: "Manhã" }],
  },
  {
    id: "med-vandre-carneiro",
    nome: "Vandre Carneiro",
    horarios: [{ dia: "Quinta", turno: "Manhã" }],
  },
  {
    id: "med-levi-santana",
    nome: "Levi Santana",
    horarios: [{ dia: "Quinta", turno: "Tarde" }],
  },

  // SEXTA-FEIRA
  {
    id: "med-andrea-margolis",
    nome: "Andrea Margolis",
    horarios: [{ dia: "Sexta", turno: "Manhã" }],
  },
  {
    id: "med-anne-jamylle",
    nome: "Anne Jamylle",
    horarios: [{ dia: "Sexta", turno: "Manhã" }],
  },
  {
    id: "med-danielle-teti",
    nome: "Danielle Teti",
    horarios: [{ dia: "Sexta", turno: "Manhã" }],
  },
  {
    id: "med-maria-luisa",
    nome: "Maria Luisa",
    horarios: [{ dia: "Sexta", turno: "Manhã" }],
  },
  {
    id: "med-diego-santos",
    nome: "Diego Santos",
    horarios: [{ dia: "Sexta", turno: "Tarde" }],
  },
  {
    id: "med-roberto-lustosa",
    nome: "Roberto Lustosa",
    horarios: [{ dia: "Sexta", turno: "Tarde" }],
  },
];

/**
 * Modelos de Texto Clínico Padrão (13 templates essenciais da rotina cirúrgica)
 */
export const SEED_MODELOS_PADRAO: ModeloTexto[] = [
  // 1. ENCAMINHAMENTO - OSTOMIA
  {
    id: "mod-enc-ostomia",
    titulo: "Ostomia",
    categoria: "Encaminhamento",
    conteudo: `ENCAMINHAMENTO

AMBULATÓRIO DE COLOSTOMIA - HOSPITAL BARÃO DE LUCENA

FORNEÇO ENCAMINHAMENTO PARA PACIENTE, XXX, PARA REALIZAR DISPENSAÇÃO GRATUITA DE BOLSAS DE KARAYA PARA COLOSTOMIA.`,
    createdAt: "2026-09-20T12:00:00.000Z",
  },

  // 2. ADM - PADRÃO (ANAMNESE CIRÚRGICA COMPLETA)
  {
    id: "mod-adm-padrao",
    titulo: "Padrão",
    categoria: "ADM",
    conteudo: `HD:
-

HDA:
PACIENTE COM QUADRO DE...

ANTECEDENTES:
- ALERGIAS: 
- COMORBIDADES: 
- CX PRÉVIAS: 
- HÁBITOS DE VIDA: 
- HEMOTX PRÉVIAS: 
- MUC: 

EXAME FÍSICO:
- GERAL: EGB, CONSCIENTE E ORIENTADO, CORADO, HIDRATADO, ACIANÓTICO, ANICTÉRICO, AFEBRIL.
- ACV: RCR EM 2T, BNF, S/S.
- AR: MV+ EM AHT, S/RA.
- ABD: GLOBOSO, FLÁCIDO, DEPRESSÍVEL, INDOLOR À PALPAÇÃO SUPERFICIAL E PROFUNDA, SEM SINAIS DE IRRITAÇÃO PERITONEAL.
- EXT: PULSOS CHEIOS E SIMÉTRICOS. TEC < 3S.

EXAMES COMPLEMENTARES:
- 

CD:
- INTERNAMENTO PARA PROCEDIMENTO CIRÚRGICO`,
    createdAt: "2026-09-20T12:00:00.000Z",
  },

  // 3. ALTA - PADRÃO
  {
    id: "mod-alta-padrao",
    titulo: "Padrão",
    categoria: "Alta",
    conteudo: `SUMÁRIO DE ALTA HOSPITALAR

DIAGNÓSTICO:
CIRURGIA REALIZADA:
DATA DA CIRURGIA:

EVOLUÇÃO CLÍNICA:
Paciente evoluiu no pós-operatório estável clinicamente, afebril, eupneico, com boa aceitação da dieta oral, diurese e trânsito intestinal presentes, deambulando e sem queixas álgicas significativas. Ferida operatória com aspecto limpo e seco, sem sinais flogísticos ou secreções patológicas.

CONDUTA NA ALTA:
1. Alta hospitalar em bom estado geral.
2. Orientações de retorno ambulatorial para revisão e retirada de pontos em 7 a 10 dias.
3. Receituário entregue em mãos com analgésicos e orientações gerais.
4. Procurar a emergência imediatamente em caso de: febre, dor intensa refratária, vômitos incoercíveis ou secreção purulenta na incisão.`,
    createdAt: "2026-09-20T12:00:00.000Z",
  },

  // 4. ORIENTAÇÕES DE ALTA - BARIÁTRICA
  {
    id: "mod-ori-bariatrica",
    titulo: "Bariátrica",
    categoria: "Orientações de Alta",
    conteudo: `ORIENTAÇÕES DE ALTA - PÓS-OPERATÓRIO DE CIRURGIA BARIÁTRICA

1. DIETA:
- Seguir rigorosamente a dieta líquida fracionada conforme orientações da equipe de nutrição (copinhos de 50ml a cada 15 a 20 minutos).
- Proibido uso de canudos. Não ingerir líquidos gasosos ou açucarados.

2. CUIDADOS GERAIS:
- Manter caminhadas leves frequentes ao longo do dia para prevenção de trombose.
- Não levantar peso superior a 5kg nem realizar esforços físicos intensos por 30 dias.
- Uso de meia elástica de compressão conforme prescrição médica.

3. FERIDA OPERATÓRIA:
- Lavar com água e sabonete neutro durante o banho. Secar bem com toalha limpa.
- Manter incisões limpas e secas.

4. SINAIS DE ALARME (PROCURAR EMERGÊNCIA):
- Febre (> 37,8°C), taquicardia persistente, dor abdominal intensa e súbita, falta de ar, vômitos repetidos ou sangramento.`,
    createdAt: "2026-09-20T12:00:00.000Z",
  },

  // 5. ORIENTAÇÕES DE ALTA - COLELAP
  {
    id: "mod-ori-colelap",
    titulo: "Colelap",
    categoria: "Orientações de Alta",
    conteudo: `ORIENTAÇÕES DE ALTA - COLECISTECTOMIA VIDEOLAPAROSCÓPICA (COLELAP)

1. ALIMENTAÇÃO:
- Dieta leve e hipogordurosa nos primeiros 15 a 30 dias (evitar frituras, carnes gordurosas, embutidos e laticínios integrais).
- Hidratação abundante com água e sucos naturais.

2. ATIVIDADES:
- Repouso relativo nos primeiros 7 a 10 dias.
- Evitar esforço físico moderado/intenso e não carregar peso acima de 5kg por 30 dias.

3. FERIDA OPERATÓRIA E CURATIVOS:
- Banho de chuveiro liberado. Lavar os portais cirúrgicos com água e sabão neutro.
- Secar bem com toalha limpa. Não utilizar pomadas sem orientação médica.
- Retorno ambulatorial em 7 a 10 dias para avaliação e retirada de pontos.

4. SINAIS DE ALARME:
- Febre, pele/olhos amarelados (icterícia), dor abdominal forte que não cede com analgésicos ou vômitos persistentes.`,
    createdAt: "2026-09-20T12:00:00.000Z",
  },

  // 6. ORIENTAÇÕES DE ALTA - HERNIORRAFIA
  {
    id: "mod-ori-hernia",
    titulo: "Herniorrafia Inguinal / Umbilical",
    categoria: "Orientações de Alta",
    conteudo: `ORIENTAÇÕES DE ALTA - HERNIORRAFIA

1. CUIDADOS POSTURAIS E ATIVIDADES:
- Evitar esforços abdominais, tosse excessiva ou carregar pesos superiores a 5kg por 30 a 45 dias.
- Evitar constipação intestinal (ingerir fibras e bastante água).

2. FERIDA CIRÚRGICA:
- Lavar diariamente no banho com água e sabão. Manter seca.
- Retirada de pontos entre 7 e 10 dias.
- É comum pequeno edema ou equimose discreta local.

3. SINAIS DE ALARME:
- Dor intensa progressiva, abaulamento volumoso doloroso na incisão, febre ou drenagem purulenta.`,
    createdAt: "2026-09-20T12:00:00.000Z",
  },

  // 7. ORIENTAÇÕES DE ALTA - APENDICECTOMIA
  {
    id: "mod-ori-apendice",
    titulo: "Apendicectomia",
    categoria: "Orientações de Alta",
    conteudo: `ORIENTAÇÕES DE ALTA - APENDICECTOMIA

1. DIETA:
- Dieta habitual balanceada, rica em fibras para manter trânsito intestinal regular.

2. CUIDADOS GERAIS:
- Repouso relativo de 15 dias para laparoscopia e 30 dias para cirurgia aberta.
- Evitar esforços físicos vigorosos e levantamento de cargas.

3. SINAIS DE ALARME:
- Febre, dor abdominal progressiva, distensão abdominal, parada de eliminação de gases ou fezes, ou secreção na ferida.`,
    createdAt: "2026-09-20T12:00:00.000Z",
  },

  // 8. ORIENTAÇÕES DE ALTA - CIRURGIA ORIFICIAL
  {
    id: "mod-ori-orificial",
    titulo: "Cirurgia Orificial (Hemorróidas / Fístula / Fissura)",
    categoria: "Orientações de Alta",
    conteudo: `ORIENTAÇÕES DE ALTA - CIRURGIA ORIFICIAL / PROCTOLÓGICA

1. DIETA E HÁBITO INTESTINAL:
- Dieta laxativa rica em fibras (frutas, verduras, aveia) e ingestão de 2 a 3 litros de água por dia.
- Evitar alimentos condimentados, pimenta e bebidas alcoólicas.

2. HIGIENE LOCAL:
- Banhos de assento com água morna após cada evacuação e 3 vezes ao dia.
- Evitar uso de papel higiênico (lavar com água ou ducha higiênica e secar suavemente com toalha limpa).

3. MEDICAÇÃO:
- Usar analgésicos prescritos nos horários indicados, principalmente antes das evacuações.`,
    createdAt: "2026-09-20T12:00:00.000Z",
  },

  // 9. ORIENTAÇÕES DE ALTA - LAPAROTOMIA
  {
    id: "mod-ori-laparotomia",
    titulo: "Laparotomia Exploradora",
    categoria: "Orientações de Alta",
    conteudo: `ORIENTAÇÕES DE ALTA - PÓS-OPERATÓRIO DE LAPAROTOMIA

1. CUIDADOS GERAIS:
- Uso de cinta abdominal se recomendado pela equipe médica.
- Repouso com restrição rigorosa de levantamento de peso por 60 a 90 dias.
- Deambulação diária e frequente no domicílio.

2. FERIDA CIRÚRGICA:
- Lavagem com água e sabão neutro. Retirada de pontos em 10 a 14 dias conforme orientação.

3. SINAIS DE ALARME:
- Febre, vômitos, parada de eliminação de flatos/fezes, dor intensa ou secreção no corte.`,
    createdAt: "2026-09-20T12:00:00.000Z",
  },

  // 10. ORIENTAÇÕES DE ALTA - CIRURGIA DERMATOLÓGICA
  {
    id: "mod-ori-pele",
    titulo: "Ressecção de Lesão de Pele / Cisto / Lipoma",
    categoria: "Orientações de Alta",
    conteudo: `ORIENTAÇÕES DE ALTA - CIRURGIA DERMATOLÓGICA / PEQUENOS PROCEDIMENTOS

1. CUIDADOS COM A INCISÃO:
- Manter curativo oclusivo por 24 horas. Após isso, lavar delicadamente com água e sabão.
- Evitar exposição solar direta sobre a cicatriz por pelo menos 6 meses.
- Retirada de pontos entre 7 e 14 dias (a depender da região anatômica).`,
    createdAt: "2026-09-20T12:00:00.000Z",
  },

  // 11. EVOLUÇÃO - PADRÃO DE ENFERMARIA CIRÚRGICA
  {
    id: "mod-evo-padrao",
    titulo: "Padrão de Enfermaria Cirúrgica",
    categoria: "Evolução",
    conteudo: `EVOLUÇÃO CLÍNICA DE ENFERMARIA

DPO: 
HD: 
CIRURGIA: 

S: Paciente refere noite tranquila, sem queixas álgicas no momento. Aceitando dieta via oral. Diurese (+) espontânea. Evacuação (+/-). Deambulando pelo quarto/corredor.

O: 
- EGB, LOTE, CORADO, HIDRATADO, AFEBRIL, EUPNEICO.
- SINAIS VITAIS: PA: 120/80 mmHg | FC: 76 bpm | FR: 16 irpm | SatO2: 98% AA | Tax: 36,4 °C.
- ACV: RCR em 2T, BNF, sem sopros.
- AR: MV universalmente audível, sem ruídos adventícios.
- ABD: Flácido, depressível, indolor à palpação, RHA presentes. Sem sinais de peritonite.
- FERIDA OPERATÓRIA: Incisão limpa e seca, bordas coaptadas, sem hiperemia, calor local ou secreções.
- DRENOS: (Se houver: débito seroso/hemático, quantidade nas últimas 24h).
- MMII: Sem edema ou empastamento de panturrilhas.

A: Pós-operatório com evolução clínica favorável, estável hemodynamicamente.

P:
1. Manter analgesia conforme prescrição.
2. Estimular deambulação e hidratação.
3. Previsão de alta se mantiver estabilidade e boa aceitação alimentar.`,
    createdAt: "2026-09-20T12:00:00.000Z",
  },

  // 12. RECEITUÁRIO - PADRÃO PÓS-OPERATÓRIO
  {
    id: "mod-rec-padrao",
    titulo: "Receita Padrão Pós-Operatório",
    categoria: "Receituário",
    conteudo: `RECEITUÁRIO AMBULATORIAL PÓS-OPERATÓRIO

USO ORAL:

1. Dipirona 500mg (ou 1g) ------------------------ 1 caixa
Tomar 1 comprimido de 6 em 6 horas se dor ou febre (não exceder 4 comprimidos/dia).

2. Cetoprofeno 100mg ---------------------------- 1 caixa
Tomar 1 comprimido de 12 em 12 horas por 3 a 5 dias (após as refeições).

3. Paracetamol 750mg + Codeína 30mg ------------- 1 caixa (se dor moderada a intensa)
Tomar 1 comprimido de 8 em 8 horas apenas se dor intensa refratária à Dipirona.

4. Dimeticona / Simeticona 40mg ------------------ 1 frasco
Tomar 40 gotas de 8 em 8 horas se gases ou distensão abdominal.

5. Lactulona xarope (se constipação) ------------ 1 frasco
Tomar 15ml 1 vez ao dia se constipação intestinal persistente.`,
    createdAt: "2026-09-20T12:00:00.000Z",
  },

  // 13. ORIENTAÇÕES GERAIS - FERIDA OPERATÓRIA
  {
    id: "mod-geral-ferida",
    titulo: "Cuidados com Ferida Operatória e Sinais de Alerta",
    categoria: "Orientações Gerais",
    conteudo: `ORIENTAÇÕES GERAIS DE CUIDADO PÓS-CIRÚRGICO

1. HIGIENE:
- O banho completo pode ser realizado a partir de 24h após a cirurgia.
- Lave a ferida cirúrgica suavemente com água e sabonete neutro.
- Seque com toalha limpa ou gaze esterilizada (sem esfregar).
- Não passe álcool, pomadas ou pós sobre os pontos, exceto se especificamente prescrito.

2. ALIMENTAÇÃO:
- Beba bastante água (ao menos 2 litros ao dia).
- Evite bebidas alcoólicas e tabagismo (o fumo prejudica diretamente a cicatrização).

3. RETORNO:
- Não falte ao retorno ambulatorial agendado para reavaliação médica e retirada de pontos.
- Guarde este receituário e leve-o consigo na consulta de revisão.`,
    createdAt: "2026-09-20T12:00:00.000Z",
  },
];

/**
 * Mesclagem resiliente de ambulatório:
 * - Se remotos vier vazio, PRESERVA o local ou utiliza a semente oficial.
 * - Garante que novos médicos criados localmente nunca sejam apagados.
 */
export function mesclarAmbulatorioComSeguranca(
  remotos: MedicoAmbulatorio[] | undefined | null,
  locais: MedicoAmbulatorio[]
): MedicoAmbulatorio[] {
  if (Array.isArray(remotos) && remotos.length > 0) {
    const mapa = new Map<string, MedicoAmbulatorio>();
    for (const r of remotos) {
      if (r && r.id) mapa.set(r.id, r);
    }
    // Preserva médicos adicionados localmente que ainda não foram sincronizados
    for (const l of locais) {
      if (l && l.id && !mapa.has(l.id)) {
        mapa.set(l.id, l);
      }
    }
    return Array.from(mapa.values());
  }

  // Se remotos for vazio ou indefinido: NUNCA apaga dados locais
  if (Array.isArray(locais) && locais.length > 0) {
    return locais;
  }

  // Fallback padrão se ambos estiverem vazios (ex: aba anônima ou primeiro acesso)
  return SEED_AMBULATORIO_PADRAO;
}

/**
 * Mesclagem resiliente de modelos de texto:
 * - Se remotos vier vazio, PRESERVA os modelos locais ou utiliza os modelos padrão oficiais.
 * - Garante que modelos criados pelo usuário nunca sejam apagados por sincronização vazia.
 */
export function mesclarModelosComSeguranca(
  remotos: ModeloTexto[] | undefined | null,
  locais: ModeloTexto[]
): ModeloTexto[] {
  if (Array.isArray(remotos) && remotos.length > 0) {
    const mapa = new Map<string, ModeloTexto>();
    for (const r of remotos) {
      if (r && r.id) mapa.set(r.id, r);
    }
    // Preserva modelos criados localmente
    for (const l of locais) {
      if (l && l.id && !mapa.has(l.id)) {
        mapa.set(l.id, l);
      }
    }
    return Array.from(mapa.values());
  }

  // Se remotos for vazio ou indefinido: NUNCA apaga dados locais
  if (Array.isArray(locais) && locais.length > 0) {
    return locais;
  }

  // Fallback padrão se ambos estiverem vazios (ex: aba anônima ou primeiro acesso)
  return SEED_MODELOS_PADRAO;
}
