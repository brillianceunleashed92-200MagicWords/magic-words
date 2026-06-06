-- Run in Supabase SQL Editor
-- Adds parent-child account linking and class member tracking

-- Parent-child links: a parent account links to one or more child accounts
CREATE TABLE IF NOT EXISTS parent_child_links (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_name  text,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(parent_id, child_id)
);

ALTER TABLE parent_child_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can read their child links"
  ON parent_child_links FOR SELECT
  USING (auth.uid() = parent_id);

CREATE POLICY "Parents can insert child links"
  ON parent_child_links FOR INSERT
  WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Parents can delete their child links"
  ON parent_child_links FOR DELETE
  USING (auth.uid() = parent_id);

-- Class members: students who have joined a teacher's class
CREATE TABLE IF NOT EXISTS class_members (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    uuid        NOT NULL REFERENCES teacher_classes(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at   timestamptz DEFAULT now(),
  UNIQUE(class_id, user_id)
);

ALTER TABLE class_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can read their class members"
  ON class_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teacher_classes tc
      WHERE tc.id = class_members.class_id
        AND tc.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can insert themselves into a class"
  ON class_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can read their own memberships"
  ON class_members FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Students can leave a class"
  ON class_members FOR DELETE
  USING (auth.uid() = user_id);
