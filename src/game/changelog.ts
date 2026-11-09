/** O que mudou em cada versão. A primeira da lista é a atual. */
export interface Release {
  version: number;
  date: string; // AAAA-MM-DD
  items: string[];
}

export const CHANGELOG: Release[] = [
  {
    version: 12,
    date: '2026-11-09',
    items: [
      'Recompensas do casal (aba Dupla): combinem prêmios de verdade e paguem com moedas',
      'Desafio do mês: chefe dourado com escudo, só cai com os treinos dos dois (+100 moedas)',
      'Como você está hoje: sono e disposição; em dia ruim a sugestão não sobe a carga',
      'Medidas (cintura, quadril, braço…) com gráfico, na Evolução',
      'Ciclo menstrual opcional e privado (Perfil): fica só no seu celular',
      'Bonequinho mostrando a execução dos exercícios principais',
    ],
  },
  {
    version: 11,
    date: '2026-11-09',
    items: [
      'Anotação por exercício (ajuste do aparelho, pegada…), aparece toda vez que você treinar ele',
      'Cronômetro para prancha: toque em Cronometrar, segure e pare; bipe a cada 30 s',
      'Peso corporal com média de 7 dias e tendência das últimas 4 semanas',
      'Evolução por exercício mostra o recorde e a melhor série',
    ],
  },
  {
    version: 10,
    date: '2026-11-08',
    items: [
      'Refeições salvas, carboidrato e gordura, meta de calorias para dia sem treino',
      'Anilhas por lado, aquecimento sugerido e super-série',
      'Corrigir séries de um treino terminado',
      'Congelar a semana que derrubou a constância e 8 conquistas do casal',
      'Resumo da semana no domingo às 20h e planilhas CSV',
    ],
  },
];

const KEY = 'forja-seen';

function read(): number {
  try {
    return Number(localStorage.getItem(KEY)) || 0;
  } catch {
    return 0;
  }
}

export function markSeen(version = CHANGELOG[0].version) {
  try {
    localStorage.setItem(KEY, String(version));
  } catch {
    /* modo privado: mostra de novo, sem problema */
  }
}

/** Versões que a pessoa ainda não viu (as mais novas primeiro). */
export function unseen(seen = read()): Release[] {
  return CHANGELOG.filter((r) => r.version > seen);
}
