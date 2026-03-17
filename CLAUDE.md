# CLAUDE.md

## Project

StampForge is an AI-assisted system for creating themed print designs, starting with t-shirts.

The product is designed as a structured creative pipeline, not a single prompt generator. The system should help transform a collection-level creative direction into traceable, reviewable design outputs.

## Current Product Direction

The current approved V1 direction is:

- modular monolith
- asynchronous background jobs
- manual, per-stage execution
- explicit approval or rejection at every stage
- strong traceability from each generated image back to the exact execution that produced it
- lightweight operational web UI

Primary root entity:

- `Collection`

Each collection contains derived:

- `DesignItem`

## Official V1 Pipeline

1. `collection-briefing`
2. `game-selection`
3. `game-universe-extraction`
4. `design-concept`
5. `theme-definition`
6. `visual-style-definition`
7. `copy-generation`
8. `shirt-composition-definition`
9. `production-constraints-definition`
10. `master-prompt-assembly`
11. `visual-variation-generation`

## Core Domain Rules

- Keep `PipelineStage` separate from `StageExecution`
- A stage definition is static; executions are historical records
- Every stage can be run independently on demand
- The system must be able to stop at any stage and resume later
- Downstream stages depend on upstream `approved` executions, not merely `completed` ones
- `completed` means technical success
- `approved` means human acceptance
- `rejected` means technically valid but not accepted
- Generated images must reference the exact `StageExecution` that produced them
- Historical reconstruction must rely on stored snapshots, not current mutable state

## Architecture

The approved architecture is a modular monolith with these main areas:

- `Collections`
- `Design Items`
- `Pipeline`
- `Generation`
- `Assets & Traceability`

Execution model:

- web app handles UI and API
- worker handles background jobs
- PostgreSQL stores relational state and JSON snapshots
- Redis backs the job queue
- local disk-backed storage is acceptable initially

## Frontend Stack

Use:

- `Next.js`
- `shadcn/ui`
- `Tailwind CSS`

The UI should be an operational console, not a design editor.

Prefer:

- App Router
- server-rendered page shells where useful
- client components only for interactive controls
- reusable `shadcn/ui` primitives for cards, dialogs, tables, tabs, buttons, badges, and forms

## Backend / Infra Stack

Use:

- `TypeScript`
- `Node.js`
- `PostgreSQL`
- `Redis`
- `Docker Compose`

The application should run locally in containers with separate services for:

- `app`
- `worker`
- `postgres`
- `redis`

## Implementation Priorities

Build in this order:

1. containerized runtime
2. core domain entities
3. stage catalog and eligibility rules
4. approval and rejection flow
5. persistence layer
6. queue and worker orchestration
7. provider interfaces
8. API
9. operational UI
10. end-to-end hardening

## Testing Expectations

Cover at least:

- domain rules
- stage dependency logic
- approval/rejection flow
- persistence of stage snapshots
- background execution flow
- image traceability
- end-to-end flow through the containerized stack

Preferred layers:

- unit/domain tests
- application tests
- integration tests
- Playwright end-to-end tests

## Git Workflow

The project uses GitHub Flow with squash merges. Full details in `docs/git-workflow.md`.

Branch naming:

- `feat/<topic>` — new functionality
- `fix/<topic>` — bug fixes
- `chore/<topic>` — infra, config, tooling
- `docs/<topic>` — documentation
- `test/<topic>` — isolated tests
- `claude/<topic>` — AI-generated branches

Cycle per task:

1. create issue → assign to milestone → move to Todo in Project
2. `gh issue develop <n> --checkout` to create the branch
3. implement in small focused commits
4. `gh pr create --fill` with `Closes #<n>` in the body
5. CI passes → squash merge → branch and issue closed automatically

`main` is always stable. Push directly to `main` is blocked by branch protection.

## Commit Best Practices

Commits should be small, focused, reversible, and easy to review. One logical change per commit.

Use Conventional Commits (enforced by commitlint in CI):

- `feat: ...`
- `fix: ...`
- `chore: ...`
- `docs: ...`
- `test: ...`
- `refactor: ...`

Examples:

- `feat: add pipeline stage catalog`
- `feat: add stage approval and rejection flow`
- `fix: require approved dependencies before stage execution`
- `test: cover image traceability flow`
- `docs: update frontend stack decisions`

Commit checkpoints should usually happen after:

- a failing test is added
- the minimal implementation passes
- a small vertical slice is working
- docs/spec/plan changes are complete

Before committing:

- verify only intended files are staged
- run the most relevant tests for the change
- make sure the commit message matches the actual scope

## Releases

Releases are triggered by semver tags on `main`:

| Milestone | Tag |
|---|---|
| v1-infra | `v0.1.0` |
| v1-domain | `v0.2.0` |
| v1-pipeline | `v0.3.0` |
| v1-ui | `v1.0.0` |

```bash
git tag v0.1.0
git push origin v0.1.0
```

The release workflow automatically creates a GitHub Release with changelog and publishes a versioned Docker image to GHCR.

## Project Management

Issues are tracked in GitHub Project "StampForge V1" (project #5).

Milestones:

- `v1-infra` — containerization and setup
- `v1-domain` — entities and domain rules
- `v1-pipeline` — stages and approval flow
- `v1-ui` — operational interface

Labels for issues and PRs: `pipeline`, `domain`, `infra`, `api`, `worker`, `frontend`, `test`, `chore`, `bug`, `enhancement`.

## Guardrails

- Do not collapse `PipelineStage` and `StageExecution`
- Do not auto-advance the pipeline without explicit approval gates
- Do not treat rejected output as technical failure
- Do not build a custom design system from scratch
- Do not over-generalize provider orchestration in V1
- Do not add unrelated product features before the core pipeline works

## Source of Truth

For architecture and implementation planning, use these files as the primary reference:

- `docs/superpowers/specs/2026-03-12-stampforge-architecture-design.md`
- `docs/superpowers/plans/2026-03-12-stampforge-v1-implementation.md`
- `docs/git-workflow.md`
