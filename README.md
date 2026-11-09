# 🔥 Forja

App web de treino gamificado: cada série que você registra forja um personagem que ganha XP, sobe de nível e enfrenta chefes que são os seus próprios recordes.

**Stack:** React 18 · TypeScript · Vite · Zustand · PWA (funciona offline e pode ser instalado no celular) · Vitest

## Rodando

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # testes das regras do jogo
npm run build    # build de produção com service worker
```

## Arquitetura

```
src/
  game/          ← regras do jogo: funções puras, sem React, 100% testadas
    rules.ts       XP, níveis, fadiga, constância, chefes (computeProgress)
    achievements.ts
    exercises.ts
    types.ts
  store.ts       ← estado (Zustand) persistido no localStorage: guarda só o histórico de treinos
  useProgress.ts ← recalcula o progresso a partir do histórico
  screens/       ← telas (Forja, Treino, Resumo, Chefes, Perfil)
```

**Decisão principal:** o progresso (XP, níveis, chefes, conquistas) **nunca é salvo**. Ele é sempre recalculado repetindo o histórico de treinos em `computeProgress`. Por isso:
- apagar ou editar um treino antigo recalcula tudo de forma consistente;
- mudar uma regra de balanceamento vale também para o passado;
- as regras são fáceis de testar (entrada: lista de treinos → saída: progresso).

## Regras

O design completo está em [GDD.md](GDD.md). Resumo:
- Série efetiva (RIR ≤ 3): 10 XP, mais 3 se registrar o RIR. Aquecimento: 2 XP.
- Mais de 20 séries semanais num mesmo atributo → fadiga, e o XP cai pela metade.
- Meta semanal cumprida → +75 XP e +10% de multiplicador (até +50%).
- Chefe: vida = 1RM estimado (Epley) × 1,025.
