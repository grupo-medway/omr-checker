-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  name TEXT NOT NULL,
  school TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own profile
CREATE POLICY "users_select_own" ON users
    FOR SELECT
    TO authenticated
    USING (id = (select auth.uid()));

-- Policy 2: Users can update their own profile
CREATE POLICY "users_update_own" ON users
    FOR UPDATE
    TO authenticated
    USING (id = (select auth.uid()))
    WITH CHECK (id = (select auth.uid()));
