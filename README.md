# 🔥 Forja

**Um app de treino em que cada série vira XP.** Você registra o treino, seu personagem em pixel art ganha nível e equipamento, e os chefes são os seus próprios recordes. Em dupla, o casal enfrenta chefes juntos, aposta, compete por temporada e acompanha o treino do outro ao vivo.

▶️ **Experimente:** https://vitorkw.github.io/forja/. Na primeira tela, toque em *"Só quero ver como é"* para abrir com dez semanas de dados de exemplo.

Projeto pessoal de Vitor Wessler (Engenharia de Computação + Educação Física). Uso o app todo dia com minha namorada; ele nasceu de um problema real: a gente parava de treinar quando a motivação acabava.

---

## O que ele faz

| | |
|---|---|
| **Treino** | Registro de séries com carga, reps e RIR; timer de descanso que sobrevive à tela bloqueada; sugestão de carga por dupla progressão |
| **Programa periodizado** | Bloco de 6 ou 8 semanas montado pela frequência (full body, superior/inferior, PPL), com RIR alvo caindo de 3 para 1, volume subindo na segunda metade e deload no fim |
| **Progressão de jogo** | XP, nível, 5 atributos (empurrar, puxar, pernas, core, fôlego) que equipam o personagem, conquistas, chefes = recordes pessoais |
| **Hábitos** | Missões diárias personalizáveis; dieta leve (proteína, água, calorias) que marca missões sozinha |
| **Em dupla** | Chefe semanal com o XP dos dois, sequência do casal, desafio da semana, treino junto (bônus), apostas valendo moedas, temporadas trimestrais, calendário do ano, treino ao vivo com incentivo na hora |
| **Social sem servidor pago** | Sincronização entre celulares (Firestore) e notificações push (Cloudflare Workers), tudo no plano grátis |
| **Retrospectiva** | Resumo do mês com recordes e uma imagem gerada em canvas para compartilhar |

## Decisões técnicas

### 1. O progresso nunca é salvo, é recalculado
XP, níveis, chefes, moedas, temporadas e apostas são **funções puras do histórico** (`computeProgress`, `computeDuo`, `computeSeasons`, `computeBets`...). O que fica salvo são só os fatos: treinos, missões, compras, respostas.
- Apagar um treino antigo recalcula tudo de forma consistente.
- Mudar uma regra de balanceamento vale também para o passado.
- As regras são testáveis sem React: entra uma lista de treinos, sai o progresso.

### 2. Sincronização sem conflito, no plano grátis
Cada celular só escreve no **próprio** perfil. Treinos são somados (com "lápides" para apagados); dados do perfil seguem a regra "vence o mais recente". Até as apostas seguem esse modelo: quem propõe guarda a aposta, quem responde guarda a resposta, e o resultado é derivado. Assim nunca dois celulares disputam o mesmo documento.

### 3. Web Push escrito do zero
O servidor de notificações (`push/`) roda no Cloudflare Workers sem bibliotecas: a criptografia da mensagem (RFC 8291, aes128gcm) e a assinatura VAPID (RFC 8292, JWT ES256) usam só WebCrypto, e funcionam com os servidores de push da Apple e do Google. O app manda um resumo do dia só quando ele muda, para caber nas 1000 gravações diárias do plano grátis.

### 4. Ciência do treino como regra de código
A periodização (`src/game/program.ts`) traduz a literatura em regras computáveis:
- **Hipertrofia:** 6–15 reps, RIR 1–3, ~10–20 séries semanais por grupo.
- **Força:** a faixa de reps dos multiarticulares cai por fase (5–6 → 4–5 → 2–4).
- **Deload:** metade do volume, RIR 4, carga −10%.
- **Carga do dia:** dupla progressão. Bateu o topo da faixa com o RIR pedido em todas as séries? Sobe 2,5 kg (5 kg em multiarticular de pernas) e volta ao piso.
- **Fadiga:** mais de 20 séries semanais num atributo e o XP cai pela metade, para o jogo não premiar excesso de volume.

### 5. Pixel art como código
Personagem, 12 chefes, capas e pets são gerados por código (DSL da skill pxl) em `art/*.px.js`. Equipamento novo é uma camada nova, não um desenho novo.

## Stack

React 18 · TypeScript · Vite · Zustand · motion · PWA (offline, instalável no iPhone) · Firebase Firestore · Cloudflare Workers + KV · Vitest · GitHub Actions + Pages

## Rodando

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # regras do jogo, periodização, apostas, lembretes
npm run build    # build de produção com service worker
```

Servidor de notificações: veja [push/README.md](push/README.md).

## Estrutura

```
src/
  game/            regras: funções puras, sem React, testadas
    rules.ts         XP, níveis, fadiga, constância, chefes (computeProgress)
    program.ts       periodização e carga do dia
    duo.ts           chefe da semana, sequência do casal, desafio, treino junto
    bets.ts          apostas
    season.ts        temporadas
    diet.ts          dieta e missões automáticas
    extras.ts        missões e incentivos
    recap.ts         retrospectiva do mês
  store.ts         estado (Zustand) persistido: só fatos, nunca progresso
  useProgress.ts   recalcula tudo a partir do histórico (memoizado)
  sync.ts          sincronização Firestore
  push.ts          notificações (cliente)
  demo.ts          dados de exemplo do modo demonstração
  screens/         Forja, Dupla, Dieta, Chefes, Perfil, Treino, Resumo, Retrospectiva
push/              servidor de notificações (Cloudflare Worker)
art/               pixel art em código
```

O design de jogo completo está em [GDD.md](GDD.md) e o visual em [DESIGN.md](DESIGN.md).

## Aviso

As sugestões de treino seguem referências gerais da literatura e não substituem um profissional. Dor ou lesão pedem avaliação.

## Pixel art (rebuild)

```bash
node ~/.claude/skills/pxl-pixel-art/bin/pxl.js build art/personagem.px.js --out art/out/personagem
node ~/.claude/skills/pxl-pixel-art/bin/pxl.js build art/chefes.px.js --out art/out/chefes
cp art/out/personagem/sprites/*.png art/out/chefes/sprites/*.png public/sprites/
```
