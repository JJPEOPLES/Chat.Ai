create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'New conversation',
  memory text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  tool_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  file_name text not null,
  mime_type text not null,
  file_size bigint not null,
  storage_path text,
  extracted_text text,
  transcript text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.attachments enable row level security;

create policy "profiles_select_own" on public.profiles
for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = id);

create policy "conversations_own_all" on public.conversations
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "messages_own_all" on public.messages
for all using (
  exists (
    select 1 from public.conversations
    where public.conversations.id = conversation_id
      and public.conversations.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.conversations
    where public.conversations.id = conversation_id
      and public.conversations.user_id = auth.uid()
  )
);

create policy "attachments_own_all" on public.attachments
for all using (
  exists (
    select 1
    from public.messages
    join public.conversations on public.conversations.id = public.messages.conversation_id
    where public.messages.id = message_id
      and public.conversations.user_id = auth.uid()
  )
) with check (
  exists (
    select 1
    from public.messages
    join public.conversations on public.conversations.id = public.messages.conversation_id
    where public.messages.id = message_id
      and public.conversations.user_id = auth.uid()
  )
);
