-- 1. Restore mangled descriptions in purchasing_requests
-- Uses the full list of item names from the breakdown items
UPDATE purchasing_requests pr
SET description = COALESCE(
    (
        SELECT string_agg(name, ', ')
        FROM purchasing_items pi
        WHERE pi.request_id = pr.id
        AND pi.name IS NOT NULL
    ),
    description
)
WHERE description LIKE '% + % more';

-- 2. Restore mangled descriptions in reimbursement_requests
UPDATE reimbursement_requests rr
SET description = COALESCE(
    (
        SELECT string_agg(name, ', ')
        FROM reimbursement_items ri
        WHERE ri.reimbursement_id = rr.id
        AND ri.name IS NOT NULL
    ),
    description
)
WHERE description LIKE '% + % more';
