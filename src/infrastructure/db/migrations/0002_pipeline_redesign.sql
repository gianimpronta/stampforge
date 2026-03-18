-- Migration: 0002_pipeline_redesign
-- Applies the 6-stage pipeline redesign:
--   1. Adds collection_context JSONB to design_items
--   2. Extends stage_executions status check to include 'stale'

-- Add collectionContext to design_items.
-- Each entry maps a collection stage key to the approved execution the item uses.
ALTER TABLE design_items
  ADD COLUMN collection_context JSONB NOT NULL DEFAULT '{}';

-- Extend status constraint on stage_executions to include 'stale'.
-- A stale execution was approved but is now superseded because a
-- collectionContext dependency changed. Must be re-executed.
ALTER TABLE stage_executions
  DROP CONSTRAINT IF EXISTS stage_executions_status_check;

ALTER TABLE stage_executions
  ADD CONSTRAINT stage_executions_status_check
  CHECK (status IN ('running', 'completed', 'approved', 'rejected', 'failed', 'stale'));
