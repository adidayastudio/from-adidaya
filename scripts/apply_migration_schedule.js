const { execSync } = require('child_process');

console.log("Applying Schedule System Migration...");

const statements = [
    // 1. Create Items Table
    `CREATE TABLE IF NOT EXISTS project_schedule_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        wbs_id UUID NOT NULL REFERENCES work_breakdown_structure(id) ON DELETE CASCADE,
        duration_ballpark NUMERIC,
        duration_estimates NUMERIC,
        duration_detail NUMERIC,
        start_date DATE,
        end_date DATE,
        manual_start_date DATE,
        manual_end_date DATE,
        progress_percentage NUMERIC(5,2) DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
        weight_percentage NUMERIC(5,2) DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT uq_schedule_wbs UNIQUE (wbs_id)
    );`,

    // 2. Indexes for Items
    `CREATE INDEX IF NOT EXISTS idx_schedule_items_project ON project_schedule_items(project_id);`,
    `CREATE INDEX IF NOT EXISTS idx_schedule_items_wbs ON project_schedule_items(wbs_id);`,

    // 3. Create Dependencies Table
    `CREATE TABLE IF NOT EXISTS project_schedule_dependencies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        predecessor_wbs_id UUID NOT NULL REFERENCES work_breakdown_structure(id) ON DELETE CASCADE,
        successor_wbs_id UUID NOT NULL REFERENCES work_breakdown_structure(id) ON DELETE CASCADE,
        dependency_type TEXT NOT NULL DEFAULT 'FS' CHECK (dependency_type IN ('FS', 'SS', 'FF', 'SF')),
        lag_days NUMERIC DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT uq_schedule_dependency UNIQUE (predecessor_wbs_id, successor_wbs_id)
    );`,

    // 4. Indexes for Dependencies
    `CREATE INDEX IF NOT EXISTS idx_schedule_deps_project ON project_schedule_dependencies(project_id);`,
    `CREATE INDEX IF NOT EXISTS idx_schedule_deps_succ ON project_schedule_dependencies(successor_wbs_id);`,

    // 5. Trigger Function
    `CREATE OR REPLACE FUNCTION handle_new_wbs_item()
    RETURNS TRIGGER AS $$
    BEGIN
        INSERT INTO project_schedule_items (project_id, wbs_id)
        VALUES (NEW.project_id, NEW.id)
        ON CONFLICT (wbs_id) DO NOTHING;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;`,

    // 6. Trigger
    `DROP TRIGGER IF EXISTS trigger_create_schedule_item ON work_breakdown_structure;`,
    `CREATE TRIGGER trigger_create_schedule_item
    AFTER INSERT ON work_breakdown_structure
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_wbs_item();`,

    // 7. Backfill
    `INSERT INTO project_schedule_items (project_id, wbs_id)
    SELECT project_id, id FROM work_breakdown_structure
    ON CONFLICT (wbs_id) DO NOTHING;`,

    // 8. RLS
    `ALTER TABLE project_schedule_items ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE project_schedule_dependencies ENABLE ROW LEVEL SECURITY;`,
    `DROP POLICY IF EXISTS "Enable all access for authenticated users" ON project_schedule_items;`,
    `CREATE POLICY "Enable all access for authenticated users" ON project_schedule_items FOR ALL TO authenticated USING (true) WITH CHECK (true);`,
    `DROP POLICY IF EXISTS "Enable all access for authenticated users" ON project_schedule_dependencies;`,
    `CREATE POLICY "Enable all access for authenticated users" ON project_schedule_dependencies FOR ALL TO authenticated USING (true) WITH CHECK (true);`,

    // 9. Realtime
    `ALTER PUBLICATION supabase_realtime ADD TABLE project_schedule_items;`,
    `ALTER PUBLICATION supabase_realtime ADD TABLE project_schedule_dependencies;`
];

for (const sql of statements) {
    try {
        console.log(`Executing: ${sql.substring(0, 50)}...`);
        // Escape double quotes in SQL for shell command
        const cleanSql = sql.replace(/"/g, '\\"');
        execSync(`npx supabase db psql -c "${cleanSql}"`, { stdio: 'inherit' });
    } catch (e) {
        console.error("Error executing statement:", e.message);
    }
}

console.log("Migration complete.");
