/** Animação em pixel art (art/exercicios.px.js) e uma dica curta de execução. */
const EXEC: Record<string, { anim: string; cue: string }> = {
  agachamento: { anim: 'agachamento', cue: 'Quadril para trás e para baixo, joelhos na direção dos pés, peito aberto.' },
  supino: { anim: 'supino', cue: 'Escápulas presas no banco, barra desce até o peito, pés firmes no chão.' },
  terra: { anim: 'terra', cue: 'Coluna neutra, barra colada nas pernas: empurre o chão para subir.' },
  stiff: { anim: 'terra', cue: 'Joelhos quase retos, quadril vai para trás, barra rente às pernas.' },
  'remada-curvada': { anim: 'remada-curvada', cue: 'Tronco inclinado e firme, puxe a barra até o umbigo.' },
  desenvolvimento: { anim: 'desenvolvimento', cue: 'Abdômen travado, barra sobe em linha reta passando o rosto.' },
  'barra-fixa': { anim: 'barra-fixa', cue: 'Comece pendurado com braços esticados e puxe até o queixo passar a barra.' },
  rosca: { anim: 'rosca', cue: 'Cotovelos parados ao lado do corpo, sem balançar o tronco.' },
  'rosca-martelo': { anim: 'rosca', cue: 'Pegada neutra (polegar para cima), cotovelos parados.' },
  flexao: { anim: 'flexao', cue: 'Corpo reto como prancha, peito desce até perto do chão.' },
  afundo: { anim: 'afundo', cue: 'Passo longo, tronco reto, joelho de trás desce quase até o chão.' },
  prancha: { anim: 'prancha', cue: 'Antebraços no chão, corpo reto da cabeça ao calcanhar, abdômen firme.' },
};

export const EXEC_FRAMES = 6;

export function executionOf(exerciseId: string) {
  return EXEC[exerciseId] ?? null;
}
