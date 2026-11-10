import { useRef, useState } from 'react';
import { dayKey } from '../game/rules';
import { dietCsv, workoutsCsv } from '../game/csv';
import { useStore, type Profile } from '../store';

interface BackupFile {
  app: 'forja';
  version: 1;
  exportedAt: string;
  data: { profiles: Profile[]; currentId: string };
}

/** Confere se o arquivo parece um backup do Forja. */
export function parseBackup(text: string): BackupFile | null {
  try {
    const b = JSON.parse(text) as BackupFile;
    const ps = b?.data?.profiles;
    if (b?.app !== 'forja' || !Array.isArray(ps) || ps.length < 1) return null;
    if (!ps.every((p) => typeof p?.id === 'string' && typeof p?.name === 'string' && Array.isArray(p?.workouts) && p?.settings)) return null;
    return b;
  } catch {
    return null;
  }
}

async function saveFile(text: string, filename: string, type = 'application/json'): Promise<'shared' | 'downloaded'> {
  const blob = new Blob([text], { type });
  const file = new File([blob], filename, { type });
  // No iPhone a folha de compartilhar deixa salvar em Arquivos, mandar no WhatsApp etc.
  if (/iPhone|iPad|Android/.test(navigator.userAgent) && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return 'shared';
    } catch {
      /* cancelou: cai para o download */
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

export default function BackupPanel() {
  const restore = useStore((s) => s.restoreBackup);
  const input = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState<string | null>(null);

  const exportAll = async () => {
    // No modo demonstração, o backup continua sendo dos dados reais.
    const s = useStore.getState();
    const { profiles, currentId } = s.demo ?? s;
    const file: BackupFile = { app: 'forja', version: 1, exportedAt: new Date().toISOString(), data: { profiles, currentId } };
    const r = await saveFile(JSON.stringify(file), `forja-backup-${dayKey(new Date())}.json`);
    setNote(r === 'downloaded' ? 'Backup salvo nos downloads.' : 'Backup pronto.');
  };

  // Planilhas: treinos (uma linha por série) e dieta (uma linha por alimento).
  const exportCsv = async () => {
    const { profiles } = useStore.getState();
    const bom = String.fromCharCode(0xfeff); // para o Excel reconhecer os acentos
    const day = dayKey(new Date());
    await saveFile(bom + workoutsCsv(profiles), `forja-treinos-${day}.csv`, 'text/csv');
    const r = await saveFile(bom + dietCsv(profiles), `forja-dieta-${day}.csv`, 'text/csv');
    setNote(r === 'downloaded' ? 'Planilhas de treinos e dieta salvas nos downloads.' : 'Planilhas prontas.');
  };

  const importFile = async (f: File | undefined) => {
    if (!f) return;
    const b = parseBackup(await f.text());
    if (input.current) input.current.value = '';
    if (!b) return setNote('Esse arquivo não é um backup do Forja.');
    const when = new Date(b.exportedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    const total = b.data.profiles.reduce((n, p) => n + p.workouts.length, 0);
    if (!confirm(`Trocar os dados deste celular pelo backup de ${when} (${total} treinos)? O que não estiver no backup some deste celular.`)) return;
    restore(b.data);
    setNote('Backup restaurado.');
  };

  return (
    <section className="panel">
      <h2>Backup</h2>
      <p className="muted small">Um arquivo com tudo dos dois perfis: treinos, dieta, missões, compras e apostas. Guarde no Drive ou no WhatsApp de vez em quando.</p>
      <div className="backup-row">
        <button className="ghost" onClick={exportAll}>
          Exportar
        </button>
        <button className="ghost" onClick={() => input.current?.click()}>
          Importar
        </button>
      </div>
      <button className="link small" onClick={exportCsv}>
        Exportar planilhas (CSV) de treinos e dieta
      </button>
      <input ref={input} type="file" accept="application/json,.json" hidden onChange={(e) => importFile(e.target.files?.[0])} />
      {note && <p className="muted small">{note}</p>}
    </section>
  );
}
