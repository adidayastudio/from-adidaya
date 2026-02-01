-- Migration: Expand Performance Snapshots
-- Date: 2026-02-10
-- Description: Adds additional metric columns to personal and team performance snapshots.

-- 1. Expand Personal Performance Snapshots
ALTER TABLE people_performance_snapshots 
ADD COLUMN IF NOT EXISTS quality_score NUMERIC(5,2) DEFAULT 75.00,
ADD COLUMN IF NOT EXISTS peer_review_score NUMERIC(5,2) DEFAULT 75.00,
ADD COLUMN IF NOT EXISTS engagement_score NUMERIC(5,2) DEFAULT 75.00,
ADD COLUMN IF NOT EXISTS project_involvement_score NUMERIC(5,2) DEFAULT 75.00,
ADD COLUMN IF NOT EXISTS bonus_score NUMERIC(5,2) DEFAULT 0.00;

-- Set defaults for existing rows if any
UPDATE people_performance_snapshots SET 
    quality_score = COALESCE(quality_score, 75.00),
    peer_review_score = COALESCE(peer_review_score, 75.00),
    engagement_score = COALESCE(engagement_score, 75.00),
    project_involvement_score = COALESCE(project_involvement_score, 75.00),
    bonus_score = COALESCE(bonus_score, 0.00);

-- 2. Expand Team Performance Snapshots (for benchmarking)
ALTER TABLE team_performance_snapshots
ADD COLUMN IF NOT EXISTS avg_quality_score NUMERIC(5,2) DEFAULT 75.00,
ADD COLUMN IF NOT EXISTS avg_peer_review_score NUMERIC(5,2) DEFAULT 75.00,
ADD COLUMN IF NOT EXISTS avg_engagement_score NUMERIC(5,2) DEFAULT 75.00,
ADD COLUMN IF NOT EXISTS avg_project_involvement_score NUMERIC(5,2) DEFAULT 75.00,
ADD COLUMN IF NOT EXISTS avg_task_completion_score NUMERIC(5,2) DEFAULT 75.00;

-- Set defaults for existing rows
UPDATE team_performance_snapshots SET 
    avg_quality_score = COALESCE(avg_quality_score, 75.00),
    avg_peer_review_score = COALESCE(avg_peer_review_score, 75.00),
    avg_engagement_score = COALESCE(avg_engagement_score, 75.00),
    avg_project_involvement_score = COALESCE(avg_project_involvement_score, 75.00),
    avg_task_completion_score = COALESCE(avg_task_completion_score, 75.00);
