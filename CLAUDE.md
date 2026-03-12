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

Prefer a small, linear workflow:

1. sync with `main`
2. create or switch to a focused working branch
3. implement one task or a small coherent slice
4. run the narrowest relevant tests first
5. commit
6. repeat
7. run broader verification before merging

Recommended branch naming:

- `feat/<topic>`
- `fix/<topic>`
- `chore/<topic>`
- `docs/<topic>`

Examples:

- `feat/pipeline-domain`
- `feat/stage-approval-api`
- `fix/stage-eligibility-rule`

## Commit Best Practices

Commits should be:

- small
- focused
- reversible
- easy to review

Prefer one logical change per commit. Do not mix unrelated refactors, formatting churn, and feature work in the same commit.

Recommended commit style:

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
