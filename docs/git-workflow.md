# Git Workflow

## Branch Model

O projeto usa **GitHub Flow** simplificado — branches curtas saindo de `main`, mergeadas via PR com squash.

```
main (protegida, sempre estável)
  │
  ├── feat/pipeline-domain
  ├── feat/stage-approval-api
  ├── fix/stage-eligibility-rule
  ├── chore/docker-compose-setup
  └── claude/...
```

## Regras

| Regra | Detalhe |
|---|---|
| `main` nunca recebe push direto | Branch protection bloqueia |
| Todo trabalho em branch curta | Vida útil de 1–3 dias idealmente |
| 1 PR por tarefa/issue | `Closes #42` no corpo do PR |
| Squash merge obrigatório | Histórico linear no `main` |
| Branch deletada após merge | Automático |
| Tag `v*` dispara release | Workflow de release + Docker |

## Nomenclatura de Branches

```
feat/<topic>    → nova funcionalidade
fix/<topic>     → correção de bug
chore/<topic>   → infra, config, tooling
docs/<topic>    → documentação
test/<topic>    → testes isolados
claude/<topic>  → branches geradas por IA
```

## Ciclo de Trabalho

```
issue criada (Backlog)
  → mover para Todo
  → criar branch vinculada à issue
  → mover para In Progress
  → implementar + commits pequenos
  → abrir PR com "Closes #<issue>"
  → mover para Review
  → CI passa
  → squash merge em main
  → branch deletada automaticamente
  → issue fechada automaticamente
  → mover para Done
```

### Comandos úteis

```bash
# Criar issue
gh issue create --title "feat: pipeline domain" --label pipeline --milestone v1-domain

# Criar branch vinculada à issue
gh issue develop 42 --checkout

# Abrir PR preenchido automaticamente
gh pr create --fill

# Ver estado das issues
gh issue list --milestone v1-domain
```

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add pipeline stage catalog
fix: require approved dependencies before stage execution
chore: configure docker compose services
docs: update git workflow
test: cover image traceability flow
refactor: extract stage eligibility rules
```

O CI valida o formato das mensagens de commit via `commitlint` em cada PR.

## Releases

Releases são criados por tag semântica ao completar um milestone:

| Milestone | Tag |
|---|---|
| v1-infra | `v0.1.0` |
| v1-domain | `v0.2.0` |
| v1-pipeline | `v0.3.0` |
| v1-ui | `v1.0.0` |

```bash
# Ao concluir um milestone:
git tag v0.1.0
git push origin v0.1.0
```

O workflow de release gera automaticamente:
- GitHub Release com changelog baseado nos PRs mergeados
- Imagem Docker publicada no GHCR com tags versionadas (`v0.1.0`, `v0.1`, `v0`, `latest`)

## Versionamento

Segue [Semantic Versioning](https://semver.org/):

- **major** — mudança de contrato ou arquitetura
- **minor** — milestone completo ou feature relevante
- **patch** — bugfix em produção

## Proteção do `main`

| Configuração | Status |
|---|---|
| PR obrigatório antes de merge | Ativado |
| Aprovação de code owner | Ativado |
| Enforce para admins | Ativado |
| Force push bloqueado | Ativado |
| Squash merge only | Ativado |
| Delete branch on merge | Ativado |
| Conversation resolution | Ativado |

## Labels

| Label | Uso |
|---|---|
| `pipeline` | Stages e execução |
| `domain` | Regras e entidades core |
| `infra` | Docker, DB, Redis |
| `api` | Rotas e endpoints |
| `worker` | Background jobs e queue |
| `frontend` | UI, Next.js, shadcn |
| `test` | Testes e cobertura |
| `chore` | Manutenção e config |
| `bug` | Correção de bugs |
| `enhancement` | Novas features |
