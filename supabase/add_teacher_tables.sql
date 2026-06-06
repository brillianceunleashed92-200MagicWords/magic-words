-- Run in Supabase SQL Editor: Dashboard → SQL Editor → New query → Run

create table if not exists teacher_classes (
  id           bigserial   primary key,
  teacher_id   uuid        not null references auth.users(id) on delete cascade,
  class_name   text        not null,
  class_code   text        not null unique,
  created_at   timestamptz not null default now()
);

create table if not exists class_members (
  id         bigserial   primary key,
  class_id   bigint      not null references teacher_classes(id) on delete cascade,
  student_id uuid        not null references auth.users(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  unique (class_id, student_id)
);

alter table teacher_classes enable row level security;
alter table class_members   enable row level security;

-- Teachers can manage their own classes
create policy "Teachers manage own classes"
  on teacher_classes for all
  using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);

-- Teachers can see their class members; students can see classes they belong to
create policy "Teachers see class members"
  on class_members for select
  using (
    auth.uid() = student_id
    or exists (
      select 1 from teacher_classes tc
      where tc.id = class_id and tc.teacher_id = auth.uid()
    )
  );

-- Students can join a class
create policy "Students join classes"
  on class_members for insert
  with check (auth.uid() = student_id);
