-- Add unique constraint on job_card_id and control_point_no for upsert support
-- This allows updating existing records when the same control point is saved again

ALTER TABLE free_check_results 
ADD CONSTRAINT free_check_results_job_card_point_unique 
UNIQUE (job_card_id, control_point_no);
