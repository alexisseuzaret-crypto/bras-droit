-- =====================================================================
-- Schéma dédié : bras_droit
-- Ne pas polluer public (tables hpsj_* déjà présentes)
-- =====================================================================
create schema if not exists bras_droit;
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------
create table bras_droit.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  avatar_color text not null default '#5C6BAA',
  role text not null check (role in ('manager', 'bras_droit')) default 'bras_droit',
  created_at timestamptz not null default now()
);

create table bras_droit.categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  color text not null default '#5C6BAA',
  position int not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

insert into bras_droit.categories (name, color, position) values
  ('Mister IA / Manager', '#1A203D', 0),
  ('BU Licence',          '#7C3AED', 1),
  ('BU Consulting',       '#0EA5E9', 2),
  ('BU Formation',        '#F59E0B', 3),
  ('Personnel',           '#10B981', 4),
  ('Autre',               '#6B7280', 5);

create table bras_droit.tasks (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  status text not null check (status in ('todo', 'in_progress', 'done')) default 'todo',
  priority int not null check (priority between 1 and 5) default 3,
  category_id uuid references bras_droit.categories(id) on delete set null,
  assignee_id uuid references bras_droit.profiles(id) on delete set null,
  creator_id uuid not null references bras_droit.profiles(id) on delete cascade,
  due_date date,
  estimated_minutes int,
  actual_minutes int default 0,
  position int not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_assignee_idx on bras_droit.tasks(assignee_id);
create index tasks_status_idx   on bras_droit.tasks(status);
create index tasks_category_idx on bras_droit.tasks(category_id);

create table bras_droit.task_steps (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references bras_droit.tasks(id) on delete cascade,
  title text not null,
  is_done boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index task_steps_task_idx on bras_droit.task_steps(task_id);

create table bras_droit.calendar_blocks (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references bras_droit.tasks(id) on delete cascade,
  user_id uuid not null references bras_droit.profiles(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  notes text,
  created_at timestamptz not null default now()
);
create index calendar_blocks_user_idx  on bras_droit.calendar_blocks(user_id);
create index calendar_blocks_range_idx on bras_droit.calendar_blocks(start_at, end_at);

create table bras_droit.activity_log (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references bras_droit.tasks(id) on delete cascade,
  user_id uuid not null references bras_droit.profiles(id) on delete cascade,
  action text not null,
  details jsonb,
  created_at timestamptz not null default now()
);
create index activity_log_created_idx on bras_droit.activity_log(created_at desc);

-- ---------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------
create or replace function bras_droit.set_updated_at()
returns trigger as $$ begin new.updated_at = now(); return new; end; $$ language plpgsql;

create trigger tasks_updated_at before update on bras_droit.tasks
  for each row execute function bras_droit.set_updated_at();

create or replace function bras_droit.log_status_change()
returns trigger as $$
begin
  if new.status is distinct from old.status then
    insert into bras_droit.activity_log(task_id, user_id, action, details)
    values (new.id, auth.uid(), 'status_changed',
            jsonb_build_object('from', old.status, 'to', new.status));
    if new.status = 'done' then new.completed_at = now();
    else new.completed_at = null;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger tasks_log_status before update on bras_droit.tasks
  for each row execute function bras_droit.log_status_change();

create or replace function bras_droit.handle_new_user()
returns trigger as $$
begin
  insert into bras_droit.profiles (id, email, full_name, role)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'bras_droit')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created_bras_droit
  after insert on auth.users
  for each row execute function bras_droit.handle_new_user();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table bras_droit.profiles        enable row level security;
alter table bras_droit.categories      enable row level security;
alter table bras_droit.tasks           enable row level security;
alter table bras_droit.task_steps      enable row level security;
alter table bras_droit.calendar_blocks enable row level security;
alter table bras_droit.activity_log    enable row level security;

create or replace function bras_droit.current_user_role()
returns text as $$
  select role from bras_droit.profiles where id = auth.uid();
$$ language sql stable security definer;

-- profiles
create policy "profiles_select_all" on bras_droit.profiles
  for select using (auth.role() = 'authenticated');
create policy "profiles_update_self" on bras_droit.profiles
  for update using (auth.uid() = id);

-- categories
create policy "categories_select" on bras_droit.categories
  for select using (auth.role() = 'authenticated');
create policy "categories_manager_write" on bras_droit.categories
  for all using (bras_droit.current_user_role() = 'manager');

-- tasks
create policy "tasks_select_all" on bras_droit.tasks
  for select using (auth.role() = 'authenticated');
create policy "tasks_insert_auth" on bras_droit.tasks
  for insert with check (auth.uid() = creator_id);
create policy "tasks_update_own_or_mgr" on bras_droit.tasks
  for update using (
    bras_droit.current_user_role() = 'manager'
    or auth.uid() = creator_id
    or auth.uid() = assignee_id
  );
create policy "tasks_delete_own_or_mgr" on bras_droit.tasks
  for delete using (
    bras_droit.current_user_role() = 'manager'
    or auth.uid() = creator_id
  );

-- task_steps
create policy "task_steps_select" on bras_droit.task_steps
  for select using (auth.role() = 'authenticated');
create policy "task_steps_write" on bras_droit.task_steps
  for all using (
    exists (
      select 1 from bras_droit.tasks t
      where t.id = task_steps.task_id
        and (
          bras_droit.current_user_role() = 'manager'
          or auth.uid() = t.creator_id
          or auth.uid() = t.assignee_id
        )
    )
  );

-- calendar_blocks
create policy "calendar_blocks_select" on bras_droit.calendar_blocks
  for select using (auth.role() = 'authenticated');
create policy "calendar_blocks_write_own" on bras_droit.calendar_blocks
  for all using (
    auth.uid() = user_id or bras_droit.current_user_role() = 'manager'
  );

-- activity_log
create policy "activity_log_select" on bras_droit.activity_log
  for select using (auth.role() = 'authenticated');
create policy "activity_log_insert" on bras_droit.activity_log
  for insert with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table bras_droit.tasks;
alter publication supabase_realtime add table bras_droit.task_steps;
alter publication supabase_realtime add table bras_droit.calendar_blocks;
alter publication supabase_realtime add table bras_droit.activity_log;

-- ---------------------------------------------------------------------
-- Grants (exposition API)
-- ---------------------------------------------------------------------
grant usage on schema bras_droit to anon, authenticated, service_role;
grant all on all tables    in schema bras_droit to anon, authenticated, service_role;
grant all on all sequences in schema bras_droit to anon, authenticated, service_role;
grant all on all functions in schema bras_droit to anon, authenticated, service_role;
alter default privileges in schema bras_droit grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema bras_droit grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema bras_droit grant all on functions to anon, authenticated, service_role;
