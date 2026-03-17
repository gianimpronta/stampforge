# Deploy Options

Opções avaliadas para hospedagem do StampForge (app + worker + PostgreSQL + Redis).

## Comparativo

| Plataforma | Custo/mês | PostgreSQL | Redis | Worker ativo | Observação |
|---|---|---|---|---|---|
| **Hetzner CX22** | ~€4 | Self-managed | Self-managed | Sim | Docker Compose direto; mais controle |
| **Fly.io** | ~$0–10 | Pago (sem free) | Upstash free (10k req/dia) | Sim (dorme no free) | Pago por uso |
| **Railway** | ~$5–15 | Gerenciado incluso | Gerenciado incluso | Sim | Deploy via Docker Compose |
| **Render** | ~$7–21 | Gerenciado incluso | Gerenciado incluso | Sim | Cada serviço cobrado separado |

## Opção 100% gratuita (com limitações)

| Serviço | Plataforma | Limitação |
|---|---|---|
| Next.js app | Vercel (free) | Serverless, sem estado local |
| Worker | Fly.io (free) | 256MB RAM, dorme após inatividade |
| PostgreSQL | Supabase (free) | 500MB, pausa após 1 semana inativo |
| Redis | Upstash (free) | 10k req/dia, 256MB |

**Problema:** worker precisa ficar ativo para consumir a fila. Em free tier ele dorme — jobs ficam presos.

## Recomendação

- **Mais barato viável:** Hetzner CX22 a €4/mês — tudo roda junto com Docker Compose, sem surpresas de faturamento
- **Mais simples de operar:** Railway — deploy do Docker Compose sem configuração de servidor
- **Free tier:** não recomendado para produção com worker ativo

## Vercel

Suporte parcial — requer mudança de arquitetura para o worker.

| Serviço | Suporte | Observação |
|---|---|---|
| Next.js app | Sim | Vercel é o criador do Next.js |
| API routes | Sim | Serverless functions nativas |
| Worker (BullMQ) | **Não** | Processo contínuo — não suportado |
| PostgreSQL | Não incluso | Neon (parceiro oficial, free tier) |
| Redis | Não incluso | Upstash (parceiro oficial, free tier) |

**Alternativa viável mas com trade-offs:** substituir BullMQ + worker por Upstash QStash (fila HTTP serverless) + Vercel Cron Jobs.

```
atual:  BullMQ queue → worker contínuo → processa job
vercel: QStash queue → Vercel Cron/webhook → serverless function processa job
```

Trade-offs dessa abordagem:
- Latência maior entre jobs (mínimo 1 minuto no cron gratuito)
- Limite de 60s de execução por função (Pro) — problema em jobs de geração de imagem
- Reescrita do worker como API route e substituição do BullMQ

**Conclusão:** não recomendado para V1. Exige refatorar a camada de jobs fora da arquitetura aprovada. Pode ser reavaliado futuramente para isolar só o frontend na Vercel com o worker em outro serviço.

## Netlify

Não recomendado para este stack.

| Serviço | Suporte | Observação |
|---|---|---|
| Next.js app | Sim | Suporte nativo |
| API routes | Sim | Viram serverless functions |
| Worker (BullMQ) | **Não** | Processo contínuo — Netlify só suporta functions com até 26s de execução |
| PostgreSQL | Não incluso | Externo (Supabase, Neon) |
| Redis | Não incluso | Externo (Upstash) |

**Bloqueador:** o worker precisa ficar ativo escutando a fila. Netlify não suporta processos persistentes. Sem worker, nenhum job de pipeline é processado.

Seria viável apenas se o worker fosse convertido para polling via Netlify Scheduled Functions — o que mudaria a arquitetura aprovada (BullMQ + worker contínuo) e introduziria latência nos jobs.

## Decisão

> A definir.
