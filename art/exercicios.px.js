// Execução dos exercícios principais: um bonequinho de lado indo da posição A à B.
// Cada exercício é só duas poses (articulações); o meio é interpolado.
// Gerar: node ~/.claude/skills/pxl-pixel-art/bin/pxl.js build art/exercicios.px.js --out art/out/exercicios

pal({
  k: "#120d0b", // contorno
  s: "#e8b48a", // pele
  S: "#b9805a", // pele na sombra (braço de trás)
  c: "#ef6a1f", // camiseta
  p: "#3b3f4a", // calça
  h: "#2a1a12", // cabelo
  g: "#8b9198", // barra
  G: "#b8352a", // anilha (bumper vermelho)
  f: "#3a302a", // chão
  w: "#6b4e32", // banco
})

const W = 32, H = 28, DY = 4 // poses escritas com o chão em y = 22; DY desce tudo
const lerp = (a, b, t) => Math.round(a + (b - a) * t)
const mix = (A, B, t) => Object.fromEntries(Object.keys(A).map((k) => [k, [lerp(A[k][0], B[k][0], t), lerp(A[k][1], B[k][1], t)]]))
const at = (p) => [p[0], p[1] + DY]

function body(c, P, kit) {
  const L = (a, b, col, wd) => c.line(...at(a), ...at(b), col, wd)
  if (kit.bench) c.rect(kit.bench[0], kit.bench[1] + DY, kit.bench[2], 2, "w"), c.rect(kit.bench[0] + 1, kit.bench[1] + DY + 2, 1, 22 - kit.bench[1] - 1, "w"), c.rect(kit.bench[0] + kit.bench[2] - 2, kit.bench[1] + DY + 2, 1, 22 - kit.bench[1] - 1, "w")
  if (kit.pullbar) c.hline(4, kit.pullbar + DY, 24, "g")
  const [hx, hy] = at(P.hand)
  L(P.hip, P.knee, "p", 2), L(P.knee, P.foot, "p", 2)
  L(P.neck, P.hip, "c", 2)
  L(P.neck, P.elbow, "s", 1), L(P.elbow, P.hand, "s", 1)
  c.circ(...at(P.head), 2, "s")
  c.px(P.head[0] - 1, P.head[1] + DY - 2, "h"), c.px(P.head[0], P.head[1] + DY - 2, "h"), c.px(P.head[0] - 2, P.head[1] + DY - 1, "h")
  // Barra vista de lado = anilha redonda na mão.
  if (kit.bar) c.circ(hx, hy, 2, "G"), c.px(hx, hy, "g")
  if (kit.db) c.hline(hx - 2, hy, 5, "g"), c.rect(hx - 3, hy - 1, 2, 3, "G"), c.rect(hx + 2, hy - 1, 2, 3, "G")
}

const STAND = { foot: [14, 22], knee: [14, 17], hip: [13, 12], neck: [14, 5], head: [15, 2] }

const EXERCICIOS = {
  agachamento: [{ bar: 1 },
    { ...STAND, elbow: [10, 8], hand: [11, 5] },
    { foot: [14, 22], knee: [20, 18], hip: [11, 17], neck: [16, 10], head: [17, 7], elbow: [11, 13], hand: [13, 10] }],
  supino: [{ bar: 1, bench: [3, 15, 22] },
    { head: [5, 12], neck: [8, 13], hip: [18, 13], knee: [23, 11], foot: [25, 22], elbow: [9, 8], hand: [9, 4] },
    { head: [5, 12], neck: [8, 13], hip: [18, 13], knee: [23, 11], foot: [25, 22], elbow: [12, 12], hand: [9, 10] }],
  terra: [{ bar: 1 },
    { foot: [14, 22], knee: [18, 18], hip: [10, 14], neck: [17, 9], head: [19, 7], elbow: [17, 14], hand: [17, 19] },
    { ...STAND, elbow: [14, 9], hand: [14, 13] }],
  "remada-curvada": [{ bar: 1 },
    { foot: [14, 22], knee: [17, 18], hip: [10, 13], neck: [19, 9], head: [21, 7], elbow: [19, 14], hand: [19, 18] },
    { foot: [14, 22], knee: [17, 18], hip: [10, 13], neck: [19, 9], head: [21, 7], elbow: [13, 11], hand: [16, 14] }],
  desenvolvimento: [{ bar: 1 },
    { ...STAND, elbow: [17, 8], hand: [19, 4] },
    { ...STAND, elbow: [17, 0], hand: [17, -4] }],
  "barra-fixa": [{ pullbar: -3 },
    { foot: [12, 20], knee: [15, 16], hip: [14, 12], neck: [14, 5], head: [15, 2], elbow: [11, 1], hand: [10, -3] },
    { foot: [12, 15], knee: [16, 12], hip: [14, 8], neck: [14, 1], head: [15, -2], elbow: [9, 3], hand: [10, -3] }],
  rosca: [{ db: 1 },
    { ...STAND, elbow: [14, 9], hand: [15, 13] },
    { ...STAND, elbow: [14, 9], hand: [17, 5] }],
  flexao: [{},
    { head: [25, 13], neck: [22, 15], hip: [12, 17], knee: [8, 19], foot: [4, 21], elbow: [21, 18], hand: [22, 22] },
    { head: [25, 17], neck: [22, 19], hip: [12, 20], knee: [8, 21], foot: [4, 22], elbow: [18, 18], hand: [22, 22] }],
  afundo: [{ db: 1 },
    { ...STAND, foot: [18, 22], knee: [17, 17], elbow: [13, 9], hand: [13, 13] },
    { foot: [20, 22], knee: [21, 17], hip: [13, 16], neck: [14, 9], head: [15, 6], elbow: [13, 13], hand: [13, 17] }],
  prancha: [{},
    { head: [25, 14], neck: [22, 16], hip: [13, 17], knee: [8, 19], foot: [4, 21], elbow: [22, 22], hand: [26, 22] },
    { head: [25, 14], neck: [22, 16], hip: [13, 16], knee: [8, 19], foot: [4, 21], elbow: [22, 22], hand: [26, 22] }],
}

for (const [nome, [kit, A, B]] of Object.entries(EXERCICIOS)) {
  // 6 quadros: A → B → A, com pausa nas pontas (ida e volta suave).
  const T = [0, 0, 0.5, 1, 1, 0.5]
  anim(`exec-${nome}`, { w: W, h: H, frames: T.length, fps: 4, outline: "k" }, (c) => {
    c.hline(0, 22 + DY + 1, W, "f")
    body(c, mix(A, B, T[c.frame]), kit)
  })
}
