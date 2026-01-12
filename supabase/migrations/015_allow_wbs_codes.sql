-- Remove Foreign Key constraint on discipline_code in class_discipline_values
-- This is necessary to allow storing costs for WBS sub-items (e.g. 'S.1', 'A.2.1') 
-- which are defined in the WBS JSON structure but not as top-level rows in the 'disciplines' table.

DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'class_discipline_values_discipline_code_fkey'
        AND table_name = 'class_discipline_values'
    ) THEN
        ALTER TABLE "class_discipline_values" DROP CONSTRAINT "class_discipline_values_discipline_code_fkey";
    END IF;
END $$;
