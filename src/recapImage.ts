/**
 * Desenha a retrospectiva num PNG 1080 × 1350 (formato de post) para compartilhar.
 * Tudo em canvas: os sprites são do próprio site, então a imagem não fica "suja".
 */

export interface RecapImageInput {
  eyebrow: string;
  title: string; // "Outubro de 2026"
  name: string;
  stats: { label: string; value: string }[];
  highlights: string[];
  /** URLs dos sprites do personagem, de trás para a frente. */
  layers: string[];
  pet?: string;
}

const W = 1080;
const H = 1350;
const DISPLAY = "'Bricolage Grotesque Variable', system-ui, sans-serif";
const BODY = "'Manrope Variable', system-ui, sans-serif";
const PIXEL = "'Pixelify Sans', ui-monospace, monospace";

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fitText(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1);
  return t + '…';
}

export async function drawRecap(input: RecapImageInput): Promise<Blob> {
  await document.fonts?.ready;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Fundo: carvão com brasa no alto.
  ctx.fillStyle = '#0d0b0a';
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, 330, 40, W / 2, 330, 620);
  glow.addColorStop(0, '#ff8a1f55');
  glow.addColorStop(0.45, '#ff4d4d1c');
  glow.addColorStop(1, '#0d0b0a00');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, '#ffd166');
  grad.addColorStop(0.5, '#ff8a1f');
  grad.addColorStop(1, '#ff4d4d');

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ff8a1f';
  ctx.font = `800 34px ${BODY}`;
  ctx.fillText(input.eyebrow.toUpperCase(), 72, 110);
  // O título fica à esquerda do personagem; diminui a fonte se não couber.
  ctx.fillStyle = '#f7f0e8';
  let size = 104;
  do {
    ctx.font = `800 ${size}px ${DISPLAY}`;
    size -= 4;
  } while (ctx.measureText(input.title).width > W - 144 - 34 * 8 - 24 && size > 48);
  ctx.fillText(input.title, 72, 206);
  ctx.fillStyle = '#9c9087';
  ctx.font = `600 40px ${BODY}`;
  ctx.fillText(input.name, 72, 256);

  // Personagem em pixels inteiros (34 × 38 × 8).
  const px = 8;
  const cw = 34 * px;
  const ch = 38 * px;
  const cx = W - 72 - cw;
  const cy = 120;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#00000066';
  ctx.beginPath();
  ctx.ellipse(cx + cw / 2, cy + ch - 6, cw * 0.36, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  const imgs = await Promise.all(input.layers.map((s) => load(s).catch(() => null)));
  for (const img of imgs) if (img) ctx.drawImage(img, cx, cy, cw, ch);
  if (input.pet) {
    const pet = await load(input.pet).catch(() => null);
    if (pet) ctx.drawImage(pet, cx - 16 * 6 + 20, cy + ch - 14 * 6, 16 * 6, 14 * 6);
  }

  // Números em grade 2 × 3.
  const top = 470;
  const gw = (W - 144 - 24) / 2;
  const gh = 150;
  input.stats.slice(0, 6).forEach((s, i) => {
    const x = 72 + (i % 2) * (gw + 24);
    const y = top + Math.floor(i / 2) * (gh + 20);
    roundRect(ctx, x, y, gw, gh, 28);
    ctx.fillStyle = '#171310';
    ctx.fill();
    ctx.strokeStyle = '#ffffff14';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = i === 0 ? grad : '#f7f0e8';
    ctx.font = `700 64px ${PIXEL}`;
    ctx.fillText(fitText(ctx, s.value, gw - 56), x + 28, y + 82);
    ctx.fillStyle = '#9c9087';
    ctx.font = `600 30px ${BODY}`;
    ctx.fillText(s.label, x + 28, y + 124);
  });

  // Destaques.
  let y = top + 3 * (gh + 20) + 40;
  ctx.font = `600 34px ${BODY}`;
  for (const h of input.highlights.slice(0, 4)) {
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(84, y - 11, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f7f0e8';
    ctx.fillText(fitText(ctx, h, W - 144 - 36), 108, y);
    y += 54;
  }

  // Rodapé.
  ctx.fillStyle = grad;
  ctx.font = `800 40px ${DISPLAY}`;
  ctx.fillText('Forja', 72, H - 64);
  ctx.fillStyle = '#6b6159';
  ctx.font = `600 28px ${BODY}`;
  ctx.textAlign = 'right';
  ctx.fillText('treino que vira jogo', W - 72, H - 66);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('canvas'))), 'image/png'));
}

/** Compartilha (iPhone: folha de compartilhar) ou baixa o arquivo. */
export async function shareImage(blob: Blob, filename: string, title: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], filename, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return 'shared';
    } catch {
      return 'cancelled';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'downloaded';
}
