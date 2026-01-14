-- Add rating column to crew_daily_logs
ALTER TABLE crew_daily_logs 
ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5);

-- Comment explaining the column
COMMENT ON COLUMN crew_daily_logs.rating IS 'Daily performance rating (1-5): 1=Sangat Kurang, 2=Kurang, 3=Cukup, 4=Baik, 5=Sangat Baik';
