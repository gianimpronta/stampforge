# StampForge MVP Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the StampForge MVP: a containerized system that runs the approved pipeline with real Gemini API integrations, manual per-stage control, approval/rejection gates, and image traceability.

**Architecture:** Implement a modular monolith with clear domain boundaries around collections, design items, pipeline stages, stage executions, and generated images. Run the app and background worker as separate containers, persist domain state in PostgreSQL, queue work with Redis, and integrate the real Gemini API behind explicit provider interfaces so the system remains replaceable later.

**Tech Stack:** TypeScript, Node.js, Next.js, shadcn/ui, Tailwind CSS, PostgreSQL, Redis, Docker Compose, Gemini API, local file storage, Vitest, Playwright

---

## File Structure

Proposed initial structure:

- `docker-compose.yml`
  Defines local runtime for app, worker, postgres, redis, and mounted assets volume.
- `.env.example`
  Documents required environment variables for database, Redis, providers, and storage.
- `package.json`
  Root scripts for dev, test, lint, build, and worker/app entrypoints.
- `src/app/*`
  Next.js App Router pages, layouts, and route segments for the operational UI.
- `src/components/ui/*`
  `shadcn/ui` primitives and local component wrappers.
- `src/components/stampforge/*`
  Product-specific UI components such as timelines, galleries, and execution panels.
- `src/lib/server/*`
  Server-only composition, API services, and data access wiring for the web app.
- `src/server/jobs/worker.ts`
  Worker bootstrap that consumes background stage jobs.
- `src/server/jobs/queues.ts`
  Queue configuration and job registration.
- `src/domain/collections/*`
  Collection entities, repository interfaces, and use cases.
- `src/domain/design-items/*`
  Design item entities, repository interfaces, and use cases.
- `src/domain/pipeline/*`
  Pipeline stage definitions, execution rules, stage eligibility, and approval logic.
- `src/domain/generation/*`
  Image generation orchestration and generated image entities.
- `src/domain/providers/*`
  Interfaces for `LLMProvider`, `ImageGenerationProvider`, and `AssetStorage`.
- `src/infrastructure/db/*`
  Database client, migrations, and repository implementations.
- `src/infrastructure/providers/*`
  Concrete Gemini API adapters.
- `src/infrastructure/storage/*`
  Local disk-backed asset storage implementation.

- `tests/domain/*`
  Domain-level tests for pipeline rules and approvals.
- `tests/application/*`
  Use case and orchestration tests.
- `tests/integration/*`
  DB, queue, and provider integration tests.
- `tests/e2e/*`
  End-to-end UI/API flow tests against the compose stack.

## MVP Scope

The MVP must deliver:

- collection creation
- design item creation
- fixed 11-stage pipeline
- manual per-stage execution
- background jobs for execution
- approval or rejection on every stage
- master prompt assembly
- real image generation through Gemini API
- per-image traceability to the exact source execution
- lightweight operational UI

The MVP explicitly excludes:

- multi-user support
- authentication
- analytics dashboards
- automated pipeline progression
- advanced creative editing
- production-ready derivative exports
- multi-provider orchestration

## Delivery Strategy

Build the MVP in this order:

1. Project/runtime scaffold
2. Core domain model and pipeline rules
3. Persistence and queue plumbing
4. Stage execution use cases and worker flow
5. Gemini provider and storage integration
6. Operational API
7. Web UI
8. End-to-end hardening

## Chunk 1: Runtime and Project Skeleton

### Task 1: Initialize the containerized workspace

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/components/ui/`
- Create: `src/server/jobs/worker.ts`

- [ ] **Step 1: Write a failing smoke test for environment bootstrapping**

```ts
import { describe, expect, it } from "vitest";
import { loadRuntimeConfig } from "../../src/server/config";

describe("runtime config", () => {
  it("requires database and redis configuration", () => {
    expect(() => loadRuntimeConfig({} as NodeJS.ProcessEnv)).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/domain/runtime-config.test.ts`
Expected: FAIL because `src/server/config` does not exist yet

- [ ] **Step 3: Add minimal runtime bootstrap and config loader**

```ts
export function loadRuntimeConfig(env: NodeJS.ProcessEnv) {
  if (!env.DATABASE_URL || !env.REDIS_URL) {
    throw new Error("Missing runtime configuration");
  }

  return {
    databaseUrl: env.DATABASE_URL,
    redisUrl: env.REDIS_URL,
  };
}
```

- [ ] **Step 4: Add `docker-compose.yml` and `.env.example`**

Include services:
- `app`
- `worker`
- `postgres`
- `redis`

Include mounted volume for generated assets.

- [ ] **Step 5: Run the test again**

Run: `npm test -- tests/domain/runtime-config.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml .env.example package.json tsconfig.json src/server tests/domain
git commit -m "chore: scaffold containerized stampforge runtime"
```

### Task 2: Define the package scripts, Next.js app entrypoints, and worker entrypoints

**Files:**
- Modify: `package.json`
- Create: `src/server/config.ts`
- Create: `src/app/api/health/route.ts`
- Create: `src/server/jobs/index.ts`
- Create: `components.json`
- Create: `tailwind.config.ts`

- [ ] **Step 1: Write a failing test for config parsing**

```ts
import { describe, expect, it } from "vitest";
import { loadRuntimeConfig } from "../../src/server/config";

describe("loadRuntimeConfig", () => {
  it("returns normalized config when required vars exist", () => {
    const config = loadRuntimeConfig({
      DATABASE_URL: "postgres://db",
      REDIS_URL: "redis://redis",
    } as NodeJS.ProcessEnv);

    expect(config.databaseUrl).toBe("postgres://db");
    expect(config.redisUrl).toBe("redis://redis");
  });
});
```

- [ ] **Step 2: Run the test to verify behavior gaps**

Run: `npm test -- tests/domain/runtime-config-normalization.test.ts`
Expected: FAIL until config module is fleshed out and exported cleanly

- [ ] **Step 3: Implement config and entrypoints**

Add:
- `npm run dev`
- `npm run dev:worker`
- `npm run test`
- `npm run build`
- `npm run ui:add` for `shadcn/ui` components

Bootstrap Next.js for the web app, Tailwind CSS for styling, `shadcn/ui` configuration for component generation, and separate worker processes.

- [ ] **Step 4: Run targeted tests**

Run: `npm test -- tests/domain/runtime-config*.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json src/server tests/domain
git commit -m "chore: add runtime config and entrypoints"
```

## Chunk 2: Core Domain Model

### Task 3: Model `Collection` and `DesignItem`

**Files:**
- Create: `src/domain/collections/Collection.ts`
- Create: `src/domain/design-items/DesignItem.ts`
- Create: `tests/domain/collection-design-item.test.ts`

- [ ] **Step 1: Write the failing domain tests**

```ts
import { describe, expect, it } from "vitest";
import { Collection } from "../../src/domain/collections/Collection";
import { DesignItem } from "../../src/domain/design-items/DesignItem";

describe("Collection and DesignItem", () => {
  it("creates a design item linked to a collection", () => {
    const collection = Collection.create({
      id: "col-1",
      name: "Board Games",
      briefing: "Premium boardgame collection",
    });

    const item = DesignItem.create({
      id: "item-1",
      collectionId: collection.id,
      name: "Ark Nova badge",
    });

    expect(item.collectionId).toBe(collection.id);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/domain/collection-design-item.test.ts`
Expected: FAIL because the domain entities do not exist

- [ ] **Step 3: Implement minimal entities**

Create focused entities with factory methods and basic invariants.

- [ ] **Step 4: Run the domain test**

Run: `npm test -- tests/domain/collection-design-item.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/collections src/domain/design-items tests/domain
git commit -m "feat: add collection and design item domain entities"
```

### Task 4: Model `PipelineStage` separately from `StageExecution`

**Files:**
- Create: `src/domain/pipeline/PipelineStage.ts`
- Create: `src/domain/pipeline/StageExecution.ts`
- Create: `tests/domain/pipeline-stage-separation.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { PipelineStage } from "../../src/domain/pipeline/PipelineStage";
import { StageExecution } from "../../src/domain/pipeline/StageExecution";

describe("PipelineStage and StageExecution", () => {
  it("keeps stage definition separate from execution history", () => {
    const stage = PipelineStage.create({
      key: "define-style",
      name: "Definicao de estilo visual",
      scope: "design_item",
      order: 6,
    });

    const execution = StageExecution.start({
      id: "exec-1",
      stageKey: stage.key,
      targetId: "item-1",
      targetType: "design_item",
      inputSnapshot: {},
    });

    expect(execution.stageKey).toBe(stage.key);
    expect(stage.order).toBe(6);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/domain/pipeline-stage-separation.test.ts`
Expected: FAIL because the pipeline domain is missing

- [ ] **Step 3: Implement the entities**

Include:
- stage scope
- order
- status initialization
- input snapshot
- timestamps

- [ ] **Step 4: Run the test**

Run: `npm test -- tests/domain/pipeline-stage-separation.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/pipeline tests/domain
git commit -m "feat: add pipeline stage and execution domain model"
```

### Task 5: Encode the official 11-stage pipeline

**Files:**
- Create: `src/domain/pipeline/stageCatalog.ts`
- Create: `tests/domain/stage-catalog.test.ts`

- [ ] **Step 1: Write the failing catalog test**

```ts
import { describe, expect, it } from "vitest";
import { stageCatalog } from "../../src/domain/pipeline/stageCatalog";

describe("stageCatalog", () => {
  it("defines the official V1 pipeline in order", () => {
    expect(stageCatalog.map((stage) => stage.key)).toEqual([
      "collection-briefing",
      "game-selection",
      "game-universe-extraction",
      "design-concept",
      "theme-definition",
      "visual-style-definition",
      "copy-generation",
      "shirt-composition-definition",
      "production-constraints-definition",
      "master-prompt-assembly",
      "visual-variation-generation",
    ]);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npm test -- tests/domain/stage-catalog.test.ts`
Expected: FAIL because the stage catalog does not exist

- [ ] **Step 3: Implement the stage catalog**

Ensure each stage has:
- stable key
- human-readable name
- scope
- order
- dependencies

- [ ] **Step 4: Run the test**

Run: `npm test -- tests/domain/stage-catalog.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/pipeline tests/domain
git commit -m "feat: define official stampforge stage catalog"
```

## Chunk 3: Pipeline Rules and Approval Logic

### Task 6: Implement stage status and approval semantics

**Files:**
- Modify: `src/domain/pipeline/StageExecution.ts`
- Create: `tests/domain/stage-approval-status.test.ts`

- [ ] **Step 1: Write the failing approval test**

```ts
import { describe, expect, it } from "vitest";
import { StageExecution } from "../../src/domain/pipeline/StageExecution";

describe("StageExecution approval flow", () => {
  it("distinguishes completed from approved", () => {
    const execution = StageExecution.start({
      id: "exec-1",
      stageKey: "design-concept",
      targetId: "item-1",
      targetType: "design_item",
      inputSnapshot: {},
    }).complete({ concept: "who knows, knows" });

    expect(execution.status).toBe("completed");

    const approved = execution.approve({
      actorId: "user-1",
    });

    expect(approved.status).toBe("approved");
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npm test -- tests/domain/stage-approval-status.test.ts`
Expected: FAIL until explicit approval/rejection behavior exists

- [ ] **Step 3: Implement state transitions**

Add:
- `complete`
- `approve`
- `reject`
- `fail`

Guard invalid transitions.

- [ ] **Step 4: Run the test**

Run: `npm test -- tests/domain/stage-approval-status.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/pipeline tests/domain
git commit -m "feat: add stage approval and rejection flow"
```

### Task 7: Implement dependency eligibility rules

**Files:**
- Create: `src/domain/pipeline/stageEligibility.ts`
- Create: `tests/domain/stage-eligibility.test.ts`

- [ ] **Step 1: Write the failing eligibility test**

```ts
import { describe, expect, it } from "vitest";
import { isStageReady } from "../../src/domain/pipeline/stageEligibility";

describe("isStageReady", () => {
  it("requires upstream stages to be approved", () => {
    const ready = isStageReady({
      stageKey: "master-prompt-assembly",
      approvedStageKeys: [
        "design-concept",
        "theme-definition",
        "visual-style-definition",
        "copy-generation",
      ],
    });

    expect(ready).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npm test -- tests/domain/stage-eligibility.test.ts`
Expected: FAIL because eligibility rules are missing

- [ ] **Step 3: Implement eligibility logic**

Drive logic from `stageCatalog` dependencies rather than hard-coded conditionals.

- [ ] **Step 4: Run the test**

Run: `npm test -- tests/domain/stage-eligibility.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/pipeline tests/domain
git commit -m "feat: add pipeline stage dependency rules"
```

## Chunk 4: Persistence Layer

### Task 8: Create database schema and migrations

**Files:**
- Create: `src/infrastructure/db/schema.sql`
- Create: `src/infrastructure/db/migrations/0001_initial.sql`
- Create: `tests/integration/db-schema.test.ts`

- [ ] **Step 1: Write the failing schema test**

```ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("database schema", () => {
  it("defines the core pipeline tables", () => {
    const sql = readFileSync("src/infrastructure/db/migrations/0001_initial.sql", "utf8");

    expect(sql).toContain("collections");
    expect(sql).toContain("design_items");
    expect(sql).toContain("pipeline_stages");
    expect(sql).toContain("stage_executions");
    expect(sql).toContain("generated_images");
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npm test -- tests/integration/db-schema.test.ts`
Expected: FAIL because migrations do not exist

- [ ] **Step 3: Write the initial schema**

Include tables for:
- collections
- design_items
- pipeline_stages
- stage_executions
- generated_images
- approval metadata

Store snapshots as JSON columns.

- [ ] **Step 4: Run the test**

Run: `npm test -- tests/integration/db-schema.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/db tests/integration
git commit -m "feat: add initial database schema for pipeline tracking"
```

### Task 9: Implement repository interfaces and Postgres adapters

**Files:**
- Create: `src/domain/collections/CollectionRepository.ts`
- Create: `src/domain/design-items/DesignItemRepository.ts`
- Create: `src/domain/pipeline/StageExecutionRepository.ts`
- Create: `src/domain/generation/GeneratedImageRepository.ts`
- Create: `src/infrastructure/db/repositories/*.ts`
- Create: `tests/integration/repositories.test.ts`

- [ ] **Step 1: Write the failing repository integration test**

```ts
import { describe, expect, it } from "vitest";

describe("repositories", () => {
  it("persists and reloads a stage execution snapshot", async () => {
    const repo = await makeStageExecutionRepositoryForTest();

    await repo.save({
      id: "exec-1",
      stageKey: "design-concept",
      targetId: "item-1",
      status: "completed",
      inputSnapshot: { source: "briefing" },
      output: { concept: "badge retro" },
    });

    const execution = await repo.findById("exec-1");

    expect(execution?.output.concept).toBe("badge retro");
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npm test -- tests/integration/repositories.test.ts`
Expected: FAIL because repositories are missing

- [ ] **Step 3: Implement interfaces and adapters**

Keep repository contracts narrow and aligned with the domain model.

- [ ] **Step 4: Run the test**

Run: `npm test -- tests/integration/repositories.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain src/infrastructure/db tests/integration
git commit -m "feat: add postgres repositories for core entities"
```

## Chunk 5: Queue and Worker Orchestration

### Task 10: Define queue contracts and worker registration

**Files:**
- Create: `src/server/jobs/queues.ts`
- Create: `src/server/jobs/jobTypes.ts`
- Create: `tests/application/job-registration.test.ts`

- [ ] **Step 1: Write the failing queue registration test**

```ts
import { describe, expect, it } from "vitest";
import { jobTypes } from "../../src/server/jobs/jobTypes";

describe("jobTypes", () => {
  it("registers stage and image generation jobs", () => {
    expect(jobTypes).toEqual([
      "stage-execution",
      "image-generation",
      "asset-processing",
    ]);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npm test -- tests/application/job-registration.test.ts`
Expected: FAIL because the queue contracts do not exist

- [ ] **Step 3: Implement job type declarations and queue setup**

Register queue names and worker dispatch entrypoints.

- [ ] **Step 4: Run the test**

Run: `npm test -- tests/application/job-registration.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/jobs tests/application
git commit -m "feat: add queue contracts and job registration"
```

### Task 11: Build the stage execution worker flow

**Files:**
- Create: `src/application/runStageExecution.ts`
- Create: `src/server/jobs/handlers/runStageExecutionJob.ts`
- Create: `tests/application/run-stage-execution.test.ts`

- [ ] **Step 1: Write the failing orchestration test**

```ts
import { describe, expect, it } from "vitest";

describe("runStageExecution", () => {
  it("creates an execution, calls the stage handler, and stores the result", async () => {
    const result = await runStageExecution({
      stageKey: "design-concept",
      targetId: "item-1",
    });

    expect(result.status).toBe("completed");
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npm test -- tests/application/run-stage-execution.test.ts`
Expected: FAIL because orchestration use case is missing

- [ ] **Step 3: Implement the use case and worker handler**

Responsibilities:
- validate dependencies
- create `StageExecution`
- call the appropriate stage runner
- persist result
- mark failures correctly

- [ ] **Step 4: Run the test**

Run: `npm test -- tests/application/run-stage-execution.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/application src/server/jobs tests/application
git commit -m "feat: add background stage execution flow"
```

## Chunk 6: Providers and Storage

### Task 12: Define provider interfaces

**Files:**
- Create: `src/domain/providers/LLMProvider.ts`
- Create: `src/domain/providers/ImageGenerationProvider.ts`
- Create: `src/domain/providers/AssetStorage.ts`
- Create: `tests/domain/provider-interfaces.test.ts`

- [ ] **Step 1: Write the failing interface test**

```ts
import { describe, expect, it } from "vitest";
import type { LLMProvider } from "../../src/domain/providers/LLMProvider";
import type { ImageGenerationProvider } from "../../src/domain/providers/ImageGenerationProvider";

describe("provider interfaces", () => {
  it("defines interfaces for text and image generation", () => {
    const interfaces: Array<string> = ["LLMProvider", "ImageGenerationProvider"];
    expect(interfaces).toContain("LLMProvider");
    expect(interfaces).toContain("ImageGenerationProvider");
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npm test -- tests/domain/provider-interfaces.test.ts`
Expected: FAIL because the interface files do not exist

- [ ] **Step 3: Implement provider contracts**

Define request/response types that preserve provider/model metadata for traceability.

- [ ] **Step 4: Run the test**

Run: `npm test -- tests/domain/provider-interfaces.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/providers tests/domain
git commit -m "feat: add provider interfaces for text image and storage"
```

### Task 13: Implement local storage and real Gemini provider adapters

**Files:**
- Create: `src/infrastructure/storage/LocalAssetStorage.ts`
- Create: `src/infrastructure/providers/GeminiTextProvider.ts`
- Create: `src/infrastructure/providers/GeminiImageProvider.ts`
- Create: `tests/integration/gemini-provider-config.test.ts`

- [ ] **Step 1: Write the failing integration/configuration test**

```ts
import { describe, expect, it } from "vitest";

describe("Gemini provider config", () => {
  it("requires Gemini API configuration for text and image generation", async () => {
    expect(() => makeGeminiProviders({
      GEMINI_API_KEY: "",
    })).toThrow();
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npm test -- tests/integration/gemini-provider-config.test.ts`
Expected: FAIL because Gemini providers and config helpers are missing

- [ ] **Step 3: Implement the Gemini and storage adapters**

Implement:
- `GeminiTextProvider` for structured text stages
- `GeminiImageProvider` for real image generation
- `LocalAssetStorage` for persisted generated files

Use environment-driven model selection, for example:
- `GEMINI_API_KEY`
- `GEMINI_TEXT_MODEL`
- `GEMINI_IMAGE_MODEL`

- [ ] **Step 4: Run the test**

Run: `npm test -- tests/integration/gemini-provider-config.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure tests/integration
git commit -m "feat: add gemini api providers and local asset storage"
```

## Chunk 7: Application Use Cases and API

### Task 14: Implement collection and design item API flows

**Files:**
- Create: `src/application/createCollection.ts`
- Create: `src/application/createDesignItem.ts`
- Create: `src/server/routes/collections.ts`
- Create: `tests/application/create-collection.test.ts`
- Create: `tests/application/create-design-item.test.ts`

- [ ] **Step 1: Write the failing use case tests**

```ts
import { describe, expect, it } from "vitest";

describe("createCollection", () => {
  it("creates a collection with a briefing", async () => {
    const collection = await createCollection({
      name: "Boardgame Premium",
      briefing: "Vintage premium collection",
    });

    expect(collection.name).toBe("Boardgame Premium");
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npm test -- tests/application/create-collection.test.ts tests/application/create-design-item.test.ts`
Expected: FAIL because use cases and routes do not exist

- [ ] **Step 3: Implement the use cases and routes**

Add routes for:
- create collection
- list collections
- create design item
- list design items by collection

- [ ] **Step 4: Run the tests**

Run: `npm test -- tests/application/create-collection.test.ts tests/application/create-design-item.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/application src/server/routes tests/application
git commit -m "feat: add collection and design item api flows"
```

### Task 15: Implement stage execution, approval, and inspection API

**Files:**
- Create: `src/application/approveStageExecution.ts`
- Create: `src/application/rejectStageExecution.ts`
- Create: `src/application/getPipelineTimeline.ts`
- Create: `src/server/routes/pipeline.ts`
- Create: `tests/application/stage-approval-api.test.ts`

- [ ] **Step 1: Write the failing API test**

```ts
import { describe, expect, it } from "vitest";

describe("pipeline API", () => {
  it("approves a completed stage execution", async () => {
    const approved = await approveStageExecution({
      executionId: "exec-1",
      actorId: "user-1",
    });

    expect(approved.status).toBe("approved");
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npm test -- tests/application/stage-approval-api.test.ts`
Expected: FAIL because approval use cases and routes do not exist

- [ ] **Step 3: Implement the use cases and routes**

Add routes for:
- trigger stage
- approve stage
- reject stage
- inspect execution detail
- fetch item timeline

- [ ] **Step 4: Run the test**

Run: `npm test -- tests/application/stage-approval-api.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/application src/server/routes tests/application
git commit -m "feat: add pipeline execution approval and inspection api"
```

### Task 16: Implement image generation and traceability API

**Files:**
- Create: `src/application/generateVisualVariations.ts`
- Create: `src/application/listGeneratedImages.ts`
- Create: `src/server/routes/images.ts`
- Create: `tests/application/image-traceability-api.test.ts`

- [ ] **Step 1: Write the failing image traceability test**

```ts
import { describe, expect, it } from "vitest";

describe("image traceability API", () => {
  it("returns an image with its source execution metadata", async () => {
    const image = await getGeneratedImage("img-1");
    expect(image.sourceExecutionId).toBe("exec-visual-1");
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npm test -- tests/application/image-traceability-api.test.ts`
Expected: FAIL because the image API does not exist

- [ ] **Step 3: Implement image use cases and routes**

Add routes for:
- trigger visual variation generation
- list images by design item
- fetch image traceability detail
- approve/reject image

- [ ] **Step 4: Run the test**

Run: `npm test -- tests/application/image-traceability-api.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/application src/server/routes tests/application
git commit -m "feat: add image generation and traceability api"
```

## Chunk 8: Web UI

### Task 17: Build collections and design item screens

**Files:**
- Create: `src/app/collections/page.tsx`
- Create: `src/app/collections/[collectionId]/page.tsx`
- Create: `src/components/stampforge/CollectionList.tsx`
- Create: `src/components/stampforge/DesignItemList.tsx`
- Create: `tests/e2e/collections.spec.ts`

- [ ] **Step 1: Write the failing end-to-end test**

```ts
import { test, expect } from "@playwright/test";

test("shows collections and design items", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Collections")).toBeVisible();
});
```

- [ ] **Step 2: Run the test**

Run: `npm run test:e2e -- tests/e2e/collections.spec.ts`
Expected: FAIL because the UI is not implemented

- [ ] **Step 3: Implement the screens**

Show:
- collection list
- collection detail
- derived design items

- [ ] **Step 4: Run the test**

Run: `npm run test:e2e -- tests/e2e/collections.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui tests/e2e
git commit -m "feat: add collections and design item ui"
```

### Task 18: Build the pipeline timeline and approval controls

**Files:**
- Create: `src/app/design-items/[designItemId]/page.tsx`
- Create: `src/components/stampforge/PipelineTimeline.tsx`
- Create: `src/components/stampforge/StageExecutionPanel.tsx`
- Create: `tests/e2e/pipeline-timeline.spec.ts`

- [ ] **Step 1: Write the failing UI test**

```ts
import { test, expect } from "@playwright/test";

test("shows pipeline stages and approval controls", async ({ page }) => {
  await page.goto("/design-items/item-1");
  await expect(page.getByText("Aprovar")).toBeVisible();
  await expect(page.getByText("Reprovar")).toBeVisible();
});
```

- [ ] **Step 2: Run the test**

Run: `npm run test:e2e -- tests/e2e/pipeline-timeline.spec.ts`
Expected: FAIL because the timeline UI is missing

- [ ] **Step 3: Implement the timeline**

Each stage card should show:
- status
- latest execution
- run/rerun action
- approve action
- reject action
- inspection link

- [ ] **Step 4: Run the test**

Run: `npm run test:e2e -- tests/e2e/pipeline-timeline.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui tests/e2e
git commit -m "feat: add pipeline timeline approval ui"
```

### Task 19: Build image gallery and execution detail screens

**Files:**
- Create: `src/app/images/page.tsx`
- Create: `src/app/executions/[executionId]/page.tsx`
- Create: `src/components/stampforge/ImageGallery.tsx`
- Create: `src/components/stampforge/ExecutionDetail.tsx`
- Create: `tests/e2e/image-traceability.spec.ts`

- [ ] **Step 1: Write the failing UI traceability test**

```ts
import { test, expect } from "@playwright/test";

test("shows generated image traceability", async ({ page }) => {
  await page.goto("/images");
  await expect(page.getByText("Prompt usado")).toBeVisible();
  await expect(page.getByText("Execucao de origem")).toBeVisible();
});
```

- [ ] **Step 2: Run the test**

Run: `npm run test:e2e -- tests/e2e/image-traceability.spec.ts`
Expected: FAIL because image and execution detail screens do not exist

- [ ] **Step 3: Implement the image screens**

Show:
- generated image gallery
- provider/model metadata
- prompt used
- source execution detail
- approval/rejection controls

- [ ] **Step 4: Run the test**

Run: `npm run test:e2e -- tests/e2e/image-traceability.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui tests/e2e
git commit -m "feat: add image gallery and execution traceability ui"
```

## Chunk 9: End-to-End Hardening

### Task 20: Cover the full MVP compose-based flow

**Files:**
- Create: `tests/e2e/full-pipeline.spec.ts`
- Modify: `docker-compose.yml`
- Modify: `package.json`

- [ ] **Step 1: Write the failing full-flow test**

```ts
import { test, expect } from "@playwright/test";

test("runs a design item through the pipeline to generated images", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Collections")).toBeVisible();
  await expect(page.getByText("Generated Images")).toBeVisible();
});
```

- [ ] **Step 2: Run the test**

Run: `npm run test:e2e -- tests/e2e/full-pipeline.spec.ts`
Expected: FAIL because the full workflow is not wired end-to-end yet

- [ ] **Step 3: Complete missing wiring**

Verify:
- app can connect to postgres
- worker can connect to redis
- stage trigger creates jobs
- worker updates execution status
- Gemini provider configuration is loaded correctly
- generated images are stored and listed

- [ ] **Step 4: Run full test suite**

Run: `npm test`
Expected: PASS for unit, application, and integration suites

Run: `npm run test:e2e`
Expected: PASS for end-to-end coverage

- [ ] **Step 5: Run the compose stack manually**

Run: `docker compose up --build`
Expected:
- `app` healthy
- `worker` consuming jobs
- `postgres` accepting connections
- `redis` ready

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml package.json tests/e2e
git commit -m "feat: wire full stampforge v1 pipeline flow"
```

## Notes for Execution

- Use the real Gemini API in the MVP implementation path.
- Keep Gemini integration behind `LLMProvider` and `ImageGenerationProvider`.
- For automated tests, prefer narrow unit and integration tests that do not depend on live API calls unless the test is explicitly marked for that purpose.
- Do not collapse `PipelineStage` and `StageExecution`.
- Do not allow downstream progression based on `completed`; require `approved`.
- Keep snapshots immutable once an execution is stored.
- Keep the UI operational and inspectable; avoid turning it into a design editor in V1.
- If Git is not initialized in the working directory, initialize it before starting execution so the commit steps are possible.

