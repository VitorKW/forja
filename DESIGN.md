# Direção visual — Forja (v0.5)

## Conceito

**App de jogo moderno, aceso por brasa.** A interface parece um app novo de celular: cards macios com profundidade, barra flutuante, transições suaves. A pixel art é a estrela, e a interface conversa com ela de dois jeitos: o brilho de brasa atrás do personagem e uma **fonte pixel nos números** (nível, XP, cronômetro, recordes).

## Tokens

| Nome | Valor | Uso |
|---|---|---|
| Fundo | `#0d0b0a` + brilho radial de brasa no topo | página |
| Superfície | `#1f1915 → #171310` | cards |
| Poço | `#0f0c0a` | trilhos, campos, steppers |
| Linha | `#ffffff12` | bordas de 1px |
| Texto / apagado | `#f7f0e8` / `#9c9087` | |
| Gradiente de brasa | `#ffd166 → #ff8a1f → #ff4d4d` | ação principal, progresso, conquista |
| Vida | `#b3122a → #ff4d4d` | barra de vida dos chefes |
| Descanso | `#5ee0a8` | timer de descanso, treino em andamento |

**Tipografia:** Bricolage Grotesque (títulos, pesada e com personalidade), Manrope (texto), Pixelify Sans (números).
**Formas:** cards com raio 22px, botões 16px, pílulas para chips e seletores.

## Princípios

1. O gradiente de brasa só aparece em ação, progresso e recompensa. O resto é superfície escura.
2. A estrutura informa: a semana mostra os 7 dias reais e o anel mostra a meta; nada é decoração.
3. Navegação: seletor de perfil em pílula no topo; doca flutuante embaixo com 3 abas e o botão **Treinar** sempre à mão.
4. Movimento (biblioteca Motion): troca de abas e de perfil com fade curto, pílula ativa que desliza, cards da tela inicial entrando em sequência, anel da meta se preenchendo. No resumo do treino: faíscas, número contando e cards entrando um a um. Tudo respeita "reduzir movimento".
5. Sem emoji como ícone, sem texto separado por "·".

## Pixel art (v0.4, feita com a skill pxl)

- **Fonte**: `art/personagem.px.js` e `art/chefes.px.js`, escritos na DSL da skill [pxl](https://github.com/crsolver/claude-pxl). Os PNGs vão para `public/sprites/` (comando no README).
- **Personagem** (34 × 38 com contorno, um PNG por camada): cada atributo libera uma peça (Empurrar → ombreiras, Puxar → manoplas, Core → peitoral, Pernas → grevas, Fôlego → capa). O material mostra o nível: couro (2), aço (4), brasa (6), ouro (8). O elmo aparece no nível 5 do personagem (aço, e ouro a partir do 8, porque couro e brasa se confundem com cabelo) e a coroa no 10. São dois visuais por perfil (cabelo curto ou longo).
- **Chefes** (26 × 26, um PNG por chefe): 7 formas (gosma, morcego, golem, serpente, cavaleiro, hidra, chama) com paletas próprias e enfeites que diferenciam os que repetem forma (bolhas, chifres, brasas, asas, coroa). Eles crescem na tela conforme a campanha avança, e os próximos ficam em silhueta.

## Tentativas anteriores (para não repetir)

- v0.3: "aço escovado" com painéis de raio 4px e fonte condensada (Barlow). Coerente, mas com cara de painel antigo; o usuário queria cara de app novo.
- v0.2: silhueta vetorial que só mudava de cor. Ficou parecendo um boneco de teste. Chefes gerados por algoritmo saíram como bolhas sem personalidade.
- v0.1: quase preto com tom marrom e um único destaque laranja, cards arredondados iguais, CAIXA ALTA, emoji nas abas. Ficou genérico.
