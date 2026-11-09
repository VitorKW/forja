// Personagem do Forja, desenhado com a skill pxl (pixel art como código).
// Todas as camadas têm o mesmo tamanho (32 × 36 + contorno) para o app empilhá-las.
// Gerar: node ~/.claude/skills/pxl-pixel-art/bin/pxl.js build art/personagem.px.js

pal({
  k: "#17120f",
  // pele
  S: "#b8775a", s: "#e8b48a", z: "#f7d2b0",
  // cabelo curto (castanho escuro) e longo (ruivo)
  H: "#2e1a0f", h: "#4a2c1a", j: "#6e452b",
  Q: "#6e3418", q: "#a2522a", J: "#cf7a40",
  // olhos
  e: "#2a1d3a", w: "#fff6e0",
  // camiseta (a: cinza-azulada, b: roxa)
  C: "#363f4c", c: "#4d5868", v: "#6a7a8e",
  M: "#4f3060", m: "#7a4d86", V: "#a374b0",
  // calça, bota, cinto
  P: "#1d2128", p: "#2c323c", i: "#414a58",
  B: "#3b2719", b: "#5a3d2a", n: "#7d5a3e",
  T: "#54381f", t: "#7a5230", g: "#f2c14e",
  // equipamento: desenhado em couro (L l o) e recolorido por material
  L: "#5e3b24", l: "#8a5a3b", o: "#c08d60",
  A: "#5f6773", a: "#a7afb9", x: "#eef1f4",
  F: "#9c2c17", f: "#ef6a1f", y: "#fdd98a",
  G: "#9a6d17", u: "#f2c14e", U: "#fff3c4",
})
ramps("kSsz", "kHhj", "kQqJ", "kCcv", "kMmV", "kPpi", "kBbn", "kLlo", "kAax", "kFfy", "kGuU")

const W = 32, H = 36, TOP = 3 // 3 linhas livres no topo para a coroa

// Desenha uma grade (metade esquerda, 16 colunas) a partir da linha `row` do corpo.
const at = (row, rows) => grid(0, row + TOP, rows.join("\n"))
const opts = { w: W, h: H, mx: true, outline: "k" }

// ---------- Corpo ----------
const HEAD = [
  "..........hhhhhh",
  "........hhhhhhhh",
  ".......hhhjjhhhh",
  "......hhhjjhhhhh",
  "......hhhhhhhhhh",
  ".....hhhhhhhhhhh",
  ".....hhhhsssssss",
  ".....hhhsssssss",
  ".....hhsssssewss",
  ".....hhsssssests",
  ".....hSssssssss",
  "......SssssssssS",
  ".......SSsssssss",
  "..........SSSSSS",
  ".............Sss",
]
// 'ests' na linha 9 não é texto: e = olho, t... ajustado abaixo
HEAD[8] = ".....hhsssssewss"
HEAD[9] = ".....hhssssseess"
HEAD[7] = ".....hhsssssssss"
HEAD[10] = ".....hSsssssssss"

const TORSO = [
  "........cccccccc",
  "......vccccccccc",
  ".....vccCccccccc",
  ".....vccCccccccc",
  ".....cccCccccccc",
  ".....SssCccccccc",
  ".....SssCccccccc",
  ".....SssCtttttttg",
  "......zs.ppppppp",
  ".........ppppppp",
  ".........ippppp.",
  ".........ippppp.",
  ".........ippppP.",
  ".........ippppP.",
  ".........ippppP.",
  "........nbbbbbB.",
  "........bbbbbbB.",
  "........BBBBBBB.",
]
TORSO[7] = ".....SssCttttttg"

const LONG_HAIR = [
  "....Hhh",
  "....Hhh",
  "....Hhh",
  "....Hhh",
  "....Hhh",
  "....Hhh",
  "....Hhh",
  "....Hhh",
  "....Hh",
  "....Hh",
  "....H",
]

sprite("_corpo", opts, at(0, HEAD), at(15, TORSO))

sprite("corpo_a", { base: "_corpo" })
sprite("_corpo_b", { w: W, h: H, mx: true, outline: "k" },
  at(6, LONG_HAIR), at(0, HEAD), at(15, TORSO))
// cabelo ruivo e camiseta roxa para o visual "b"
sprite("corpo_b", { base: "_corpo_b", swap: { H: "Q", h: "q", j: "J", C: "M", c: "m", v: "V" } })

// ---------- Equipamento (desenhado em couro) ----------
const CAPA = [
  ".....lllllllllll",
  ".....lllllllllll",
  "....Llllllllllll",
  "....Llllllllllll",
  "...Lllllllllllll",
  "...Lllllllllllll",
  "...Lllllllllllll",
  "..Llllllllllllll",
  "..Llllllllllllll",
  "..Llllllllllllll",
  "..Llllllllllllll",
  ".Lllllllllllllll",
  ".Lllllllllllllll",
  ".Lllllllllllllll",
  ".LLlllllllllllll",
  ".LLLLLLLLLLLLLLL",
]
const PEITORAL = [
  ".........ooolllo",
  ".........olllllo",
  ".........lllllll",
  ".........lllllll",
  ".........Llllllo",
  ".........LLLLLLL",
]
const OMBREIRAS = [
  "......oooll.....",
  ".....oolllll....",
  "....ollllllL....",
  "....LlllllLL....",
  ".....LLLLLL.....",
]
const MANOPLAS = [
  "....olll",
  "....llll",
  "....Llll",
  "....LllL",
  ".....LL",
]
const GREVAS = [
  ".........olllll.",
  ".........llllll.",
  ".........llllll.",
  ".........LllllL.",
  "........olllllL.",
  "........llllllL.",
  "........LLLLLLL.",
]
const ELMO = [
  "..........oooooo",
  "........ooolllll",
  ".......oollllll",
  "......olllllllll",
  "......llllllllll",
  ".....Lllllllllll",
  ".....LLLLLLLLLLL",
  ".....Ll........L",
  ".....Ll........L",
  ".....Ll........L",
  "......L",
]
ELMO[2] = ".......oolllllll"
const COROA = [
  "..........u...uu",
  "..........uu.uuu",
  "..........uuuuuu",
  "..........GGGGGU",
]

const PECAS = {
  capa: [16, CAPA],
  peitoral: [15, PEITORAL],
  ombreiras: [14, OMBREIRAS],
  manoplas: [20, MANOPLAS],
  grevas: [26, GREVAS],
  elmo: [-1, ELMO],
}
const MATERIAIS = {
  couro: {},
  aco: { L: "A", l: "a", o: "x" },
  brasa: { L: "F", l: "f", o: "y" },
  ouro: { L: "G", l: "u", o: "U" },
}
for (const [peca, [row, rows]] of Object.entries(PECAS)) {
  sprite("_" + peca, opts, at(row, rows))
  for (const [mat, swap] of Object.entries(MATERIAIS)) sprite(`${peca}_${mat}`, { base: "_" + peca, swap })
}
sprite("coroa", { w: W, h: H, mx: true, outline: "k" }, grid(0, 0, COROA.join("\n")), glow("uU", { r: 3, strength: 0.4 }))

// ---------- Loja: capas cosméticas ----------
pal({
  1: "#6e1022", 2: "#c0203e", 3: "#ff6b82", // rubi
  4: "#16306e", 5: "#2f62c8", 6: "#7fb0ff", // safira
  7: "#0f5a3a", 8: "#22a066", 9: "#7ee8b0", // esmeralda
  D: "#3e1a5e", d: "#7a3db0", E: "#c79bf0", // ametista
  K: "#7a2e4a", I: "#e0708f", O: "#ffd1a8", // dupla: rosa e dourado
})
const CAPAS = {
  rubi: { L: "1", l: "2", o: "3" },
  safira: { L: "4", l: "5", o: "6" },
  esmeralda: { L: "7", l: "8", o: "9" },
  ametista: { L: "D", l: "d", o: "E" },
  dupla: { L: "K", l: "I", o: "O" },
}
for (const [nome, swap] of Object.entries(CAPAS)) sprite(`capa_${nome}`, { base: "_capa", swap })

// ---------- Loja: bichinhos (16 × 14, de frente, espelhados) ----------
const PETS = {
  slime: [
    "......8",
    "....888",
    "...9888",
    "..99888",
    ".898888",
    ".88e888",
    ".88e888",
    "8888888",
    "7888888",
    "7788888",
    ".777777",
  ],
  gato: [
    ".q.....",
    ".qq....",
    ".qJqqqq",
    ".qJJJJJ",
    ".JJewJJ",
    ".JJeeJJ",
    "..JJJJS",
    "..qJJJJ",
    ".qqJJJz",
    "qqJJJJz",
    "qqJJJJz",
    ".qqqqqq",
  ],
  dragao: [
    "..x....",
    "..xF...",
    ".Ffffff",
    "Ffffffy",
    "ffewfff",
    "ffeefff",
    "Ffffffm",
    ".Fffyyy",
    "FFffyyy",
    "FFFfyyy",
    ".FFffyy",
    "..FF.FF",
  ],
}
for (const [nome, rows] of Object.entries(PETS))
  sprite(`pet_${nome}`, { w: 14, h: 12, mx: true, outline: "k" }, grid(0, 0, rows.join("\n")))

scene("previa_loja", { w: 5 * 36 + 3 * 18, h: 40, bg: "#272a2f" },
  ...Object.keys(CAPAS).flatMap((nome, i) => [stamp(`capa_${nome}`, i * 36, 0), stamp("corpo_a", i * 36, 0)]),
  ...Object.keys(PETS).map((nome, i) => stamp(`pet_${nome}`, 180 + i * 18, 20)))

// Prévia: personagem completo em alguns estágios
scene("previa", { w: 4 * 36, h: 40, bg: "#272a2f" },
  stamp("corpo_a", 0, 0),
  stamp("capa_couro", 36, 0), stamp("corpo_a", 36, 0), stamp("peitoral_couro", 36, 0), stamp("ombreiras_couro", 36, 0),
  stamp("capa_aco", 72, 0), stamp("corpo_b", 72, 0), stamp("peitoral_aco", 72, 0), stamp("ombreiras_aco", 72, 0),
  stamp("manoplas_aco", 72, 0), stamp("grevas_aco", 72, 0),
  stamp("capa_brasa", 108, 0), stamp("corpo_a", 108, 0), stamp("peitoral_ouro", 108, 0), stamp("ombreiras_brasa", 108, 0),
  stamp("manoplas_ouro", 108, 0), stamp("grevas_brasa", 108, 0), stamp("elmo_ouro", 108, 0), stamp("coroa", 108, 0))
