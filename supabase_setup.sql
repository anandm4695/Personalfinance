-- Create the table for storing user state
create table public.user_state (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null unique,
  data jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table public.user_state enable row level security;

-- Create policies so users can only access their own data
create policy "Users can view own state."
  on user_state for select
  using ( auth.uid() = user_id );

create policy "Users can insert own state."
  on user_state for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own state."
  on user_state for update
  using ( auth.uid() = user_id );
