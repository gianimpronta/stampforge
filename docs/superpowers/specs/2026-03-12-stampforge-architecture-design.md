# StampForge Architecture Design

## Context

StampForge is a modular AI-assisted system for building themed print designs, starting with t-shirts. The system should turn a collection-level creative direction into individual design items, then move each item through a fixed pipeline until it reaches image generation.

The initial product scope is intentionally narrow:

- pipeline orchestration
- visual generation
- a lightweight web interface for operational tracking

The first version is not a full creative suite. It is an operational system that lets a human run, inspect, approve, reject, and rerun each stage of the process while preserving traceability.

## Goals

- Model the design process as explicit, well-defined stages
- Allow execution of each stage independently and on demand
- Run stage work asynchronously in background jobs
- Preserve full traceability from generated image back to the exact stage execution that produced it
- Make `collection` the root context for multiple related design items
- Keep the web UI focused on visibility, control, and approval
- Package the system as a containerized local application using `docker compose`

## Non-Goals

- full autonomous pipeline progression
- advanced collaborative editing
- complex analytics dashboards
- production derivative generation in V1
- multi-provider execution in parallel
- a generalized artifact platform

## Recommended Architecture

The recommended architecture is a modular monolith with a background worker tier.

This approach balances implementation speed with strong domain boundaries. It keeps deployment simple while supporting:

- explicit stage execution
- background jobs
- traceability
- provider abstraction
- future extraction of services if needed

## High-Level Structure

The system is organized into three layers:

1. `Web App`
   Hosts the operational UI and API endpoints.

2. `Application/Core`
   Contains use cases, pipeline orchestration rules, approval logic, and execution coordination.

3. `Infrastructure`
   Contains database access, queue integration, file/image storage, and provider adapters.

Within the monolith, the main bounded contexts are:

- `Collections`
- `Design Items`
- `Pipeline`
- `Generation`
- `Assets & Traceability`

## Domain Model

### Collection

The root entity of the system.

Responsibilities:

- store the master briefing
- define collection identity
- define global constraints
- store selected games
- group derived design items

### DesignItem

Represents a single print design derived from a collection.

Responsibilities:

- inherit context from the collection
- store item-specific adjustments
- track progress through the pipeline
- reference prompt and image outputs

### PipelineStage

Static definition of a stage in the official pipeline.

Responsibilities:

- define stage key and name
- define scope (`collection` or `design_item`)
- define order
- define input schema
- define output schema
- define dependencies
- define rerun rules

This entity represents the structure of the process, not a concrete execution.

### StageExecution

A concrete execution of a `PipelineStage`.

Responsibilities:

- reference the target stage
- reference the target entity (`Collection` or `DesignItem`)
- store execution status
- store input snapshot
- store structured output
- store version
- store operator or trigger metadata
- store provider/model metadata when AI is used
- store timestamps

Multiple `StageExecution` records may exist for the same stage and same target entity. Approval determines which execution is currently valid for downstream use.

### GeneratedImage

Represents a generated image artifact.

Responsibilities:

- reference the exact generation `StageExecution`
- store the prompt used
- store generation parameters
- store provider/model
- store file location
- store basic media metadata
- store approval or rejection state

## Pipeline Definition

The official V1 pipeline is:

1. Briefing da colecao
2. Selecao de jogos
3. Extracao do universo do jogo
4. Definicao do conceito da estampa
5. Definicao de tema
6. Definicao de estilo visual
7. Geracao de copy/texto
8. Definicao de composicao para camiseta
9. Definicao de restricoes de producao
10. Montagem do prompt mestre
11. Geracao de variacoes visuais

Pipeline behavior:

- `Briefing da colecao` exists at collection scope
- downstream stages operate at design-item scope
- each stage has explicit inputs and structured outputs
- each stage can be executed independently on demand
- progression is not implicit
- the system may stop at any point and resume later from approved outputs

## Stage and Execution Semantics

`PipelineStage` and `StageExecution` must remain separate.

Reasoning:

- the stage definition is stable and auditable
- the execution history is mutable and repeatable
- reruns should not overwrite prior attempts
- the system needs to distinguish process design from process history

This separation is mandatory for traceability and operational clarity.

## Execution Model

Each stage runs asynchronously in the background, but execution is initiated manually by the user in V1.

Execution flow:

1. User selects a collection or design item
2. User triggers a specific stage
3. Backend validates required approved dependencies
4. System creates a `StageExecution`
5. System enqueues a background job
6. Worker processes the job
7. Result is persisted
8. User approves, rejects, or reruns the stage

The web interface observes and controls this process. It does not execute stage logic directly.

## Stage Status Model

Recommended statuses:

- `not_started`
- `ready`
- `running`
- `completed`
- `approved`
- `rejected`
- `failed`

Status semantics:

- `completed`: execution succeeded technically
- `approved`: result is accepted for downstream use
- `rejected`: result exists but was refused by human review
- `failed`: execution did not complete successfully

The next stage becomes eligible only when all required upstream executions are `approved`.

## Approval Model

Every stage must support explicit human approval or rejection.

Required actions:

- execute
- inspect
- approve
- reject
- rerun

Approval metadata should include:

- actor
- timestamp
- optional note

This ensures the system aligns with the intended workflow: AI proposes, human validates.

## Traceability Model

Traceability is a primary requirement.

The system must be able to answer, for any image:

- which prompt generated it
- which concept informed it
- which style informed it
- which production restrictions informed it
- which provider/model produced it
- which exact execution produced it

To support that, each `StageExecution` must persist:

- stage reference
- target entity
- dependency references
- structured input snapshot
- structured output
- status
- version
- provider
- model
- execution parameters
- error summary when relevant
- timestamps

Each `GeneratedImage` must persist:

- generation execution reference
- final prompt
- generation parameters
- provider/model
- file location
- media metadata
- approval or rejection state
- optional rejection note

Historical reconstruction must never rely on reading the current collection or design item state dynamically.

## Storage Model

Use two storage types:

1. `PostgreSQL`
   Stores relational entities, status, approvals, and JSON snapshots.

2. `File/Object Storage`
   Stores images and future binary artifacts.

For local development, file storage can be implemented with a mounted Docker volume. The storage interface should still be abstracted so it can later move to S3-compatible infrastructure.

## Web Interface

The V1 UI is an operational panel, not a creative editor.

Frontend implementation decision for V1:

- `Next.js` as the web application framework
- `shadcn/ui` as the component baseline
- `Tailwind CSS` for layout and styling composition

This choice avoids building a design system from scratch while keeping the interface flexible enough for:

- pipeline timelines
- stage review panels
- operational tables
- dialogs, drawers, and forms
- image galleries and detail screens

Primary areas:

### Collections

- list collections
- inspect collection briefing
- inspect selected games
- navigate to derived design items

### Design Items

- list items within a collection
- show current pipeline progress
- show stage alerts and latest decisions

### Pipeline Timeline

The main view for a design item.

Each stage should show:

- current status
- latest result
- input snapshot
- structured output
- approval decision
- operator note
- action controls

Required actions per stage:

- run
- rerun
- approve
- reject
- inspect details

### Images

- gallery of generated variations
- prompt/provider metadata
- approval and rejection controls
- navigation to source execution

### Execution Detail

- exact input snapshot
- exact structured output
- model/provider metadata
- parameters
- timestamps
- failure details if applicable

The UI must answer three questions quickly:

- where is this design item in the pipeline
- what has already been decided
- where did this image come from

## Frontend Structure Decision

The web application should be implemented as a `Next.js` app using the App Router.

Recommended UI responsibilities:

- server-rendered page shells where useful for navigation and data bootstrapping
- client components for interactive stage controls and approval actions
- reusable `shadcn/ui` primitives for cards, dialogs, tables, tabs, buttons, badges, and forms
- `Tailwind CSS` for layout, spacing, hierarchy, and page-level styling

The UI should still behave as an operational console, not as a visual design editor.

## Containerized Runtime

The initial runtime model should be fully containerized using `docker compose`.

Recommended services:

- `app`: Next.js web application plus backend API surface
- `worker`: background stage execution
- `postgres`: relational persistence
- `redis`: queue backend

Recommended mounted volumes:

- application source for development
- local asset storage for generated files

This layout supports local end-to-end testing while keeping web and background execution separated.

## Provider Integration Strategy

The system should expose explicit interfaces for:

- `LLMProvider`
- `ImageGenerationProvider`
- `AssetStorage`

Only one implementation of each is required in V1, but the architecture must support swapping providers later without changing domain logic.

The system should not attempt a fully generic multi-provider orchestration platform in the first version.

## Error Handling

Errors must be split into two classes:

### Operational Failure

Examples:

- timeout
- provider unavailable
- queue issue
- storage failure

Outcome:

- `StageExecution` becomes `failed`
- error summary is stored
- retry is allowed

### Creatively Unacceptable Result

The model returned a technically valid result, but the result should not be used.

Outcome:

- `StageExecution` becomes `completed`
- human marks it `rejected`
- downstream progression remains blocked

This distinction is critical. Technical failure and creative rejection are not the same thing.

## Retry Policy

Automatic retries should exist only for likely transient operational failures.

Initial policy recommendation:

- limited automatic retries
- full logging of attempts
- manual retry always available via UI

No unlimited background retries.

## Testing Strategy

### Domain Tests

Validate:

- dependency rules
- approval requirements
- collection-to-item inheritance behavior
- stage eligibility logic

### Application Tests

Validate:

- stage triggering
- stage execution registration
- approval and rejection flows
- rerun behavior
- image generation linking

### Integration Tests

Validate:

- PostgreSQL integration
- Redis/queue integration
- storage integration
- provider adapter behavior with controlled doubles

### End-to-End Tests

Validate the primary containerized workflow:

- create collection
- create design item
- run stages
- approve stages
- generate images
- trace images back to their source execution

## Architecture Decisions Summary

- Modular monolith
- Background jobs for all stage execution
- Manual stage triggering in V1
- Explicit stage approval/rejection
- `Collection` as root entity
- `DesignItem` as collection-derived entity
- `PipelineStage` separated from `StageExecution`
- Fixed 11-stage official pipeline
- Strong traceability per image
- Operational web UI
- Containerized local runtime with `docker compose`
- Provider abstraction with single implementations initially

## Risks and Follow-Up Topics

- Stage input/output schemas must be defined carefully to avoid drift
- The distinction between collection-scope and item-scope stages must remain explicit
- Approval UX must stay fast, or operators will bypass the system
- If reruns become frequent, version presentation in the UI may get noisy
- Provider-specific prompt or parameter differences may pressure the abstraction layer

These are design follow-ups, not blockers for the proposed V1 architecture.
