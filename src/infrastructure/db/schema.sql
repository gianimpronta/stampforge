-- StampForge V1 - Full schema reference
-- This file is a canonical reference copy. Apply migrations via the migrations/ directory.

-- Collections: root entity representing a themed design collection.
CREATE TABLE collections (
  id          UUID        PRIMARY KEY,
  name        TEXT        NOT NULL,
  briefing    TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Design items: individual design outputs derived from a collection.
CREATE TABLE design_items (
  id            UUID        PRIMARY KEY,
  collection_id UUID        NOT NULL REFERENCES collections (id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_design_items_collection_id ON design_items (collection_id);

-- Pipeline stages: static stage definitions (blueprint, never mutated at runtime).
CREATE TABLE pipeline_stages (
  key          VARCHAR(128) PRIMARY KEY,
  name         TEXT         NOT NULL,
  scope        TEXT         NOT NULL CHECK (scope IN ('collection', 'design_item')),
  stage_order  INTEGER      NOT NULL,
  dependencies JSONB        NOT NULL DEFAULT '[]'
);

-- Stage executions: historical records of running a stage.
CREATE TABLE stage_executions (
  id               UUID        PRIMARY KEY,
  stage_key        VARCHAR(128) NOT NULL REFERENCES pipeline_stages (key),
  target_id        UUID        NOT NULL,
  target_type      TEXT        NOT NULL CHECK (target_type IN ('collection', 'design_item')),
  status           TEXT        NOT NULL CHECK (status IN ('running', 'completed', 'approved', 'rejected', 'failed')),
  input_snapshot   JSONB       NOT NULL DEFAULT '{}',
  output_snapshot  JSONB,
  approved_by      TEXT,
  approved_at      TIMESTAMPTZ,
  rejected_by      TEXT,
  rejected_at      TIMESTAMPTZ,
  rejection_reason TEXT,
  failure_reason   TEXT,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stage_executions_stage_key  ON stage_executions (stage_key);
CREATE INDEX idx_stage_executions_target_id  ON stage_executions (target_id);
CREATE INDEX idx_stage_executions_status     ON stage_executions (status);

-- Generated images: image assets produced by stage executions.
-- Each image traces back to the exact StageExecution that produced it.
CREATE TABLE generated_images (
  id                  UUID        PRIMARY KEY,
  design_item_id      UUID        NOT NULL REFERENCES design_items (id) ON DELETE CASCADE,
  source_execution_id UUID        NOT NULL REFERENCES stage_executions (id),
  file_path           TEXT        NOT NULL,
  prompt_used         TEXT        NOT NULL,
  provider            TEXT        NOT NULL,
  model               TEXT        NOT NULL,
  metadata            JSONB       NOT NULL DEFAULT '{}',
  status              TEXT        NOT NULL CHECK (status IN ('pending', 'ready', 'failed')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_generated_images_design_item_id      ON generated_images (design_item_id);
CREATE INDEX idx_generated_images_source_execution_id ON generated_images (source_execution_id);
CREATE INDEX idx_generated_images_status              ON generated_images (status);
