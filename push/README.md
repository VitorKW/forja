# forja-push

Servidor de notificações do Forja, no plano grátis do Cloudflare Workers.

- `POST /subscribe`, `/unsubscribe`: guarda a inscrição de push de uma pessoa (grupo + perfil 0/1).
- `POST /status`: o app manda o resumo do dia (treinou? quantas missões faltam? quanto falta na semana?).
- `POST /notify`: avisa o par (treino concluído, incentivo, aposta).
- `POST /test`: notificação de teste.
- Cron `0 23 * * *` (20h em Brasília): lembrete para quem tem treino ou missão em aberto.

A criptografia do Web Push (RFC 8291) e o VAPID (RFC 8292) estão em `src/webpush.ts`, só com WebCrypto.

## Publicar

```bash
cd push
npm install
npx wrangler login
npx wrangler kv namespace create FORJA        # copie o id para wrangler.toml
npx wrangler secret put VAPID_PRIVATE_JWK     # cole o valor de .dev.vars (sem as aspas)
npx wrangler deploy
```

Depois, coloque o endereço publicado em `PUSH_URL` (`src/push.ts`) e publique o app.

A chave privada VAPID fica só em `push/.dev.vars` (fora do git) e no segredo do Cloudflare.
Se ela se perder, gere outro par: a pública vai em `wrangler.toml` e em `src/push.ts`, e todo mundo
precisa religar os lembretes.

Limites do plano grátis que importam aqui: 100 mil requisições e 1000 gravações no KV por dia.
O app só manda o resumo quando ele muda, e o servidor só grava se mudou.
