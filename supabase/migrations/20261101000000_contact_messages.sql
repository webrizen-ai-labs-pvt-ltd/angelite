-- Messages sent from the public Contact page. Anyone may send one; nobody can read them back through the API.
-- Read them in the Supabase dashboard (Table Editor) or with the service key.

create table public.contact_messages (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users (id) on delete set null,
    name text not null check (char_length(name) between 1 and 100),
    email text not null check (char_length(email) between 3 and 200),
    topic text not null check (topic in ('question', 'feedback', 'bug', 'business', 'other')),
    message text not null check (char_length(message) between 10 and 5000),
    created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

create policy "Anyone can send a message"
    on public.contact_messages for insert to anon, authenticated
    with check (user_id is null or user_id = (select auth.uid()));

grant insert on public.contact_messages to anon, authenticated;
