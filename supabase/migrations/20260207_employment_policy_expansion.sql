-- Create work_schedules table
CREATE TABLE IF NOT EXISTS work_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Fixed', 'Shift', 'Flexible')), 
    days_config JSONB NOT NULL DEFAULT '{}'::jsonb, -- Store specific days (e.g., Sat half day) or "4 days/week" logic
    start_time TIME WITHOUT TIME ZONE, -- Default start
    end_time TIME WITHOUT TIME ZONE,   -- Default end
    break_duration_minutes INTEGER DEFAULT 60,
    timezone TEXT DEFAULT 'Asia/Jakarta',
    description TEXT,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create leave_policies table
CREATE TABLE IF NOT EXISTS leave_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    annual_leave_quota INTEGER NOT NULL DEFAULT 0,
    sick_leave_quota INTEGER NOT NULL DEFAULT 0,
    permission_quota INTEGER NOT NULL DEFAULT 0,
    -- Expanded accrual types
    accrual_type TEXT NOT NULL DEFAULT 'Per Year' CHECK (accrual_type IN ('Per Year', 'Monthly', 'None', 'Pro-rated (Year-based)', 'Pro-rated (Quadratic)')),
    carry_over_allowed BOOLEAN NOT NULL DEFAULT false,
    max_carry_over_days INTEGER DEFAULT 0,
    -- JSON config for advanced rules:
    -- { 
    --   "monthly_limit": 2, 
    --   "consecutive_limit": 2, 
    --   "wfa_allowed": true, 
    --   "missed_work_replacement_rule": boolean 
    -- }
    policy_config JSONB DEFAULT '{}'::jsonb, 
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add Foreign Keys to profiles (to persist the relationship model)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS work_schedule_id UUID REFERENCES work_schedules(id),
ADD COLUMN IF NOT EXISTS leave_policy_id UUID REFERENCES leave_policies(id);

-- RLS
ALTER TABLE work_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_policies ENABLE ROW LEVEL SECURITY;

-- Policies for work_schedules
CREATE POLICY "View Work Schedules" ON work_schedules FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Manage Work Schedules" ON work_schedules FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role::text IN ('admin', 'supervisor', 'superadmin', 'hr'))
);

-- Policies for leave_policies
CREATE POLICY "View Leave Policies" ON leave_policies FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Manage Leave Policies" ON leave_policies FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role::text IN ('admin', 'supervisor', 'superadmin', 'hr'))
);

-- Seed Default Work Schedules

-- 1. Full Time A
INSERT INTO work_schedules (name, type, start_time, end_time, break_duration_minutes, days_config) VALUES
(
    'Full Time A', 
    'Fixed', 
    '08:00', 
    '17:00', 
    60,
    '{"working_days": ["Mon", "Tue", "Wed", "Thu", "Fri"]}'::jsonb
);

-- 2. Full Time B
INSERT INTO work_schedules (name, type, start_time, end_time, break_duration_minutes, days_config) VALUES
(
    'Full Time B', 
    'Fixed', -- Technically Fixed but with varying hours, we can mark it Fixed and put specifics in config or UI logic
    '09:00', 
    '17:00', 
    60,
    '{
        "working_days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        "custom_hours": {
            "Sat": {"start": "09:00", "end": "14:00", "break": 0}
        }
    }'::jsonb
);

-- 3. Part Time
INSERT INTO work_schedules (name, type, start_time, end_time, break_duration_minutes, days_config) VALUES
(
    'Part Time', 
    'Flexible', 
    '09:00', 
    '17:00', 
    60,
    '{"days_per_week": 4, "flexible_selection": true}'::jsonb
);

-- 4. Internship
INSERT INTO work_schedules (name, type, start_time, end_time, break_duration_minutes, days_config) VALUES
(
    'Internship', 
    'Flexible', 
    '09:00', 
    '17:00', 
    60,
    '{"days_per_week": 4, "flexible_selection": true}'::jsonb
);


-- Seed Default Leave Policies

-- 1. Internship Leave Policy
INSERT INTO leave_policies (name, description, annual_leave_quota, sick_leave_quota, permission_quota, accrual_type, policy_config) VALUES
(
    'Internship', 
    'Missed working day must be replaced within the same or following week.',
    0, 0, 0, 
    'None',
    '{"missed_work_replacement_rule": true}'::jsonb
);

-- 2. Freelance Leave Policy
INSERT INTO leave_policies (name, description, annual_leave_quota, sick_leave_quota, permission_quota, accrual_type, policy_config) VALUES
(
    'Freelance', 
    'Allowed to request WFA (Work From Anywhere).',
    0, 0, 0, 
    'None',
    '{"wfa_allowed": true}'::jsonb
);

-- 3. Probation & Outsource Leave Policy
INSERT INTO leave_policies (name, description, annual_leave_quota, sick_leave_quota, permission_quota, accrual_type, policy_config) VALUES
(
    'Probation & Outsource', 
    'Permission / Personal Leave: Max 2 days per month.',
    0, 0, 0, -- Quota 0 for others? "Permission... Max 2 days". Usually implies quota is logically limited by month, not year. Let's say 24/yr or just 0 and use limit.
             -- Requirement says "Permission / Personal Leave Quota: Max 2 days per month". This works like a quota.
             -- Let's put a high cap or 24/year and enforce monthly limit in UI/Backend.
             -- Or store 0 and rely on policy_config?
             -- "Accrual Type: Monthly".
             -- Let's set permission_quota to 24 (2*12) or 0 and use dynamic check.
             -- I will set 0 here to match "No quota" concept if it's "Permission" which is often unpaid or separate.
             -- BUT user says "Permission / Personal Leave Quota: Max 2 days per month".
             -- If it's a quota, it should probably have a number.
             -- I'll stick to 0 in standard column and put strict rule in config. 
    'Monthly',
    '{"monthly_permission_limit": 2}'::jsonb
);

-- 4. Full Time (< 1 Year)
INSERT INTO leave_policies (name, description, annual_leave_quota, sick_leave_quota, permission_quota, accrual_type, policy_config) VALUES
(
    'Full Time – Under 1 Year', 
    'Annual leave is calculated quadratically based on active months.',
    0, -- Calculated dynamically
    10, -- Default sick? Not specified, assume standard or 0. User says "Annual Leave Quota: Calculated". 
        -- User didn't specify Sick/Perm for this one. I will assume 0 or standard. 
        -- I'll leave 0 for now to be safe, easier to edit later.
    0,
    'Pro-rated (Quadratic)',
    '{"monthly_leave_limit": 2}'::jsonb
);

-- 5. Full Time (>= 1 Year)
INSERT INTO leave_policies (name, description, annual_leave_quota, sick_leave_quota, permission_quota, accrual_type, carry_over_allowed, max_carry_over_days, policy_config) VALUES
(
    'Full Time – 1 Year and Above', 
    'Standard full time leave policy.',
    12, 
    10, -- Assuming standard
    5, -- Standard
    'Per Year',
    false, -- "Carry Over Rule: Allowed / Not Allowed" -> User summary says "Allowed" in previous prompts for Executive, here "Rules... Max 2 consecutive".
           -- Requirement says "Accrual Type: Yearly". "Annual Leave Quota: 12 days". "Monthly Limit: Max 4 days".
           -- Doesn't mention Carry Over explicitly in the "Default Data" section for this specific policy, 
           -- but previous prompts mentioned Carry Over.
           -- I'll default to False unless specified.
    0,
    '{"monthly_leave_limit": 4, "consecutive_limit": 2, "max_non_consecutive_days": 4}'::jsonb
);
