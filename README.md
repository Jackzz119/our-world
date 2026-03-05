# Vite + React + Supabase

This project now includes a practical Supabase API layer:

- `src/lib/supabase.ts`: Supabase client initialization and env validation
- `src/services/todos.service.ts`: data access layer for `todos`
- `src/hooks/useTodos.ts`: React hook for UI state + operations
- `src/types/database.ts`: local table typing

## 1) Environment Variables

Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

Fill in:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Important:
- `VITE_*` variables are exposed to browser code.
- Never put `service_role` key in Vite frontend env.

## 2) Supabase SQL (Table + RLS)

Run this in the Supabase SQL editor:

```sql
create extension if not exists "pgcrypto";

create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) > 0),
  is_completed boolean not null default false,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.todos enable row level security;

create policy "select own todos"
on public.todos
for select
to authenticated
using (auth.uid() = user_id);

create policy "insert own todos"
on public.todos
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "update own todos"
on public.todos
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "delete own todos"
on public.todos
for delete
to authenticated
using (auth.uid() = user_id);
```

If you want to test quickly without auth, add temporary anon policies, but remove them before production.

## 3) Run

```bash
pnpm install
pnpm dev
```

## 4) Next Step (Recommended)

1. Add auth (`supabase.auth.signInWithPassword`, OAuth, etc.).
2. When creating todo, pass current user id into `user_id`.
3. Generate TS types from Supabase schema and replace local `src/types/database.ts`.
