# Direção visual — Forja

Feito seguindo a skill oficial `frontend-design` da Anthropic: planejar → revisar contra o briefing → construir → criticar.

## Conceito

**Metal na bigorna.** O vocabulário visual vem de dois mundos que o app junta: a forja do ferreiro e a sala de musculação.

A ideia central é que **a cor é informação**. Os ferreiros sabem a temperatura do metal pela cor: rubro, cereja, laranja, amarelo, branco. No Forja, essa escala mostra o nível de cada atributo. Aço frio é nível 1; metal branco-quente é nível 10 ou mais. Assim, o personagem mostra seu progresso de forma literal.

**Um único elemento ousado:** o personagem incandescente sobre a bigorna. Todo o resto é sóbrio (aço, giz).

## Tokens

| Nome | Hex | Uso |
|---|---|---|
| Ferro | `#1c1e21` | fundo |
| Aço | `#272a2f` | superfícies |
| Aço claro | `#363a40` | bordas, trilhos |
| Limalha | `#959ba3` | texto secundário |
| Giz | `#ebe8e3` | texto principal (pó de magnésio) |
| Escala de calor | `#5a6068 → #8e1b10 → #c8321a → #ef6a1f → #f7b538 → #fff1c9` | nível, progresso, ações |

**Tipografia:** uma superfamília, Barlow. **Barlow Condensed** nos números e títulos lembra a numeração das anilhas e os placares. **Barlow** é usada nos textos. Escala: 13 / 15 / 18 / 24 / 40 / 72.

## Princípios

1. A cor de calor só aparece onde há progresso ou ação. O resto é aço.
2. A estrutura informa: a faixa da semana mostra os 7 dias de verdade e as marcas são treinos reais. Nada de decoração.
3. Painéis de aço escovado com raio pequeno (4px) e um fio de luz no topo. Não são cards de SaaS.
4. Movimento: um único momento orquestrado (faíscas no resumo do treino). O resto do movimento só responde ao toque (o +XP ao registrar uma série).
5. Sem CAIXA ALTA, sem rótulos-sobretítulo, sem textos separados por "·", sem emoji como ícone de navegação.

## Wireframe da tela inicial

```
┌──────────────────────────────┐
│        (personagem em        │
│      brasa sobre bigorna)    │
│                              │
│ Nível 3              Aprendiz│
│ ▰▰▰▰▰▰▰▱▱▱▱  240 de 520 XP   │
├──────────────────────────────┤
│ Esta semana        meta 3 ×1,2│
│ S  T  Q  Q  S  S  D          │
│ ▮  ▯  ▮  ▯  ▯  ▯  ▯          │
├──────────────────────────────┤
│ [      Começar treino      ] │
└──────────────────────────────┘
```

## Pixel art (v0.3)

O personagem e os chefes são pixel art, porque o público ama jogos e o estilo dá identidade. A interface em volta continua sóbria (aço e giz) para o sprite ser o destaque.

- **Personagem** (20 × 25, em camadas): cada atributo libera uma peça (Empurrar → ombreiras, Puxar → manoplas, Core → peitoral, Pernas → grevas, Fôlego → capa). O material mostra o nível: couro (2), aço (4), brasa (6), ouro (8). O elmo aparece no nível 5 do personagem e a coroa no 10. São dois visuais por perfil (cabelo curto ou longo).
- **Chefes** (16 × 16, desenhados à mão): 7 formas (gosma, morcego, golem, serpente, cavaleiro, hidra, chama) com paletas próprias. Eles crescem na tela conforme a campanha avança, e os próximos ficam em silhueta.

## Tentativas anteriores (para não repetir)

- v0.2: silhueta vetorial que só mudava de cor. Ficou parecendo um boneco de teste. Chefes gerados por algoritmo saíram como bolhas sem personalidade, por isso agora são desenhados à mão.

- v0.1: quase preto com tom marrom e um único destaque laranja, cards arredondados iguais, CAIXA ALTA, emoji nas abas. Ficou genérico.
