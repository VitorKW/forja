# Forja — GDD (v0.1)

> Rascunho inicial. Itens marcados com `[suposição]` são escolhas minhas para você confirmar ou trocar.

## 1. Visão

**Pitch:** um app web de treino em que cada série que você faz forja um personagem: ele ganha força, sobe de nível e enfrenta "chefes" que são os seus próprios recordes.

**Pilares de design**
1. **Progresso visível:** todo treino deixa uma marca no personagem, mesmo os treinos ruins.
2. **Consistência acima de exagero:** o jogo premia a frequência e a técnica, nunca o volume em excesso. Dia de descanso faz parte do jogo.
3. **Baseado em ciência:** as regras seguem princípios reais de periodização (volume semanal, RIR, sobrecarga progressiva).

**Público e plataforma:** quem treina musculação, do iniciante ao intermediário. PWA mobile-first (React + TypeScript), funciona offline e pode ser instalado no celular.

**Referências de sensação:** a progressão de atributos de um RPG, o "número subindo" dos jogos incrementais e as metas semanais (não diárias) dos apps de hábito.

## 2. Core loop

```
Treinar → registrar séries → ganhar XP nos atributos → subir de nível / derrotar chefe
   ↑                                                              ↓
   └──────────── nova meta semanal / próximo chefe ←──────────────┘
```

| Loop | Duração | O que acontece |
|---|---|---|
| Curto | uma série (~2 min) | Registra a série, recebe XP na hora, a barra do atributo enche |
| Médio | semana | Cumpre a meta de dias, o multiplicador de constância aumenta |
| Longo | 1 a 3 meses | Sobe de nível, derrota chefes (PRs), desbloqueia títulos |

## 3. Mecânicas

| Mecânica | Como funciona | Pilar |
|---|---|---|
| **Atributos** | 5 atributos ligados a padrões de movimento: **Empurrar** (peito, ombro, tríceps), **Puxar** (costas, bíceps), **Pernas**, **Core** e **Fôlego** (cardio). Cada exercício alimenta 1 ou 2 atributos | 1, 3 |
| **Série efetiva** | Só gera XP cheio a série que terminou com RIR ≤ 3 (até 3 repetições na reserva). Séries de aquecimento geram 2 XP | 3 |
| **Meta semanal** | O usuário escolhe de 2 a 6 dias por semana. Cumprir a meta aumenta o multiplicador de constância | 2 |
| **Constância** | Multiplicador de XP: +10% por semana cumprida em sequência, até +50%. Se perder uma semana, o bônus cai pela metade (não zera) | 2 |
| **Chefes** | Cada levantamento principal tem um chefe. A "vida" dele é o seu 1RM estimado × 1,025. Derrota o chefe quem supera essa marca; aí ele volta mais forte | 1, 3 |
| **Fadiga** | Acima de 20 séries semanais em um mesmo atributo, o XP dele cai para 50%. O jogo avisa: "seu Empurrar está sobrecarregado" | 2, 3 |
| **Deload** | Uma semana de deload cumpre a meta com metade dos dias (arredondado para cima), uma vez a cada 4 semanas | 2, 3 |

## 4. Progressão e economia

**XP por série**

```
xp_serie = 10 (série efetiva) | 2 (aquecimento)
         + 3  se registrou o RIR
         × multiplicador_constancia (1,0 a 1,5)
         × 0,5 se o atributo estiver em fadiga
```

Exercícios com 2 atributos dividem o XP: 70% para o principal e 30% para o secundário.

**Bônus**
- Treino concluído: +30 XP
- Chefe derrotado (novo PR): +100 XP
- Meta semanal cumprida: +75 XP

**1RM estimado (fórmula de Epley):** `1RM = carga × (1 + reps / 30)`. Só vale para séries de até 12 repetições.

**Nível do jogador:** XP para passar do nível *n* para o *n+1* = `round(100 × n^1,5)`

| Nível | XP para o próximo | XP acumulado |
|---|---|---|
| 1 | 100 | 0 |
| 2 | 283 | 100 |
| 3 | 520 | 383 |
| 4 | 800 | 903 |
| 5 | 1.118 | 1.703 |
| 6 | 1.470 | 2.821 |
| 7 | 1.852 | 4.291 |
| 8 | 2.263 | 6.143 |
| 9 | 2.700 | 8.406 |
| 10 | 3.162 | 11.106 |

Um treino típico rende ~250 XP (18 séries efetivas mais o bônus). Com 3 treinos por semana, o nível 10 chega em uns 3 a 4 meses `[suposição: ritmo bom para manter a motivação]`.

**Nível de cada atributo:** mesma fórmula, com metade do XP necessário.

**Riscos de abuso:** é um jogo single-player, então mentir nos registros só engana a própria pessoa. Mesmo assim:
- Uma carga acima de 1,5× o PR anterior pede confirmação ("tem certeza?").
- XP limitado a 40 séries por treino.
- A regra de fadiga evita que o melhor jeito de "farmar" XP seja treinar demais.

## 5. Conteúdo (inicial)

**Chefes (MVP):** Agachamento, Supino, Levantamento Terra `[V2: Desenvolvimento, Barra Fixa]`

**Conquistas (MVP)**
1. *Primeira Faísca*: conclua o primeiro treino
2. *Fogo Aceso*: cumpra a meta semanal pela primeira vez
3. *Brasa Constante*: 4 semanas seguidas cumprindo a meta
4. *Forja Eterna*: 12 semanas seguidas
5. *Matador de Chefes*: derrote um chefe pela primeira vez
6. *Trinca*: derrote os 3 chefes pelo menos uma vez
7. *Equilíbrio*: todos os atributos no nível 3 ou mais
8. *Sabe Descansar*: conclua uma semana de deload
9. *Centurião*: 100 treinos concluídos
10. *Honesto*: registre o RIR em 50 séries seguidas

**Títulos por nível:** Aprendiz (1–4), Ferreiro (5–9), Mestre da Forja (10+)

## 6. Estética e UX

- **Estilo:** tema escuro, laranja de brasa sobre carvão, ícones simples. O personagem é uma silhueta que "acende" conforme os atributos crescem `[suposição: evita depender de muita arte]`.
- **Tom:** motivador e bem-humorado, sem culpar ninguém ("Dia de descanso também forja.").
- **Feedback ("juice"):** número de XP flutuando ao registrar uma série, barra enchendo com brilho, tela cheia de level-up e uma animação de "golpe" quando derrota um chefe. Vibração no celular (opcional).

**Telas**
1. **Forja (início):** personagem, nível, barra de XP, progresso da meta semanal, botão "Começar treino"
2. **Treino ativo:** adicionar exercício, registrar série (carga, reps, RIR) com poucos toques, timer de descanso
3. **Resumo do treino:** XP ganho por atributo (animado), PRs batidos, conquistas desbloqueadas
4. **Chefes:** vida atual de cada chefe e histórico de vitórias
5. **Perfil:** atributos, conquistas, histórico e configurações (meta semanal, unidade kg/lb)

Fluxo: Forja → Treino ativo → Resumo → Forja

## 7. Escopo

**MVP (cerca de 2 semanas)**
- Registro de treino livre com uma lista fixa de ~30 exercícios
- XP, nível do jogador e os 5 atributos
- Meta semanal, constância, fadiga e deload
- 3 chefes com 1RM estimado
- 10 conquistas
- Dados salvos no aparelho (IndexedDB), PWA offline
- Testes unitários de todas as regras do jogo

**V2**
- Fichas e programas de treino prontos (usando a skill de periodização)
- Cosméticos para o personagem com moeda própria ("Fragmentos")
- Mais chefes, exercícios personalizados, gráficos de evolução
- Exportar e importar dados

**Fora de escopo, por enquanto:** contas e login, backend, ranking online, recursos sociais e integração com relógios.

## 8. Métricas de sucesso

- Você mesmo usar o app por 4 semanas seguidas (o teste mais honesto)
- Registrar uma série leva menos de 10 segundos
- Pelo menos 1 chefe derrotado por mês nos primeiros 3 meses
- Lighthouse PWA ≥ 90 (bom para o portfólio)

## 9. Riscos e perguntas em aberto

- **Nome:** "Forja" funciona para você?
- **Personagem:** silhueta abstrata ou pixel art? Pixel art dá mais charme, mas pede trabalho de arte.
- **Ritmo de nível:** 3 a 4 meses até o nível 10 está bom, ou deveria ser mais rápido no começo?
- **Cardio (Fôlego):** como medir? Por minutos em zona moderada (ex.: 1 XP/min) `[suposição]`
- **Risco:** a gamificação incentivar ego lifting. Mitigação: a regra de fadiga, a confirmação de carga e a conquista que premia registrar o RIR.
