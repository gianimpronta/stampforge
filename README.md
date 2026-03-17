# StampForge

Sistema assistido por IA para criação de estampas temáticas. Transforma uma direção criativa de coleção em designs rastreáveis e revisáveis, estágio por estágio.

[![CI](https://github.com/gianimpronta/stampforge/actions/workflows/ci.yml/badge.svg)](https://github.com/gianimpronta/stampforge/actions/workflows/ci.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=gianimpronta_stampforge&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=gianimpronta_stampforge)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=gianimpronta_stampforge&metric=coverage)](https://sonarcloud.io/summary/new_code?id=gianimpronta_stampforge)

---

## O que é

O StampForge é um pipeline criativo estruturado — não um gerador de prompt único. Em vez de tentativa e erro, o sistema organiza a criação em 11 estágios sequenciais, onde cada etapa recebe contexto aprovado da anterior e entrega uma saída estruturada para a próxima.

**Problema resolvido:** artes genéricas, sem identidade visual, com pouca coerência entre tema e estilo, difíceis de reproduzir em escala.

**Solução:** pipeline modular com aprovação humana em cada estágio, rastreabilidade completa e prompts específicos por etapa.

---

## Pipeline de 11 Estágios

| # | Estágio | Escopo | Descrição |
|---|---|---|---|
| 01 | `collection-briefing` | Coleção | Interpreta o briefing em direção criativa estruturada |
| 02 | `game-selection` | Coleção | Seleciona universos de referência |
| 03 | `game-universe-extraction` | Coleção | Extrai elementos visuais dos universos |
| 04 | `design-concept` | Item | Define o conceito central do design |
| 05 | `theme-definition` | Item | Expande o conceito em tema narrativo |
| 06 | `visual-style-definition` | Item | Define estilo visual completo |
| 07 | `copy-generation` | Item | Gera textos e slogans |
| 08 | `shirt-composition-definition` | Item | Define composição física na camiseta |
| 09 | `production-constraints-definition` | Item | Define restrições técnicas de produção |
| 10 | `master-prompt-assembly` | Item | Sintetiza todos os outputs em prompt otimizado |
| 11 | `visual-variation-generation` | Item | Gera variações visuais via IA |

> Estágios de coleção (`01-03`) compartilham contexto entre todos os itens da coleção.
> Estágios de item (`04-11`) são independentes por design item.

---

## Stack Técnica

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 16, React 19, shadcn/ui, Tailwind CSS |
| Backend | Node.js, TypeScript |
| Banco de dados | PostgreSQL 17 |
| Fila | Redis + BullMQ |
| IA — texto | Google Gemini (via `@google/generative-ai`) |
| IA — imagem | Pollinations (sem API key) / Gemini Imagen |
| Containers | Docker Compose |

---

## Início Rápido

### Pré-requisitos

- Docker e Docker Compose
- Node.js 20+
- (Opcional) Chave da API Gemini para usar o LLM real

### 1. Configurar ambiente

```bash
cp .env.example .env
# editar .env e adicionar GEMINI_API_KEY se necessário
```

Sem `GEMINI_API_KEY`, o sistema usa um provider stub que retorna respostas simuladas — útil para desenvolvimento local.

### 2. Subir os serviços

```bash
docker compose up
```

Isso inicia automaticamente:
- `postgres` — banco de dados
- `redis` — fila de jobs
- `migrate` — roda as migrations
- `app` — Next.js em `http://localhost:3000`
- `worker` — consumidor de jobs BullMQ

### 3. Acessar

Abrir `http://localhost:3000` e criar uma coleção.

---

## Desenvolvimento Local (sem Docker)

```bash
# Instalar dependências
npm install

# Subir apenas os serviços de infra
docker compose up postgres redis -d

# Copiar e editar .env
cp .env.example .env
# Alterar hosts para localhost:
# DATABASE_URL=postgresql://stampforge:stampforge@localhost:5432/stampforge
# REDIS_URL=redis://localhost:6379

# Rodar migration
npm run migrate

# Iniciar app e worker em terminais separados
npm run dev
npm run dev:worker
```

---

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | ✅ | URL de conexão PostgreSQL |
| `REDIS_URL` | ✅ | URL de conexão Redis |
| `NEXT_PUBLIC_APP_URL` | ✅ | URL pública da aplicação |
| `GEMINI_API_KEY` | ❌ | Chave Gemini (sem ela, usa stub) |
| `GEMINI_TEXT_MODEL` | ❌ | Modelo de texto (padrão: `gemini-2.5-flash-lite`) |
| `GEMINI_IMAGE_MODEL` | ❌ | Modelo de imagem (padrão: `imagen-4.0-generate-001`) |

---

## Testes

```bash
# Testes unitários e de integração (82 testes)
npm test

# Testes com relatório de cobertura
npm run test:coverage

# Testes E2E (requer servidor rodando + postgres + redis)
npm run test:e2e
```

### Estrutura de testes

```
tests/
├── domain/          # Regras de domínio, elegibilidade, aprovação
├── application/     # Casos de uso, rastreabilidade de imagens
├── integration/     # Repositórios, providers, schema DB
└── e2e/             # Playwright — fluxo completo da pipeline
```

---

## Scripts Disponíveis

| Script | Descrição |
|---|---|
| `npm run dev` | Next.js em modo desenvolvimento |
| `npm run dev:worker` | Worker BullMQ com hot-reload |
| `npm run build` | Build de produção Next.js |
| `npm start` | Servidor de produção |
| `npm run worker` | Worker BullMQ (produção) |
| `npm run migrate` | Executa migrations do banco |
| `npm run type-check` | Verificação de tipos TypeScript |
| `npm run lint` | ESLint |
| `npm test` | Testes Vitest |
| `npm run test:coverage` | Testes com cobertura (lcov + html) |
| `npm run test:e2e` | Testes Playwright E2E |

---

## Arquitetura

O sistema é um **monólito modular** com as seguintes camadas:

```
src/
├── app/              # Next.js App Router — páginas e rotas de API
├── components/       # UI components (shadcn/ui + específicos)
├── domain/           # Entidades, regras de negócio, interfaces
├── application/      # Casos de uso (orquestração)
├── infrastructure/   # DB, providers de IA, storage
├── server/           # Jobs BullMQ, worker, config
└── lib/              # Utilitários e injeção de dependências
```

**Princípios arquiteturais:**
- `PipelineStage` (definição estática) é separado de `StageExecution` (registro histórico)
- `completed` ≠ `approved` — aprovação humana é explícita e obrigatória
- Downstream stages só executam se o upstream estiver `approved`
- Todo output é salvo como snapshot imutável no banco
- Imagens geradas referenciam a `StageExecution` exata que as produziu

---

## CI/CD

A pipeline roda no GitHub Actions com os seguintes jobs:

| Job | Quando | O que faz |
|---|---|---|
| `build` | push/PR | type-check + next build + npm audit |
| `lint` | push/PR | ESLint (next/core-web-vitals) |
| `test` | push/PR | Vitest + coverage (lcov) |
| `security` | push/PR | TruffleHog secret scanning |
| `commitlint` | PR | Valida mensagens de commit |
| `e2e` | push/PR | Playwright (requer build+lint+test+security) |
| `sonar` | push/PR | SonarCloud quality gate (requer test) |
| `codeql` | push/PR/semanal | SAST CodeQL |
| `release` | push de tag `v*` | Cria GitHub Release com changelog |
| `docker` | push de tag `v*` | Build + push ghcr.io com tags versionadas |

**Dependabot** cria PRs automáticos às segundas-feiras para dependências npm e GitHub Actions.

---

## Contribuindo

1. Sincronize com `main`
2. Crie um branch: `feat/minha-feature`, `fix/meu-bug`, `chore/tarefa`
3. Escreva testes para a mudança
4. Use commits convencionais: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`
5. Abra um PR — a pipeline valida automaticamente

Consulte [`docs/git-workflow.md`](./docs/git-workflow.md) para o modelo de branches, ciclo de trabalho e política de releases.
