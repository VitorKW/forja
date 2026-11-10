import { useEffect, useState } from 'react';
import { colorMap, recolorPixels, type Appearance } from '../game/appearance';
import type { Look } from '../store';

const plain = (look: Look) => `${import.meta.env.BASE_URL}sprites/corpo_${look}.png`;
const cache = new Map<string, Promise<string>>();

/** URL do corpo com as cores escolhidas (data URL gerada uma vez e guardada). */
export function bodyUrl(look: Look, a: Appearance = {}): Promise<string> {
  const map = colorMap(look, a);
  if (!Object.keys(map).length) return Promise.resolve(plain(look));
  const key = look + JSON.stringify(map);
  let p = cache.get(key);
  if (!p) {
    p = new Promise<string>((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const c = document.createElement('canvas');
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          const ctx = c.getContext('2d')!;
          ctx.drawImage(img, 0, 0);
          const d = ctx.getImageData(0, 0, c.width, c.height);
          recolorPixels(d.data, map);
          ctx.putImageData(d, 0, 0);
          resolve(c.toDataURL('image/png'));
        } catch {
          resolve(plain(look));
        }
      };
      img.onerror = () => resolve(plain(look));
      img.src = plain(look);
    });
    cache.set(key, p);
  }
  return p;
}

/** Hook: começa com o corpo padrão e troca quando a versão colorida fica pronta. */
export function useBodyUrl(look: Look, a: Appearance = {}): string {
  const key = JSON.stringify(a);
  const [url, setUrl] = useState(() => (Object.keys(colorMap(look, a)).length ? '' : plain(look)));
  useEffect(() => {
    let alive = true;
    bodyUrl(look, a).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [look, key]);
  return url;
}
