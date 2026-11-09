/** Recompensas reais que o casal combina (jantar, cinema…) e resgata com moedas. */
export interface Reward {
  id: string;
  name: string;
  cost: number;
  createdAt: string;
  /** Apagada: some da lista, mas resgates antigos continuam valendo. */
  deleted?: boolean;
}

export interface Redemption {
  id: string;
  rewardId: string;
  /** Nome e preço do momento (mudar a recompensa não muda o passado). */
  name: string;
  cost: number;
  at: string;
}

export const REWARD_IDEAS = [
  { name: 'Jantar fora', cost: 800 },
  { name: 'Cinema', cost: 500 },
  { name: 'Massagem', cost: 400 },
  { name: 'Escolher o filme da noite', cost: 150 },
  { name: 'Café da manhã na cama', cost: 250 },
];

export const REWARD_COST = { min: 50, max: 5000 } as const;

/** Lista do casal: as recompensas criadas pelos dois, sem as apagadas, da mais barata à mais cara. */
export function rewardCatalog(...lists: (Reward[] | undefined)[]): Reward[] {
  const seen = new Map<string, Reward>();
  for (const r of lists.flatMap((l) => l ?? [])) seen.set(r.id, r);
  return [...seen.values()].filter((r) => !r.deleted).sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));
}

/** Resgates dos dois, do mais novo ao mais antigo, com quem resgatou. */
export function redemptionFeed(people: { name: string; redeemed?: Redemption[] }[]): (Redemption & { by: string })[] {
  return people.flatMap((p) => (p.redeemed ?? []).map((r) => ({ ...r, by: p.name }))).sort((a, b) => b.at.localeCompare(a.at));
}
