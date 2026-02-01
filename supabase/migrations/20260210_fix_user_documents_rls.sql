-- FIX RLS for user_documents Table
-- Allow Admins to manage all documents, not just their own.

-- 1. Admin Insert
DROP POLICY IF EXISTS "Admins can upload any documents" ON user_documents;
CREATE POLICY "Admins can upload any documents"
ON user_documents FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- 2. Admin Delete
DROP POLICY IF EXISTS "Admins can delete any documents" ON user_documents;
CREATE POLICY "Admins can delete any documents"
ON user_documents FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- 3. Verify Select (already exists but making sure)
DROP POLICY IF EXISTS "Admins can view all documents" ON user_documents;
CREATE POLICY "Admins can view all documents"
ON user_documents FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);
