-- Add overtime_daily_rate column (Upah hari minggu/lembur)
DO $$ BEGIN
    ALTER TABLE crew_members ADD COLUMN overtime_daily_rate NUMERIC(15,2) DEFAULT 0;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Truncate existing data to start fresh (optional, but good for seeding clean state if requested)
-- TRUNCATE TABLE crew_members CASCADE; -- Commented out to be safe, user asked to "masukkan data", assuming append or clean. Let's append but check for duplicates if needed differently. 
-- Actually, let's just insert. Since names are unique enough for this list.

DO $$
DECLARE
    ws_id UUID;
    -- Project Codes from user request
    p_prg TEXT := 'PRG';
    p_jpf TEXT := 'JPF';
    p_tpc TEXT := 'TPC';
    p_lax TEXT := 'LAX';
    p_rbh TEXT := 'RBH';
    
    -- Variables for insertion
    c_id UUID;
    
BEGIN
    -- Get default workspace (assuming first one found)
    SELECT id INTO ws_id FROM workspaces LIMIT 1;

    -- Insert Crew Members & Assignments
    
    -- 1. AKSIN (HELPER, PRG)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'AKSIN', 'HELPER', 'ACTIVE', p_prg, 150000, 185000, 25000, 25000, 30000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_prg, '2026-01-01', '2026-01-31', 'ongoing');

    -- 2. ARIF (SKILLED, PRG)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'ARIF', 'SKILLED', 'ACTIVE', p_prg, 200000, 248000, 34000, 34000, 41000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_prg, '2026-01-01', '2026-01-31', 'ongoing');

    -- 3. DAKIR (SKILLED, PRG)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'DAKIR', 'SKILLED', 'ACTIVE', p_prg, 200000, 248000, 34000, 34000, 41000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_prg, '2026-01-01', '2026-01-31', 'ongoing');

    -- 4. DARNO (SKILLED, PRG)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'DARNO', 'SKILLED', 'ACTIVE', p_prg, 200000, 248000, 34000, 34000, 41000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_prg, '2026-01-01', '2026-01-31', 'ongoing');

    -- 5. DARSO (SKILLED, PRG)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'DARSO', 'SKILLED', 'ACTIVE', p_prg, 200000, 248000, 34000, 34000, 41000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_prg, '2026-01-01', '2026-01-31', 'ongoing');

    -- 6. FAUZAN (SKILLED, PRG)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'FAUZAN', 'SKILLED', 'ACTIVE', p_prg, 200000, 248000, 34000, 34000, 41000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_prg, '2026-01-01', '2026-01-31', 'ongoing');

    -- 7. FERI (HELPER, PRG)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'FERI', 'HELPER', 'ACTIVE', p_prg, 150000, 185000, 25000, 25000, 30000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_prg, '2026-01-01', '2026-01-31', 'ongoing');

    -- 8. IFAN (SKILLED, PRG)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'IFAN', 'SKILLED', 'ACTIVE', p_prg, 200000, 248000, 34000, 34000, 41000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_prg, '2026-01-01', '2026-01-31', 'ongoing');

    -- 9. MIFTAHUL (HELPER, PRG)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'MIFTAHUL', 'HELPER', 'ACTIVE', p_prg, 150000, 185000, 25000, 25000, 30000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_prg, '2026-01-01', '2026-01-31', 'ongoing');

    -- 10. NELI (SKILLED, PRG)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'NELI', 'SKILLED', 'ACTIVE', p_prg, 200000, 248000, 34000, 34000, 41000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_prg, '2026-01-01', '2026-01-31', 'ongoing');

    -- 11. NURUDIN (SKILLED, PRG)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'NURUDIN', 'SKILLED', 'ACTIVE', p_prg, 200000, 248000, 34000, 34000, 41000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_prg, '2026-01-01', '2026-01-31', 'ongoing');

    -- 12. NURUL (SKILLED, PRG)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'NURUL', 'SKILLED', 'ACTIVE', p_prg, 200000, 248000, 34000, 34000, 41000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_prg, '2026-01-01', '2026-01-31', 'ongoing');

    -- 13. PUPUT (HELPER, PRG)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'PUPUT', 'HELPER', 'ACTIVE', p_prg, 150000, 185000, 25000, 25000, 30000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_prg, '2026-01-01', '2026-01-31', 'ongoing');

    -- 14. ROBBY (HELPER, PRG)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'ROBBY', 'HELPER', 'ACTIVE', p_prg, 150000, 185000, 25000, 25000, 30000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_prg, '2026-01-01', '2026-01-31', 'ongoing');

    -- 15. VERIAWAN (SKILLED, PRG)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'VERIAWAN', 'SKILLED', 'ACTIVE', p_prg, 200000, 248000, 34000, 34000, 41000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_prg, '2026-01-01', '2026-01-31', 'ongoing');

    -- 16. WARDI (SKILLED, PRG)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'WARDI', 'SKILLED', 'ACTIVE', p_prg, 200000, 248000, 34000, 34000, 41000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_prg, '2026-01-01', '2026-01-31', 'ongoing');

    -- 17. WASITO (SKILLED, PRG)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'WASITO', 'SKILLED', 'ACTIVE', p_prg, 200000, 248000, 34000, 34000, 41000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_prg, '2026-01-01', '2026-01-31', 'ongoing');

    -- 18. YONO (SKILLED, PRG)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'YONO', 'SKILLED', 'ACTIVE', p_prg, 200000, 248000, 34000, 34000, 41000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_prg, '2026-01-01', '2026-01-31', 'ongoing');

    -- 19. ZAINAL (HELPER, PRG)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'ZAINAL', 'HELPER', 'ACTIVE', p_prg, 150000, 185000, 25000, 25000, 30000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_prg, '2026-01-01', '2026-01-31', 'ongoing');

    -- 20. KHARIS (HELPER, PRG)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'KHARIS', 'HELPER', 'ACTIVE', p_prg, 150000, 185000, 25000, 25000, 30000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_prg, '2026-01-01', '2026-01-31', 'ongoing');

    -- 21. ANDI (HELPER, PRG) (Note: Dup name ANDI appears later as row 55, keeping both)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'ANDI', 'HELPER', 'ACTIVE', p_prg, 150000, 185000, 25000, 25000, 30000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_prg, '2026-01-01', '2026-01-31', 'ongoing');

    -- 22. TARYONO (SKILLED, JPF)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'TARYONO', 'SKILLED', 'ACTIVE', p_jpf, 200000, 248000, 34000, 34000, 41000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_jpf, '2026-01-01', '2026-01-31', 'ongoing');

    -- 23. WALUYO (SKILLED, JPF)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'WALUYO', 'SKILLED', 'ACTIVE', p_jpf, 200000, 248000, 34000, 34000, 41000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_jpf, '2026-01-01', '2026-01-31', 'ongoing');

    -- 24. DOHIR (SKILLED, JPF)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'DOHIR', 'SKILLED', 'ACTIVE', p_jpf, 200000, 248000, 34000, 34000, 41000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_jpf, '2026-01-01', '2026-01-31', 'ongoing');

    -- 25. HASIM (HELPER, JPF)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'HASIM', 'HELPER', 'ACTIVE', p_jpf, 150000, 185000, 25000, 25000, 30000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_jpf, '2026-01-01', '2026-01-31', 'ongoing');

    -- 26. FAIZAL (HELPER, JPF)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'FAIZAL', 'HELPER', 'ACTIVE', p_jpf, 150000, 185000, 25000, 25000, 30000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_jpf, '2026-01-01', '2026-01-31', 'ongoing');

    -- 27. JEFRY (HELPER, JPF)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'JEFRY', 'HELPER', 'ACTIVE', p_jpf, 150000, 185000, 25000, 25000, 30000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_jpf, '2026-01-01', '2026-01-31', 'ongoing');

    -- 28. DARMONO (SKILLED, JPF)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'DARMONO', 'SKILLED', 'ACTIVE', p_jpf, 200000, 248000, 34000, 34000, 41000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_jpf, '2026-01-01', '2026-01-31', 'ongoing');

    -- 29. JUDEN (SKILLED, JPF)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'JUDEN', 'SKILLED', 'ACTIVE', p_jpf, 200000, 248000, 34000, 34000, 41000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_jpf, '2026-01-01', '2026-01-31', 'ongoing');

    -- 30. SAMURI (SKILLED, JPF)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'SAMURI', 'SKILLED', 'ACTIVE', p_jpf, 200000, 248000, 34000, 34000, 41000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_jpf, '2026-01-01', '2026-01-31', 'ongoing');

    -- 31. RICO (HELPER, JPF)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'RICO', 'HELPER', 'ACTIVE', p_jpf, 150000, 185000, 25000, 25000, 30000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_jpf, '2026-01-01', '2026-01-31', 'ongoing');

    -- 32. SUGENG (HELPER, JPF)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'SUGENG', 'HELPER', 'ACTIVE', p_jpf, 150000, 185000, 25000, 25000, 30000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_jpf, '2026-01-01', '2026-01-31', 'ongoing');

    -- 33. ANDRI (SKILLED, JPF)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'ANDRI', 'SKILLED', 'ACTIVE', p_jpf, 200000, 248000, 34000, 34000, 41000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_jpf, '2026-01-01', '2026-01-31', 'ongoing');

    -- 34. UMAR (HELPER, JPF)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'UMAR', 'HELPER', 'ACTIVE', p_jpf, 150000, 185000, 25000, 25000, 30000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_jpf, '2026-01-01', '2026-01-31', 'ongoing');

    -- 35. EDI PURWANTO (SKILLED, JPF)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'EDI PURWANTO', 'SKILLED', 'ACTIVE', p_jpf, 200000, 248000, 34000, 34000, 41000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_jpf, '2026-01-01', '2026-01-31', 'ongoing');

    -- 36. SUWITO (SKILLED, JPF)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'SUWITO', 'SKILLED', 'ACTIVE', p_jpf, 200000, 248000, 34000, 34000, 41000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_jpf, '2026-01-01', '2026-01-31', 'ongoing');

    -- 37. SUGITO (SKILLED, JPF)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'SUGITO', 'SKILLED', 'ACTIVE', p_jpf, 200000, 248000, 34000, 34000, 41000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_jpf, '2026-01-01', '2026-01-31', 'ongoing');

    -- 38. ARIS SUSANTO (HELPER, JPF)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'ARIS SUSANTO', 'HELPER', 'ACTIVE', p_jpf, 150000, 185000, 25000, 25000, 30000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_jpf, '2026-01-01', '2026-01-31', 'ongoing');

    -- 39. HARMANTO (HELPER, JPF)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'HARMANTO', 'HELPER', 'ACTIVE', p_jpf, 150000, 185000, 25000, 25000, 30000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_jpf, '2026-01-01', '2026-01-31', 'ongoing');

    -- 40. MURYANTO (HELPER, JPF)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'MURYANTO', 'HELPER', 'ACTIVE', p_jpf, 150000, 185000, 25000, 25000, 30000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_jpf, '2026-01-01', '2026-01-31', 'ongoing');

    -- 41. SINYO (HELPER, JPF)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'SINYO', 'HELPER', 'ACTIVE', p_jpf, 150000, 185000, 25000, 25000, 30000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_jpf, '2026-01-01', '2026-01-31', 'ongoing');

    -- 42. HERU (SKILLED, TPC)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'HERU', 'SKILLED', 'ACTIVE', p_tpc, 200000, 248000, 34000, 34000, 41000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_tpc, '2026-01-01', '2026-01-31', 'ongoing');

    -- 43. MUKSININ (SKILLED, TPC)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'MUKSININ', 'SKILLED', 'ACTIVE', p_tpc, 200000, 248000, 34000, 34000, 41000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_tpc, '2026-01-01', '2026-01-31', 'ongoing');

    -- 44. NDONO (HELPER, TPC)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'NDONO', 'HELPER', 'ACTIVE', p_tpc, 150000, 185000, 25000, 25000, 30000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_tpc, '2026-01-01', '2026-01-31', 'ongoing');

    -- 45. YUSUP (HELPER, TPC)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'YUSUP', 'HELPER', 'ACTIVE', p_tpc, 150000, 185000, 25000, 25000, 30000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_tpc, '2026-01-01', '2026-01-31', 'ongoing');

    -- 46. ALI (SKILLED, LAX)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'ALI', 'SKILLED', 'ACTIVE', p_lax, 200000, 248000, 34000, 34000, 41000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_lax, '2026-01-01', '2026-01-31', 'ongoing');

    -- 47. FARIHIN (SKILLED, LAX)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'FARIHIN', 'SKILLED', 'ACTIVE', p_lax, 200000, 248000, 34000, 34000, 41000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_lax, '2026-01-01', '2026-01-31', 'ongoing');

    -- 48. ARIFIN (SKILLED, LAX)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'ARIFIN', 'SKILLED', 'ACTIVE', p_lax, 200000, 248000, 34000, 34000, 41000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_lax, '2026-01-01', '2026-01-31', 'ongoing');

    -- 49. YANSAH (SKILLED, LAX)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'YANSAH', 'SKILLED', 'ACTIVE', p_lax, 200000, 248000, 34000, 34000, 41000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_lax, '2026-01-01', '2026-01-31', 'ongoing');

    -- 50. SEPNU (SKILLED, LAX)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'SEPNU', 'SKILLED', 'ACTIVE', p_lax, 200000, 248000, 34000, 34000, 41000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_lax, '2026-01-01', '2026-01-31', 'ongoing');

    -- 51. MUH (HELPER, LAX)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'MUH', 'HELPER', 'ACTIVE', p_lax, 150000, 185000, 25000, 25000, 30000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_lax, '2026-01-01', '2026-01-31', 'ongoing');

    -- 52. ASNGAD (HELPER, LAX)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'ASNGAD', 'HELPER', 'ACTIVE', p_lax, 150000, 185000, 25000, 25000, 30000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_lax, '2026-01-01', '2026-01-31', 'ongoing');

    -- 53. MAMAT (HELPER, LAX)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'MAMAT', 'HELPER', 'ACTIVE', p_lax, 150000, 185000, 25000, 25000, 30000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_lax, '2026-01-01', '2026-01-31', 'ongoing');

    -- 54. UNTUNG (HELPER, LAX)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'UNTUNG', 'HELPER', 'ACTIVE', p_lax, 150000, 185000, 25000, 25000, 30000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_lax, '2026-01-01', '2026-01-31', 'ongoing');

    -- 55. ANDRI (HELPER, LAX) (Duplicate name Andri from row 33 but helper and LAX)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'ANDRI', 'HELPER', 'ACTIVE', p_lax, 150000, 185000, 25000, 25000, 30000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_lax, '2026-01-01', '2026-01-31', 'ongoing');

    -- 56. SARWONO (HELPER, LAX)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'SARWONO', 'HELPER', 'ACTIVE', p_lax, 150000, 185000, 25000, 25000, 30000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_lax, '2026-01-01', '2026-01-31', 'ongoing');

    -- 57. ADE (HELPER, LAX)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'ADE', 'HELPER', 'ACTIVE', p_lax, 150000, 185000, 25000, 25000, 30000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_lax, '2026-01-01', '2026-01-31', 'ongoing');

    -- 58. KUAT (MANDOR, RBH)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'KUAT', 'FOREMAN', 'ACTIVE', p_rbh, 180000, 215000, 30000, 30000, 36000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_rbh, '2026-01-01', '2026-01-31', 'ongoing');

    -- 59. DANSIRI (KEPALA TUKANG, RBH)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'DANSIRI', 'LEADER', 'ACTIVE', p_rbh, 165000, 195000, 27500, 27500, 33000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_rbh, '2026-01-01', '2026-01-31', 'ongoing');

    -- 60. PARDI (SKILLED, RBH)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'PARDI', 'SKILLED', 'ACTIVE', p_rbh, 150000, 180000, 25000, 25000, 30000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_rbh, '2026-01-01', '2026-01-31', 'ongoing');

    -- 61. WAHYUDI (SKILLED, RBH)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'WAHYUDI', 'SKILLED', 'ACTIVE', p_rbh, 150000, 180000, 25000, 25000, 30000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_rbh, '2026-01-01', '2026-01-31', 'ongoing');

    -- 62. MUSTAQIM (SKILLED, RBH)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'MUSTAQIM', 'SKILLED', 'ACTIVE', p_rbh, 150000, 180000, 25000, 25000, 30000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_rbh, '2026-01-01', '2026-01-31', 'ongoing');

    -- 63. RENDY (SKILLED, RBH)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'RENDY', 'SKILLED', 'ACTIVE', p_rbh, 150000, 180000, 25000, 25000, 30000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_rbh, '2026-01-01', '2026-01-31', 'ongoing');

    -- 64. MUSAT (SKILLED, RBH)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'MUSAT', 'SKILLED', 'ACTIVE', p_rbh, 150000, 180000, 25000, 25000, 30000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_rbh, '2026-01-01', '2026-01-31', 'ongoing');

    -- 65. ALFANO (HELPER, RBH)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'ALFANO', 'HELPER', 'ACTIVE', p_rbh, 115000, 135000, 17500, 17500, 21000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_rbh, '2026-01-01', '2026-01-31', 'ongoing');

    -- 66. PANGAT (HELPER, RBH)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'PANGAT', 'HELPER', 'ACTIVE', p_rbh, 115000, 135000, 17500, 17500, 21000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_rbh, '2026-01-01', '2026-01-31', 'ongoing');

    -- 67. FAHRULROJI (HELPER, RBH)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'FAHRULROJI', 'HELPER', 'ACTIVE', p_rbh, 115000, 135000, 17500, 17500, 21000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_rbh, '2026-01-01', '2026-01-31', 'ongoing');

    -- 68. ICHSANUDIN (HELPER, RBH)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'ICHSANUDIN', 'HELPER', 'ACTIVE', p_rbh, 115000, 135000, 17500, 17500, 21000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_rbh, '2026-01-01', '2026-01-31', 'ongoing');

    -- 69. RIKI (HELPER, RBH)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'RIKI', 'HELPER', 'ACTIVE', p_rbh, 115000, 135000, 17500, 17500, 21000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_rbh, '2026-01-01', '2026-01-31', 'ongoing');

    -- 70. BAGUS (HELPER, RBH)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'BAGUS', 'HELPER', 'ACTIVE', p_rbh, 115000, 135000, 17500, 17500, 21000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_rbh, '2026-01-01', '2026-01-31', 'ongoing');

    -- 71. ILHAM (HELPER, RBH)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'ILHAM', 'HELPER', 'ACTIVE', p_rbh, 115000, 135000, 17500, 17500, 21000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_rbh, '2026-01-01', '2026-01-31', 'ongoing');

    -- 72. SAIFUL (HELPER, RBH)
    INSERT INTO crew_members (workspace_id, name, role, status, current_project_code, base_daily_rate, overtime_daily_rate, ot_rate_1, ot_rate_2, ot_rate_3)
    VALUES (ws_id, 'SAIFUL', 'HELPER', 'ACTIVE', p_rbh, 115000, 135000, 17500, 17500, 21000) RETURNING id INTO c_id;
    INSERT INTO crew_project_history (crew_member_id, project_code, start_date, end_date, status) VALUES (c_id, p_rbh, '2026-01-01', '2026-01-31', 'ongoing');

END $$;
